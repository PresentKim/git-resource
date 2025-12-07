import {create} from 'zustand'
import type {GithubRepo} from '@/utils/github'
import type {GithubImageFileTree} from '@/api/github/types'
import {isMcmetaFile} from '@/utils'

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
 * Separate image files and mcmeta files
 */
function separateImageFiles(imageFiles: GithubImageFileTree | null): {
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

interface RepoStore {
  repo: GithubRepo
  imageFiles: GithubImageFileTree | null
  filteredImageFiles: string[] | null
  mcmetaPaths: Set<string>
  error: Error | null
  viewerState: {open: boolean; currentIndex: number}
  isFiltering: boolean

  // Actions
  setRepo: (repo: GithubRepo) => void
  setImageFiles: (files: GithubImageFileTree | null) => void
  updateFilteredImages: (filter: string) => void
  setError: (error: Error | null) => void
  setViewerState: (state: {open: boolean; currentIndex: number}) => void
  resetRepoState: () => void
}

const initialRepo: GithubRepo = {
  owner: '',
  name: '',
  ref: '',
  url: '',
  displayName: '',
}

export const useRepoStore = create<RepoStore>((set, get) => ({
  repo: initialRepo,
  imageFiles: null,
  filteredImageFiles: null,
  mcmetaPaths: new Set<string>(),
  error: null,
  viewerState: {open: false, currentIndex: 0},
  isFiltering: false,

  setRepo: (repo: GithubRepo) => {
    set({repo})
    // Reset related state when repo changes
    get().resetRepoState()
  },

  setImageFiles: (files: GithubImageFileTree | null) => {
    const {imageOnlyFiles, mcmetaPaths} = separateImageFiles(files)

    set({
      imageFiles: files,
      mcmetaPaths,
    })

    // Set initial filtered images (all images, filter will be applied separately)
    if (imageOnlyFiles) {
      set({filteredImageFiles: imageOnlyFiles})
    } else {
      set({filteredImageFiles: null})
    }
  },

  updateFilteredImages: (filter: string) => {
    const {imageFiles} = get()
    if (!imageFiles) {
      // Don't set isFiltering to false if images haven't loaded yet
      // This allows the loading screen to remain visible
      set({filteredImageFiles: null})
      return
    }

    // Set loading state
    set({isFiltering: true})

    // Use requestAnimationFrame to allow UI to update before filtering
    // This ensures the loading state is visible
    requestAnimationFrame(() => {
      const {imageFiles: currentImageFiles} = get()
      if (!currentImageFiles) {
        set({filteredImageFiles: null, isFiltering: false})
        return
      }

      const {imageOnlyFiles} = separateImageFiles(currentImageFiles)
      if (!imageOnlyFiles) {
        set({filteredImageFiles: null, isFiltering: false})
        return
      }

      const {includeFilters, excludeFilters} = parseFilters(filter)
      const filtered = filterImagePaths(
        imageOnlyFiles,
        includeFilters,
        excludeFilters,
      )

      // Use setTimeout to ensure loading state is visible for at least a brief moment
      setTimeout(() => {
        set({filteredImageFiles: filtered, isFiltering: false})
      }, 50)
    })
  },

  setError: (error: Error | null) => {
    set({error})
  },

  setViewerState: (state: {open: boolean; currentIndex: number}) => {
    set({viewerState: state})
  },

  resetRepoState: () => {
    set({
      imageFiles: null,
      filteredImageFiles: null,
      mcmetaPaths: new Set<string>(),
      error: null,
      viewerState: {open: false, currentIndex: 0},
      isFiltering: false,
    })
  },
}))
