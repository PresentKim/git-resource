import {useCallback, useEffect, useRef} from 'react'

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
import {useTargetRepository} from '@/hooks/useTargetRepository'
import {useFilterQuery} from '@/hooks/useFilterQuery'
import {usePromise} from '@/hooks/usePromise'
import {generateNoImagesMessage} from '@/utils/randomMessages'
import {RandomMessageLoader} from '@/components/RandomMessageLoader'
import {useDisplaySettings} from '@/stores/settingStore'
import {useRepoStore} from '@/stores/repoStore'
import {cn} from '@/utils'
import {Loader as LoaderIcon} from 'lucide-react'

export default function RepoView() {
  const [filter] = useFilterQuery()
  const [repoFromUrl, setTargetRepository] = useTargetRepository()
  const isLoadRef = usePromise(useGithubDefaultBranch())[0]
  const getDefaultBranch = usePromise(useGithubDefaultBranch())[1]
  const isLoadImagePaths = usePromise(useGithubImageFileTree())[0]
  const getImagePaths = usePromise(useGithubImageFileTree())[1]

  // Get state from repoStore
  const repo = useRepoStore(state => state.repo)
  const imageFiles = useRepoStore(state => state.imageFiles)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const error = useRepoStore(state => state.error)
  const viewerState = useRepoStore(state => state.viewerState)
  const isFiltering = useRepoStore(state => state.isFiltering)
  const setRepo = useRepoStore(state => state.setRepo)
  const setImageFiles = useRepoStore(state => state.setImageFiles)
  const setError = useRepoStore(state => state.setError)
  const setViewerState = useRepoStore(state => state.setViewerState)
  const updateFilteredImages = useRepoStore(state => state.updateFilteredImages)

  // Get display settings in a single call
  const {columnCount, pixelated, gridBackground} = useDisplaySettings()

  // Sync repo from URL to store
  useEffect(() => {
    if (
      repoFromUrl.owner !== repo.owner ||
      repoFromUrl.name !== repo.name ||
      repoFromUrl.ref !== repo.ref
    ) {
      setRepo(repoFromUrl)
    }
  }, [repoFromUrl, repo, setRepo])

  // Update filtered images when filter changes
  useEffect(() => {
    updateFilteredImages(filter)
  }, [filter, updateFilteredImages])

  // Load default branch or image files
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
  }, [
    repo,
    getDefaultBranch,
    getImagePaths,
    setTargetRepository,
    setError,
    setImageFiles,
  ])

  const handleImageClick = useCallback(
    (index: number) => {
      setViewerState({open: true, currentIndex: index})
    },
    [setViewerState],
  )

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

  const itemRenderer = useCallback(
    ({index, item}: RenderData<string>) => (
      <ImageCell key={index} path={item} onClick={getClickHandler(index)} />
    ),
    [getClickHandler],
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
        <FilterToolbar />
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

      {isLoadRef ||
      isLoadImagePaths ||
      isFiltering ||
      (!error && imageFiles === null && repo.owner && repo.name) ? (
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
                    : isLoadImagePaths
                      ? 'Fetching image list'
                      : isFiltering
                        ? 'Filtering images'
                        : 'Loading images'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isLoadRef
                    ? 'Detecting the default branch for this repository...'
                    : isLoadImagePaths
                      ? 'Loading all image files from the repository...'
                      : isFiltering
                        ? 'Applying filters to image list...'
                        : 'Please wait while images are being loaded...'}
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
      ) : !error &&
        imageFiles !== null &&
        (!filteredImageFiles || !filteredImageFiles.length) ? (
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
            open={viewerState.open}
            onOpenChange={open => setViewerState({...viewerState, open})}
            images={filteredImageFiles || []}
            currentIndex={viewerState.currentIndex}
            onIndexChange={index =>
              setViewerState({...viewerState, currentIndex: index})
            }
          />
        </>
      ) : null}
    </section>
  )
}
