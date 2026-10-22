/**
 * What is known about a file besides its path. Every field is optional: each
 * source fills in what it can get without extra requests.
 */
export interface FileMeta {
  /** Size in bytes */
  size?: number
  /** Content hash, comparable only between lists with the same HashKind */
  hash?: string
  /** Last modification time in milliseconds since the epoch */
  modified?: number
}

/**
 * - git: the git blob SHA-1 (the GitHub tree API, or computed from the bytes)
 * - crc32: the CRC-32 a zip archive stores per entry, with the size; good
 *   enough to spot identical files, though not collision-proof like SHA-1
 */
export type HashKind = 'git' | 'crc32'

/** One file of a listing, as workers send it (Maps do not survive JSON) */
export interface FileEntry extends FileMeta {
  path: string
}

export interface FileListing {
  entries: FileEntry[]
  /** How entry hashes were made; null when the listing has none */
  hashKind: HashKind | null
}

/** Split a listing into the path list and the metadata the stores keep */
export function splitFileListing(listing: FileListing): {
  paths: string[]
  meta: Map<string, FileMeta>
} {
  const paths: string[] = []
  const meta = new Map<string, FileMeta>()
  for (const {path, ...fileMeta} of listing.entries) {
    paths.push(path)
    if (
      fileMeta.size !== undefined ||
      fileMeta.hash !== undefined ||
      fileMeta.modified !== undefined
    ) {
      meta.set(path, fileMeta)
    }
  }
  return {paths, meta}
}

/**
 * The git blob SHA-1 of some bytes: the hash git (and the GitHub tree API)
 * gives a file with this content, so hashes made here match GitHub's.
 */
export async function gitBlobHash(bytes: Uint8Array): Promise<string> {
  const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`)
  const data = new Uint8Array(header.byteLength + bytes.byteLength)
  data.set(header)
  data.set(bytes, header.byteLength)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-1', data))
  let hex = ''
  for (const byte of digest) hex += byte.toString(16).padStart(2, '0')
  return hex
}
