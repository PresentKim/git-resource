import JSZip from 'jszip'
import type {
  WorkerRequestBase,
  ImageFileTreeRequest,
  ImageFileTreeResponse,
  GithubImageFileTree,
} from '../types'
import {encodePathSegments} from '@/shared/utils/github'
import {BaseGithubWorker, FallbackRequiredError} from './baseWorker'

const IMAGE_FILE_EXTENSIONS_REGEX = /\.(png|jpe?g|gif|webp|svg)$/i
const MCMETA_FILE_EXTENSIONS_REGEX = /\.mcmeta$/i

/** Images and their .mcmeta files; the API and zip fallback share this */
function isImageTreePath(path: string): boolean {
  return (
    IMAGE_FILE_EXTENSIONS_REGEX.test(path) ||
    MCMETA_FILE_EXTENSIONS_REGEX.test(path)
  )
}

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
    // Ask codeload for the zip directly: github.com/.../archive/<ref>.zip only
    // redirects there, and codeload rejects cross-origin requests, so the
    // browser blocks the redirected download. zip/<ref> resolves branches
    // (with slashes too), tags and full commit SHAs alike.
    const response = await fetch(
      `/proxy/codeload/${owner}/${name}/zip/${encodePathSegments(ref)}`,
      {headers: {Accept: 'application/zip'}},
    )

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const zipData = await new JSZip().loadAsync(await response.blob())
    const filePaths = Object.values(zipData.files)
      .filter(entry => !entry.dir)
      .map(entry => entry.name)

    // GitHub archives put everything under one root folder (e.g. "repo-main/")
    const rootFolder = filePaths[0]?.includes('/')
      ? `${filePaths[0].split('/')[0]}/`
      : ''

    return filePaths
      .map(path =>
        rootFolder && path.startsWith(rootFolder)
          ? path.slice(rootFolder.length)
          : path,
      )
      .filter(isImageTreePath)
  }

  protected parseResponse(
    response: ImageFileTreeResponse,
  ): GithubImageFileTree {
    // The recursive tree API drops entries beyond its size limit
    if (response.truncated) {
      throw new FallbackRequiredError('GitHub tree response was truncated')
    }

    return response.tree.reduce((acc, {path, type}) => {
      if (type === 'blob' && isImageTreePath(path)) {
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
