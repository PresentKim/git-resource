import type {FileEntry} from '@/shared/utils/fileMeta'

/** A listed file of a local source, with its contents */
export interface LocalFileEntry extends FileEntry {
  blob: Blob
}

export interface ArchiveRequest {
  archive: Blob
}

export type ArchiveResponse =
  | {type: 'progress'; done: number; total: number}
  | {type: 'done'; entries: LocalFileEntry[]}
  | {type: 'error'; message: string}

export interface HashRequest {
  files: Array<{path: string; blob: Blob}>
}

export type HashResponse =
  | {type: 'progress'; done: number; total: number}
  | {type: 'done'; hashes: Array<{path: string; hash: string}>}
  | {type: 'error'; message: string}
