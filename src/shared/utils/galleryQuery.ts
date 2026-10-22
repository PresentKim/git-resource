import type {ChangeKind} from './compareListings'
import type {FileMeta} from './fileMeta'
import {sortImagePaths, type SortMode} from './sortImagePaths'

/** Which changes to show while comparing with another ref */
export type ChangeFilter = 'all' | ChangeKind

export const CHANGE_FILTERS: readonly ChangeFilter[] = [
  'all',
  'added',
  'modified',
  'removed',
]

/** Everything that decides which images the gallery shows, in which order */
export interface GalleryQuery {
  filter: string
  sort: SortMode
  /** Only images that have an identical copy elsewhere, grouped together */
  duplicates: boolean
  /** Used only while comparing */
  changes: ChangeFilter
}

/** A mark on a gallery cell */
export interface CellBadge {
  label: string
  /** Read out and shown on hover */
  title: string
  tone: ChangeKind | 'group-even' | 'group-odd'
}

/**
 * Parse filter string into include and exclude filters
 */
function parseFilters(filter: string): {
  includeFilters: string[]
  excludeFilters: string[]
} {
  const rawFilters = filter.trim().split(/\s+/).filter(Boolean)
  const include: string[] = []
  const exclude: string[] = []

  for (const term of rawFilters) {
    if (term.startsWith('-')) {
      const excludeTerm = term.slice(1).trim()
      if (excludeTerm) {
        exclude.push(excludeTerm)
      }
    } else {
      include.push(term)
    }
  }

  return {includeFilters: include, excludeFilters: exclude}
}

/**
 * Filter image paths based on include and exclude filters
 * Optimized: Pre-compute lowercase filters to avoid repeated toLowerCase() calls
 */
function filterImagePaths(
  paths: string[],
  includeFilters: string[],
  excludeFilters: string[],
): string[] {
  if (includeFilters.length === 0 && excludeFilters.length === 0) {
    return paths
  }

  // Pre-compute lowercase filters once
  const lowerIncludeFilters = includeFilters.map(f => f.toLowerCase())
  const lowerExcludeFilters = excludeFilters.map(f => f.toLowerCase())

  return paths.filter(path => {
    const lowerPath = path.toLowerCase()

    // All include filters must match (AND logic)
    if (lowerIncludeFilters.length > 0) {
      const allIncludeMatch = lowerIncludeFilters.every(term =>
        lowerPath.includes(term),
      )
      if (!allIncludeMatch) {
        return false
      }
    }

    // Path must not match any exclude filter
    if (lowerExcludeFilters.length > 0) {
      const matchesExclude = lowerExcludeFilters.some(term =>
        lowerPath.includes(term),
      )
      if (matchesExclude) {
        return false
      }
    }

    return true
  })
}

/**
 * The hash of every image that shares its content with another image of the
 * list. Computed over the whole list, so a filter still shows an image whose
 * copy it hides.
 */
export function findDuplicates(
  paths: readonly string[],
  getMeta: (path: string) => FileMeta | undefined,
): Map<string, string> {
  const byHash = new Map<string, string[]>()
  for (const path of paths) {
    const hash = getMeta(path)?.hash
    if (!hash) continue
    const group = byHash.get(hash)
    if (group) group.push(path)
    else byHash.set(hash, [path])
  }

  const duplicates = new Map<string, string>()
  for (const [hash, group] of byHash) {
    if (group.length < 2) continue
    for (const path of group) duplicates.set(path, hash)
  }
  return duplicates
}

const CHANGE_BADGES: Record<ChangeKind, Omit<CellBadge, 'tone'>> = {
  added: {label: '+', title: 'Added'},
  modified: {label: '~', title: 'Modified'},
  removed: {label: '−', title: 'Removed'},
}

interface RunGalleryQueryOptions {
  /** Image paths (no .mcmeta files) */
  images: string[]
  query: GalleryQuery
  getMeta: (path: string) => FileMeta | undefined
  /** Set while comparing; images are then the changed ones only */
  changes: ReadonlyMap<string, ChangeKind> | null
}

/**
 * Apply a gallery query: pick the images (changed ones while comparing,
 * duplicates only if asked), filter and sort them, and mark the cells.
 */
export function runGalleryQuery({
  images,
  query,
  getMeta,
  changes,
}: RunGalleryQueryOptions): {
  paths: string[]
  badges: Map<string, CellBadge> | null
} {
  let candidates = images
  let badges: Map<string, CellBadge> | null = null

  if (changes) {
    candidates = images.filter(path => {
      const kind = changes.get(path)
      return kind && (query.changes === 'all' || query.changes === kind)
    })
    badges = new Map()
    for (const path of candidates) {
      const kind = changes.get(path)!
      badges.set(path, {...CHANGE_BADGES[kind], tone: kind})
    }
  }

  const duplicates = query.duplicates ? findDuplicates(images, getMeta) : null
  if (duplicates) {
    candidates = candidates.filter(path => duplicates.has(path))
  }

  const {includeFilters, excludeFilters} = parseFilters(query.filter)
  let paths = sortImagePaths(
    filterImagePaths(candidates, includeFilters, excludeFilters),
    query.sort,
    getMeta,
  )

  if (duplicates) {
    // Keep each group together, placed where its first image sorts, and
    // alternate the badge color so neighbouring groups stay apart
    const groups = new Map<string, string[]>()
    for (const path of paths) {
      const hash = duplicates.get(path)!
      const group = groups.get(hash)
      if (group) group.push(path)
      else groups.set(hash, [path])
    }
    const groupSizes = new Map<string, number>()
    for (const hash of duplicates.values()) {
      groupSizes.set(hash, (groupSizes.get(hash) ?? 0) + 1)
    }

    paths = []
    badges ??= new Map()
    let groupIndex = 0
    for (const [hash, group] of groups) {
      const copies = groupSizes.get(hash) ?? group.length
      const tone = groupIndex % 2 === 0 ? 'group-even' : 'group-odd'
      for (const path of group) {
        paths.push(path)
        // A change badge says more while comparing; keep it
        if (!badges.has(path)) {
          badges.set(path, {
            label: `×${copies}`,
            title: `${copies} identical images`,
            tone,
          })
        }
      }
      groupIndex += 1
    }
  }

  return {paths, badges}
}
