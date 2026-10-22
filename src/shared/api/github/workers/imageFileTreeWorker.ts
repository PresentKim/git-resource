import JSZip from 'jszip'
import type {
  WorkerRequestBase,
  ImageFileTreeRequest,
  ImageFileTreeResponse,
  GithubImageFileTree,
} from '../types'
import {encodePathSegments} from '@/shared/utils/github'
import type {FileEntry} from '@/shared/utils/fileMeta'
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

/** Fields of a JSZip entry that are not in its type definitions */
interface ZipEntryData {
  crc32?: number
  uncompressedSize?: number
}

class ImageFileTreeWorker extends BaseGithubWorker<
  ImageFileTreeRequest & WorkerRequestBase,
  GithubImageFileTree
> {
  protected getCacheKey(request: ImageFileTreeRequest): string {
    return `tree:${request.owner}/${request.name}/${request.ref}`
  }

  /** Before sizes and hashes were kept, lists were cached as plain paths */
  private getLegacyCacheKey(request: ImageFileTreeRequest): string {
    return `${request.owner}/${request.name}/${request.ref}`
  }

  async handleRequest(request: ImageFileTreeRequest & WorkerRequestBase) {
    void this.storage.removeCache(this.getLegacyCacheKey(request))
    return super.handleRequest(request)
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
    const files = Object.values(zipData.files).filter(entry => !entry.dir)

    // GitHub archives put everything under one root folder (e.g. "repo-main/")
    const firstPath = files[0]?.name ?? ''
    const rootFolder = firstPath.includes('/')
      ? `${firstPath.split('/')[0]}/`
      : ''

    // The archive has no git hashes, but it stores a CRC-32 and the size of
    // every file, which is enough to tell identical files apart
    const entries: FileEntry[] = []
    for (const file of files) {
      const path =
        rootFolder && file.name.startsWith(rootFolder)
          ? file.name.slice(rootFolder.length)
          : file.name
      if (!isImageTreePath(path)) continue

      const data = (file as unknown as {_data?: ZipEntryData})._data
      const size = data?.uncompressedSize
      const crc32 = data?.crc32
      entries.push({
        path,
        size,
        hash:
          crc32 !== undefined && size !== undefined
            ? `${(crc32 >>> 0).toString(16).padStart(8, '0')}:${size}`
            : undefined,
      })
    }
    return {entries, hashKind: 'crc32'}
  }

  protected parseResponse(
    response: ImageFileTreeResponse,
  ): GithubImageFileTree {
    // The recursive tree API drops entries beyond its size limit
    if (response.truncated) {
      throw new FallbackRequiredError('GitHub tree response was truncated')
    }

    const entries: FileEntry[] = []
    for (const {path, type, sha, size} of response.tree) {
      if (type === 'blob' && isImageTreePath(path)) {
        entries.push({path, size, hash: sha})
      }
    }
    return {entries, hashKind: 'git'}
  }
}

const worker = new ImageFileTreeWorker()
self.onmessage = async (
  e: MessageEvent<ImageFileTreeRequest & WorkerRequestBase>,
) => {
  const response = await worker.handleRequest(e.data)
  self.postMessage(response)
}
