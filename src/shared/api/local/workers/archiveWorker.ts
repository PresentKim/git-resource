import JSZip from 'jszip'
import {gitBlobHash} from '@/shared/utils/fileMeta'
import {getMimeType, isImageTreePath} from '@/shared/utils/imageFiles'
import type {ArchiveRequest, ArchiveResponse, LocalFileEntry} from '../types'

const PROGRESS_INTERVAL = 100

function post(message: ArchiveResponse) {
  self.postMessage(message)
}

/**
 * The folder every file of the archive is in, if there is exactly one (as
 * in archives of a folder, e.g. "pack-main/"), so paths can start below it.
 * Looks at all files, not only images: a resource pack keeps pack.mcmeta
 * next to assets/, which must stay part of the paths.
 */
function getCommonRoot(paths: string[]): string {
  const first = paths[0]
  if (!first?.includes('/')) return ''
  const root = `${first.slice(0, first.indexOf('/'))}/`
  return paths.every(path => path.startsWith(root)) ? root : ''
}

/**
 * Unpack the images and .mcmeta files of a .zip (or .jar, which is a zip)
 * with their sizes, dates and git hashes. Runs in a worker because large
 * archives take seconds to inflate.
 */
async function readArchive(archive: Blob): Promise<LocalFileEntry[]> {
  const zip = await new JSZip().loadAsync(await archive.arrayBuffer())
  const files = Object.values(zip.files).filter(file => !file.dir)
  const root = getCommonRoot(files.map(file => file.name))

  const listed = files.filter(file =>
    isImageTreePath(file.name.slice(root.length)),
  )
  const entries: LocalFileEntry[] = []
  for (const [index, file] of listed.entries()) {
    const path = file.name.slice(root.length)
    // JSZip types the bytes loosely; they are always a plain ArrayBuffer
    const bytes = (await file.async('uint8array')) as Uint8Array<ArrayBuffer>
    entries.push({
      path,
      blob: new Blob([bytes], {type: getMimeType(path)}),
      size: bytes.byteLength,
      modified: file.date.getTime(),
      hash: await gitBlobHash(bytes),
    })
    if ((index + 1) % PROGRESS_INTERVAL === 0) {
      post({type: 'progress', done: index + 1, total: listed.length})
    }
  }
  return entries
}

self.onmessage = async (e: MessageEvent<ArchiveRequest>) => {
  try {
    post({type: 'done', entries: await readArchive(e.data.archive)})
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
