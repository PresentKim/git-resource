import JSZip from 'jszip'
import type {
  WorkerRequestBase,
  ImageFileTreeRequest,
  ImageFileTreeResponse,
  GithubImageFileTree,
} from '../types'
import {BaseGithubWorker} from './baseWorker'

const IMAGE_FILE_EXTENSIONS_REGEX = /\.(png|jpe?g|gif|webp|svg)$/i

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
     * @returns Filtered image file list
     */
    function filterImageFiles(
      files: string[],
      zipData: JSZip,
    ): GithubImageFileTree {
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
      const rootFolder = files[0].split('/')[0] // 예: 'repo-main'

      return files
        .filter(
          file =>
            !zipData.files[file].dir && // Not a directory
            imageExtensions.some(ext => file.toLowerCase().endsWith(ext)), // Image file
        )
        .map(file => file.replace(`${rootFolder}/`, '')) // Remove root folder
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

    const chunks: Uint8Array[] = []
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
      if (type === 'blob' && IMAGE_FILE_EXTENSIONS_REGEX.test(path)) {
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
