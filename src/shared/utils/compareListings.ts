import type {FileListing, FileMeta} from './fileMeta'
import {isMcmetaFile} from './mcmeta'

export type ChangeKind = 'added' | 'modified' | 'removed'

export const CHANGE_KINDS: readonly ChangeKind[] = [
  'added',
  'modified',
  'removed',
]

export interface ListingComparison {
  /** Every path that differs, .mcmeta files included */
  changes: Map<string, ChangeKind>
  /** Metadata of the changed files in the base (removed and modified ones) */
  baseMeta: Map<string, FileMeta>
  /** Changed images per kind (without .mcmeta files) */
  counts: Record<ChangeKind, number>
}

/** The two listings hash their files differently, so changes are unknown */
export class IncomparableListingsError extends Error {}

/**
 * What changed from `base` to `current`: files only in current are added,
 * files only in base removed, and files in both with another hash modified.
 * Hashes only say anything when both listings made them the same way.
 */
export function compareListings(
  current: FileListing,
  base: FileListing,
): ListingComparison {
  if (!current.hashKind || current.hashKind !== base.hashKind) {
    throw new IncomparableListingsError(
      'These versions cannot be compared: one of them had to be listed from its zip archive (the GitHub API refused or cut short its file list), which identifies files differently. Try again later, or add a token in the settings.',
    )
  }

  const baseByPath = new Map(base.entries.map(entry => [entry.path, entry]))
  const changes = new Map<string, ChangeKind>()
  const baseMeta = new Map<string, FileMeta>()
  const counts: Record<ChangeKind, number> = {added: 0, modified: 0, removed: 0}

  const record = (path: string, kind: ChangeKind) => {
    changes.set(path, kind)
    if (!isMcmetaFile(path)) counts[kind] += 1
  }

  for (const entry of current.entries) {
    const before = baseByPath.get(entry.path)
    if (!before) {
      record(entry.path, 'added')
      continue
    }
    if (before.hash !== entry.hash) {
      record(entry.path, 'modified')
      const {path, ...meta} = before
      baseMeta.set(path, meta)
    }
    baseByPath.delete(entry.path)
  }
  // What is left was only in the base
  for (const {path, ...meta} of baseByPath.values()) {
    record(path, 'removed')
    baseMeta.set(path, meta)
  }

  return {changes, baseMeta, counts}
}
