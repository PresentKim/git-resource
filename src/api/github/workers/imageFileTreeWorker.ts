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
