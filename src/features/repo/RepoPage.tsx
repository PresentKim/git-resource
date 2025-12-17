import {
  VirtualizedFlexGrid,
  type RenderData,
} from '@/shared/components/VitualizedFlexGrid'
import {ImageCell} from '@/features/repo/image-cell/ImageCell'
import {FilterToolbar} from '@/features/repo/filter/FilterToolbar'
import {FilterInput} from '@/features/repo/filter/FilterInput'
import {Button} from '@/shared/components/ui/button'
import {ImageViewer} from '@/features/repo/viewer/ImageViewer'

import {generateNoImagesMessage} from '@/shared/utils/randomMessages'
import {RandomMessageLoader} from '@/shared/components/RandomMessageLoader'
import {useDisplaySettings} from '@/shared/stores/settingStore'
import {useRepoStore} from '@/shared/stores/repoStore'
import {useRepoSync} from '@/features/repo/useRepoSync'
import {useFilterSync} from '@/features/repo/filter/useFilterSync'
import {useRepoLoading} from '@/features/repo/useRepoLoading'
import {useImageClickHandler} from '@/features/repo/useImageClickHandler'
import {cn} from '@/shared/utils'
import {Loader as LoaderIcon} from 'lucide-react'

export default function RepoPage() {
  const {gridBackground, columnCount, pixelated} = useDisplaySettings()
  const repo = useRepoStore(state => state.repo)

  // Sync repository from URL to store
  useRepoSync()

  // Sync filter changes
  useFilterSync()

  // Load repository data
  const {isLoadRef, isLoadImagePaths} = useRepoLoading()

  // Get state from repoStore
  const imageFiles = useRepoStore(state => state.imageFiles)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const error = useRepoStore(state => state.error)
  const viewerState = useRepoStore(state => state.viewerState)
  const isFiltering = useRepoStore(state => state.isFiltering)
  const setViewerState = useRepoStore(state => state.setViewerState)

  // Image click handlers
  const {getClickHandler} = useImageClickHandler()

  const itemRenderer = ({index, item}: RenderData<string>) => (
    <ImageCell key={index} path={item} onClick={getClickHandler(index)} />
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
