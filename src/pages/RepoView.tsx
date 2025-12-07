import {useCallback, useEffect, useMemo, useState, useRef} from 'react'

import {
  VirtualizedFlexGrid,
  type RenderData,
} from '@/components/VitualizedFlexGrid'
import {ImageCell} from '@/components/ImageCell'
import {FilterToolbar} from '@/components/FilterToolbar'
import {FilterInput} from '@/components/FilterInput'
import {Button} from '@/components/ui/button'
import {ImageViewer} from '@/components/ImageViewer'

import {useGithubDefaultBranch} from '@/api/github/hooks/useGithubDefaultBranch'
import {useGithubImageFileTree} from '@/api/github/hooks/useGithubImageFileTree'
import type {GithubImageFileTree} from '@/api/github/types'
import {useTargetRepository} from '@/hooks/useTargetRepository'
import {useFilterQuery} from '@/hooks/useFilterQuery'
import {usePromise} from '@/hooks/usePromise'
import {generateNoImagesMessage} from '@/utils/randomMessages'
import {RandomMessageLoader} from '@/components/RandomMessageLoader'
import {useSettingStore} from '@/stores/settingStore'
import {isMcmetaFile, cn} from '@/utils'
import {Loader as LoaderIcon} from 'lucide-react'

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

export default function RepoView() {
  const [filter] = useFilterQuery()
  const [repo, setTargetRepository] = useTargetRepository()
  const [isLoadRef, getDefaultBranch] = usePromise(useGithubDefaultBranch())
  const [isLoadImagePaths, getImagePaths] = usePromise(useGithubImageFileTree())
  const [imageFiles, setImageFiles] = useState<GithubImageFileTree | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const columnCount = useSettingStore(state => state.filledColumnCount)
  const pixelated = useSettingStore(state => state.pixelated)
  const animationEnabled = useSettingStore(state => state.animationEnabled)
  const gridBackground = useSettingStore(state => state.gridBackground)

  // Separate image files and mcmeta files
  const {imageOnlyFiles, mcmetaPaths} = useMemo(
    () => separateImageFiles(imageFiles),
    [imageFiles],
  )

  // Parse filters
  const {includeFilters, excludeFilters} = useMemo(
    () => parseFilters(filter),
    [filter],
  )

  useEffect(() => {
    if (!repo.ref) {
      getDefaultBranch(repo)
        .then(defaultBranch => {
          setError(null)
          setTargetRepository(repo.owner, repo.name, defaultBranch)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    } else {
      getImagePaths(repo)
        .then(imageFileTree => {
          setError(null)
          setImageFiles(imageFileTree)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    }
  }, [repo, getDefaultBranch, getImagePaths, setTargetRepository])

  // Filter image files
  const filteredImageFiles = useMemo(() => {
    if (!imageOnlyFiles) return null
    return filterImagePaths(imageOnlyFiles, includeFilters, excludeFilters)
  }, [imageOnlyFiles, includeFilters, excludeFilters])

  const handleImageClick = useCallback((index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }, [])

  // Create stable click handlers map to avoid recreating functions
  const clickHandlersRef = useRef<Map<number, () => void>>(new Map())

  const getClickHandler = useCallback(
    (index: number) => {
      if (!clickHandlersRef.current.has(index)) {
        clickHandlersRef.current.set(index, () => handleImageClick(index))
      }
      return clickHandlersRef.current.get(index)!
    },
    [handleImageClick],
  )

  // Memoize repo to ensure stable reference
  // useTargetRepository already memoizes, but we ensure it's stable here too
  const stableRepo = useMemo(() => repo, [repo])

  const itemRenderer = useCallback(
    ({index, item}: RenderData<string>) => (
      <ImageCell
        key={index}
        repo={stableRepo}
        path={item}
        onClick={getClickHandler(index)}
        mcmetaPaths={mcmetaPaths}
        animationEnabled={animationEnabled}
      />
    ),
    [stableRepo, getClickHandler, mcmetaPaths, animationEnabled],
  )

  return (
    <section
      aria-label="Repository image viewer"
      className={cn(
        'flex w-full flex-col gap-3 sm:gap-4 px-1 py-2 sm:px-2',
        gridBackground === 'auto' && 'bg-background',
        gridBackground === 'white' && 'bg-white',
        gridBackground === 'black' && 'bg-black',
        gridBackground === 'transparent' && 'bg-transparent-grid',
      )}>
      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:gap-3">
        <div className="flex-1 sm:order-2">
          <FilterInput />
        </div>
        <FilterToolbar
          repo={repo}
          filteredImageFiles={filteredImageFiles}
          imageFiles={imageFiles}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive-foreground">
          <p className="text-base font-semibold">
            Something went wrong while loading images.
          </p>
          <p className="max-w-xl text-xs text-muted-foreground">
            {error.message}
          </p>
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            {error.message.includes('403') ? (
              <>
                <span>· You have hit the GitHub API rate limit.</span>
                <span>
                  · Please wait a moment and try again, or add a GitHub Personal
                  Access Token in settings.
                </span>
              </>
            ) : error.message.includes('404') ? (
              <>
                <span>
                  · Check that the repository URL is valid and public.
                </span>
                <span>· The repository may not exist or may be private.</span>
              </>
            ) : (
              <>
                <span>
                  · Check that the repository URL is valid and public.
                </span>
                <span>· You may have hit the GitHub API rate limit.</span>
              </>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-1">
            Try again
          </Button>
        </div>
      )}

      {isLoadRef || isLoadImagePaths ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border/60 bg-card/40 p-8 sm:p-12">
          <div
            className="flex flex-col items-center gap-4 text-center max-w-md"
            aria-live="polite">
            <div className="flex flex-col items-center gap-3">
              <LoaderIcon className="size-8 animate-spin text-accent" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {isLoadRef
                    ? 'Fetching default branch'
                    : 'Fetching image list'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isLoadRef
                    ? 'Detecting the default branch for this repository...'
                    : 'Loading all image files from the repository...'}
                </p>
              </div>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden relative">
                <div className="absolute h-full w-[30%] bg-accent animate-[loading_1.5s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>
      ) : !error && (!filteredImageFiles || !filteredImageFiles.length) ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-center">
          <RandomMessageLoader provider={generateNoImagesMessage} />
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>No images were found for this repository and filter.</p>
            <ul className="space-y-1 text-left">
              <li>· Make sure the repo contains PNG/JPEG/GIF/SVG images.</li>
              <li>· Check that the filter does not exclude everything.</li>
            </ul>
          </div>
        </div>
      ) : !error && filteredImageFiles && filteredImageFiles.length > 0 ? (
        <>
          <div role="region" aria-label="Image gallery" aria-live="polite">
            <VirtualizedFlexGrid
              items={filteredImageFiles}
              columnCount={columnCount}
              gap={8}
              render={itemRenderer}
              className={pixelated ? 'pixelated' : ''}
            />
          </div>
          <ImageViewer
            open={viewerOpen}
            onOpenChange={setViewerOpen}
            images={filteredImageFiles}
            currentIndex={viewerIndex}
            repo={repo}
            onIndexChange={setViewerIndex}
            mcmetaPaths={mcmetaPaths}
          />
        </>
      ) : null}
    </section>
  )
}
