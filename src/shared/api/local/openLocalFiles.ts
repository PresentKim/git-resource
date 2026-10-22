import type {FileMeta, HashKind} from '@/shared/utils/fileMeta'
import type {LocalSource} from '@/shared/utils/imageSource'
import {isImageTreePath} from '@/shared/utils/imageFiles'
import {callLocalWorker} from './callLocalWorker'
import {isArchiveName, type LocalItem} from './readLocalInput'
import type {ArchiveRequest, HashRequest, LocalFileEntry} from './types'
import archiveWorkerUrl from './workers/archiveWorker.ts?worker&url'
import hashWorkerUrl from './workers/hashWorker.ts?worker&url'

/** What is being done while local files open, for a progress display */
export interface LocalProgress {
  label: string
  done: number
  /** Unknown while folders are still being read */
  total: number | null
}

export interface OpenedLocalFiles {
  source: LocalSource
  /** Images and .mcmeta files */
  paths: string[]
  meta: Map<string, FileMeta>
  /** Set when every file has a hash (archives are hashed while unpacked) */
  hashKind: HashKind | null
}

/** "pack.zip", or "pack.zip +2" when more was opened at once */
export function getLocalItemsName(items: readonly {name: string}[]): string {
  if (!items.length) return ''
  return items.length === 1
    ? items[0].name
    : `${items[0].name} +${items.length - 1}`
}

/**
 * List the images of what was opened. A single folder or archive shows its
 * contents as they are; several are shown side by side, each in a folder of
 * its own name.
 */
export async function openLocalItems(
  items: readonly LocalItem[],
  onProgress?: (progress: LocalProgress) => void,
  signal?: AbortSignal,
): Promise<OpenedLocalFiles> {
  if (!items.length) {
    throw new Error(
      'Nothing to open. Choose a folder, a .zip or .jar file, or images.',
    )
  }

  const files = new Map<string, Blob>()
  const meta = new Map<string, FileMeta>()
  const single = items.length === 1

  const add = (path: string, blob: Blob, fileMeta: FileMeta) => {
    files.set(path, blob)
    meta.set(path, fileMeta)
  }

  for (const item of items) {
    const prefix = single ? '' : `${item.name}/`

    if (item.kind === 'directory') {
      for (const {path, file} of item.files) {
        add(`${prefix}${path}`, file, {
          size: file.size,
          modified: file.lastModified,
        })
      }
    } else if (isArchiveName(item.name)) {
      const label = `Unpacking ${item.name}`
      onProgress?.({label, done: 0, total: null})
      const {entries} = await callLocalWorker<
        ArchiveRequest,
        {entries: LocalFileEntry[]}
      >(
        archiveWorkerUrl,
        {archive: item.file},
        (done, total) => onProgress?.({label, done, total}),
        signal,
      ).catch(error => {
        if (signal?.aborted) throw error
        throw new Error(
          `${item.name} could not be unpacked. It may be damaged, or not a zip archive.`,
          {cause: error},
        )
      })
      for (const {path, blob, ...entryMeta} of entries) {
        add(`${prefix}${path}`, blob, entryMeta)
      }
    } else if (isImageTreePath(item.name)) {
      // Loose images sit at the top, without a folder
      add(item.name, item.file, {
        size: item.file.size,
        modified: item.file.lastModified,
      })
    }
  }

  const paths = [...files.keys()].sort()
  const hashed = [...meta.values()].every(value => value.hash !== undefined)
  return {
    source: {
      kind: 'local',
      name: getLocalItemsName(items),
      files,
      urls: new Map(),
    },
    paths,
    meta,
    hashKind: hashed && paths.length ? 'git' : null,
  }
}

/**
 * Git hashes of the local files that have none yet (files of folders, which
 * are listed without being read)
 */
export async function hashLocalFiles(
  source: LocalSource,
  paths: readonly string[],
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Map<string, FileMeta>> {
  const files = paths.flatMap(path => {
    const blob = source.files.get(path)
    return blob ? [{path, blob}] : []
  })
  const {hashes} = await callLocalWorker<
    HashRequest,
    {hashes: Array<{path: string; hash: string}>}
  >(hashWorkerUrl, {files}, onProgress, signal)
  return new Map(hashes.map(({path, hash}) => [path, {hash}]))
}
