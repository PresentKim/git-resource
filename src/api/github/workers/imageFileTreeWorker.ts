import JSZip from 'jszip'
import type {
  WorkerRequestBase,
  ImageFileTreeRequest,
  ImageFileTreeResponse,
  GithubImageFileTree,
} from '../types'
import {BaseGithubWorker} from './baseWorker'

const IMAGE_FILE_EXTENSIONS_REGEX = /\.(png|jpe?g|gif|webp|svg)$/i
const MCMETA_FILE_EXTENSIONS_REGEX = /\.mcmeta$/i

class ImageFileTreeWorker extends BaseGithubWorker<
  ImageFileTreeRequest & WorkerRequestBase,
  GithubImageFileTree
> {
  protected getCacheKey(request: ImageFileTreeRequest): string {
    return `${request.owner}/${request.name}/${request.ref}`
  }

  protected fetchData(
    {owner, name, ref}: ImageFileTreeRequest,
    headers: HeadersInit,
  ): Promise<Response> {
    return fetch(
      `https://api.github.com/repos/${owner}/${name}/git/trees/${ref}?recursive=1`,
      {headers},
    )
  }

  protected async fallbackFetchData({
    owner,
    name,
    ref,
  }: ImageFileTreeRequest): Promise<GithubImageFileTree> {
    /**
     * Remove non-image files from the list, And omit the root folder name.
     * @param files
     * @param zipData
     * @returns Filtered image file list (including .mcmeta files)
     */
    function filterImageFiles(
      files: string[],
      zipData: JSZip,
    ): GithubImageFileTree {
      if (!files.length) {
        return []
      }

      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']

      // Safely filter out directories and unknown entries
      const fileEntries = files.filter(file => {
        const entry = zipData.files[file]
        return entry && !entry.dir
      })

      if (!fileEntries.length) {
        return []
      }

      // Try to detect a common root folder (e.g. "repo-main/")
      const firstPath = fileEntries[0]
      const hasFolder = firstPath.includes('/')
      const rootFolder = hasFolder ? firstPath.split('/')[0] : ''

      return fileEntries
        .filter(file => {
          const lower = file.toLowerCase()
          return (
            imageExtensions.some(ext => lower.endsWith(ext)) ||
            lower.endsWith('.mcmeta')
          )
        })
        .map(file => {
          if (!rootFolder) return file
          const prefix = `${rootFolder}/`
          return file.startsWith(prefix) ? file.slice(prefix.length) : file
        })
    }

    const response = await fetch(
      `/proxy/github/${owner}/${name}/archive/refs/heads/${ref}.zip`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/zip',
        },
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const contentLength = response.headers.get('Content-Length')
    if (!contentLength || !response.body) {
      const blob = await response.blob()
      const zip = new JSZip()
      const zipData = await zip.loadAsync(blob)
      const files = Object.keys(zipData.files)
      return filterImageFiles(files, zipData)
    }

    const chunks: BlobPart[] = []
    const reader = response.body.getReader()
    while (true) {
      const {done, value} = await reader.read()
      if (done) break

      if (value) {
        chunks.push(value)
      }
    }

    const blob = new Blob(chunks)

    const zip = new JSZip()
    const zipData = await zip.loadAsync(blob)
    const files = Object.keys(zipData.files)
    const imageFiles = filterImageFiles(files, zipData)

    return imageFiles
  }

  protected parseResponse(
    response: ImageFileTreeResponse,
  ): GithubImageFileTree {
    return response.tree.reduce((acc, {path, type}) => {
      if (
        type === 'blob' &&
        (IMAGE_FILE_EXTENSIONS_REGEX.test(path) ||
          MCMETA_FILE_EXTENSIONS_REGEX.test(path))
      ) {
        acc.push(path)
      }
      return acc
    }, [] as GithubImageFileTree)
  }
}

const worker = new ImageFileTreeWorker()
self.onmessage = async (
  e: MessageEvent<ImageFileTreeRequest & WorkerRequestBase>,
) => {
  const response = await worker.handleRequest(e.data)
  self.postMessage(response)
}
