import {create} from 'zustand'
import type {GithubRepo} from '@/shared/utils/github'
import {isMcmetaFile} from '@/shared/utils'
import type {FileMeta, HashKind} from '@/shared/utils/fileMeta'
import type {ListingComparison} from '@/shared/utils/compareListings'
import {
  runGalleryQuery,
  type CellBadge,
  type GalleryQuery,
} from '@/shared/utils/galleryQuery'
import {
  EMPTY_SOURCE,
  disposeImageSource,
  type ImageSource,
} from '@/shared/utils/imageSource'
import {DEFAULT_SORT_MODE} from '@/shared/utils/sortImagePaths'

/** A comparison of the open ref with another one */
export interface ActiveComparison extends ListingComparison {
  /** The other ref */
  baseRef: string
}

/**
 * Separate image files and mcmeta files
 */
function separateImageFiles(imageFiles: string[] | null): {
  imageOnlyFiles: string[] | null
  mcmetaPaths: Set<string>
} {
  if (!imageFiles) {
    return {imageOnlyFiles: null, mcmetaPaths: new Set<string>()}
  }

  const mcmeta = new Set<string>()
  const images: string[] = []

  for (const path of imageFiles) {
    if (isMcmetaFile(path)) {
      mcmeta.add(path)
    } else {
      images.push(path)
    }
  }

  return {imageOnlyFiles: images, mcmetaPaths: mcmeta}
}

/** Which metadata fields any file has, to offer only the sorts that work */
function getMetaFields(meta: ReadonlyMap<string, FileMeta>) {
  const fields = new Set<keyof FileMeta>()
  for (const value of meta.values()) {
    if (value.size !== undefined) fields.add('size')
    if (value.hash !== undefined) fields.add('hash')
    if (value.modified !== undefined) fields.add('modified')
    if (fields.size === 3) break
  }
  return fields
}

const DEFAULT_QUERY: GalleryQuery = {
  filter: '',
  sort: DEFAULT_SORT_MODE,
  duplicates: false,
  changes: 'all',
}

const EMPTY_META: ReadonlyMap<string, FileMeta> = new Map()

interface RepoStore {
  /** Where the images come from */
  source: ImageSource
  imageFiles: string[] | null
  /** Sizes, hashes and dates of the files, as far as the source knows them */
  fileMeta: ReadonlyMap<string, FileMeta>
  /** How the hashes in fileMeta were made */
  hashKind: HashKind | null
  /** Metadata fields that at least one file has */
  metaFields: ReadonlySet<keyof FileMeta>
  comparison: ActiveComparison | null
  filteredImageFiles: string[] | null
  /** Marks for the cells of the filtered images, if the query adds any */
  cellBadges: ReadonlyMap<string, CellBadge> | null
  filterCache: Map<
    string,
    {paths: string[]; badges: ReadonlyMap<string, CellBadge> | null}
  >
  mcmetaPaths: Set<string>
  /** Number of images excluding .mcmeta files, computed once per file list */
  totalImageCount: number
  error: Error | null
  isFiltering: boolean

  // Actions
  /** Open a GitHub repository; does nothing for the repository already open */
  setRepo: (repo: GithubRepo) => void
  /** Open another source, clearing everything loaded for the previous one */
  setSource: (source: ImageSource) => void
  setImageFiles: (
    files: string[] | null,
    meta?: ReadonlyMap<string, FileMeta>,
    hashKind?: HashKind | null,
  ) => void
  /** Add metadata found later (hashes computed on demand) */
  mergeFileMeta: (
    meta: ReadonlyMap<string, FileMeta>,
    hashKind?: HashKind | null,
  ) => void
  setComparison: (comparison: ActiveComparison | null) => void
  updateFilteredImages: (query?: Partial<GalleryQuery>) => void
  setError: (error: Error | null) => void
  resetRepoState: () => void
}

/**
 * Incremented on every filter request and reset, so a filter pass scheduled
 * earlier cannot overwrite the result of a newer request when it runs later
 */
let filterRequestId = 0

/** The paths only the compared ref has, which the gallery shows too */
function getRemovedImages(comparison: ActiveComparison | null): string[] {
  if (!comparison) return []
  const removed: string[] = []
  for (const [path, kind] of comparison.changes) {
    if (kind === 'removed' && !isMcmetaFile(path)) removed.push(path)
  }
  return removed
}

/** The source with its comparison overlay, so removed images still load */
function withComparison(
  source: ImageSource,
  comparison: ActiveComparison | null,
): ImageSource {
  if (source.kind !== 'github') return source
  if (!comparison) {
    if (!source.comparison) return source
    return {kind: 'github', repo: source.repo}
  }

  const removed = new Set<string>()
  for (const [path, kind] of comparison.changes) {
    if (kind === 'removed') removed.add(path)
  }
  return {
    kind: 'github',
    repo: source.repo,
    comparison: {
      repo: {...source.repo, ref: comparison.baseRef},
      removed,
    },
  }
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  source: EMPTY_SOURCE,
  imageFiles: null,
  fileMeta: EMPTY_META,
  hashKind: null,
  metaFields: new Set(),
  comparison: null,
  filteredImageFiles: null,
  cellBadges: null,
  filterCache: new Map(),
  mcmetaPaths: new Set<string>(),
  totalImageCount: 0,
  error: null,
  isFiltering: false,

  setRepo: (repo: GithubRepo) => {
    const {source} = get()
    if (source.kind === 'github' && source.repo === repo) return
    get().setSource({kind: 'github', repo})
  },

  setSource: (source: ImageSource) => {
    const previous = get().source
    if (previous === source) return
    disposeImageSource(previous)
    set({source})
    // Reset related state when the source changes
    get().resetRepoState()
  },

  setImageFiles: (files, meta = EMPTY_META, hashKind = null) => {
    const {imageOnlyFiles, mcmetaPaths} = separateImageFiles(files)

    set({
      imageFiles: files,
      fileMeta: meta,
      hashKind,
      metaFields: getMetaFields(meta),
      mcmetaPaths,
      totalImageCount: imageOnlyFiles?.length ?? 0,
      filterCache: new Map(),
      cellBadges: null,
    })

    // Set initial filtered images (all images, filter will be applied separately)
    if (imageOnlyFiles) {
      set({filteredImageFiles: imageOnlyFiles})
    } else {
      set({filteredImageFiles: null})
    }
  },

  mergeFileMeta: (meta, hashKind) => {
    const merged = new Map(get().fileMeta)
    for (const [path, value] of meta) {
      merged.set(path, {...merged.get(path), ...value})
    }
    set({
      fileMeta: merged,
      hashKind: hashKind === undefined ? get().hashKind : hashKind,
      metaFields: getMetaFields(merged),
      filterCache: new Map(),
    })
  },

  setComparison: comparison => {
    set({
      comparison,
      source: withComparison(get().source, comparison),
      filterCache: new Map(),
    })
  },

  updateFilteredImages: (partialQuery = {}) => {
    const query: GalleryQuery = {...DEFAULT_QUERY, ...partialQuery}
    const requestId = ++filterRequestId
    const {imageFiles, filterCache, comparison} = get()
    if (!imageFiles) {
      // Don't set isFiltering to false if images haven't loaded yet
      // This allows the loading screen to remain visible
      set({filteredImageFiles: null, cellBadges: null})
      return
    }

    const cacheKey = [
      query.sort,
      query.duplicates,
      comparison ? query.changes : '',
      query.filter.toLowerCase(),
    ].join('|')
    const cached = filterCache.get(cacheKey)
    if (cached) {
      set({
        filteredImageFiles: cached.paths,
        cellBadges: cached.badges,
        isFiltering: false,
      })
      return
    }

    // Set loading state
    set({isFiltering: true})

    // Use requestAnimationFrame to allow UI to update before filtering
    // This ensures the loading state is visible
    requestAnimationFrame(() => {
      if (requestId !== filterRequestId) return

      const {
        imageFiles: currentImageFiles,
        fileMeta,
        comparison: currentComparison,
      } = get()
      if (!currentImageFiles) {
        set({filteredImageFiles: null, cellBadges: null, isFiltering: false})
        return
      }

      const {imageOnlyFiles} = separateImageFiles(currentImageFiles)
      if (!imageOnlyFiles) {
        set({filteredImageFiles: null, cellBadges: null, isFiltering: false})
        return
      }

      const removedMeta = currentComparison?.removedMeta
      const {paths, badges} = runGalleryQuery({
        images: currentComparison
          ? [...imageOnlyFiles, ...getRemovedImages(currentComparison)]
          : imageOnlyFiles,
        query,
        getMeta: removedMeta
          ? path => fileMeta.get(path) ?? removedMeta.get(path)
          : path => fileMeta.get(path),
        changes: currentComparison?.changes ?? null,
      })

      const {filterCache: currentCache} = get()
      const nextCache = new Map(currentCache)
      const MAX_CACHE_ENTRIES = 50
      if (nextCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = nextCache.keys().next().value
        if (oldestKey) nextCache.delete(oldestKey)
      }
      nextCache.set(cacheKey, {paths, badges})
      set({
        filteredImageFiles: paths,
        cellBadges: badges,
        isFiltering: false,
        filterCache: nextCache,
      })
    })
  },

  setError: (error: Error | null) => {
    set({error})
  },

  resetRepoState: () => {
    filterRequestId++
    set({
      imageFiles: null,
      fileMeta: EMPTY_META,
      hashKind: null,
      metaFields: new Set(),
      comparison: null,
      filteredImageFiles: null,
      cellBadges: null,
      filterCache: new Map(),
      mcmetaPaths: new Set<string>(),
      totalImageCount: 0,
      error: null,
      isFiltering: false,
    })
  },
}))

/** The open GitHub repository, or null for other sources */
export function useGithubRepo(): GithubRepo | null {
  return useRepoStore(state =>
    state.source.kind === 'github' ? state.source.repo : null,
  )
}
