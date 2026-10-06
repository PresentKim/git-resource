import {
  VirtualizedFlexGrid,
  type RenderData,
} from '@/shared/components/VitualizedFlexGrid'
import {ImageCell} from '@/features/repo/image-cell/ImageCell'
import {FilterToolbar} from '@/features/repo/filter/FilterToolbar'
import {FilterInput} from '@/features/repo/filter/FilterInput'
import {ImageViewer} from '@/features/repo/viewer/ImageViewer'
import {useViewerRoute} from '@/features/repo/viewer/viewerRoute'
import {RepoEmptyState} from '@/features/repo/RepoEmptyState'
import {RepoError} from '@/features/repo/RepoError'
import {useGridPositionStore} from '@/features/repo/gridPositionStore'

import {useDisplaySettings} from '@/shared/stores/settingStore'
import {useRepoStore} from '@/shared/stores/repoStore'
import {useFilterSync} from '@/features/repo/filter/useFilterSync'
import {useRepoLoading} from '@/features/repo/useRepoLoading'
import {useImageClickHandler} from '@/features/repo/useImageClickHandler'
import {cn} from '@/shared/utils'
import {Loader as LoaderIcon} from 'lucide-react'

/**
 * Owns the viewer route so that opening/closing the viewer or changing the
 * current image does not re-render the (large) gallery.
 */
function RepoImageViewer({images}: {images: string[]}) {
  const {open, currentIndex, goTo, close} = useViewerRoute(images)

  return (
    <ImageViewer
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) close()
      }}
      images={images}
      currentIndex={currentIndex}
      onIndexChange={goTo}
    />
  )
}

export default function RepoPage() {
  const {gridBackground, columnCount, pixelated, animationEnabled} =
    useDisplaySettings()
  const repo = useRepoStore(state => state.repo)

  // Sync filter changes
  useFilterSync()

  // Load repository data
  const {isLoadRef, isLoadImagePaths, retry} = useRepoLoading()

  // Get state from repoStore
  const imageFiles = useRepoStore(state => state.imageFiles)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const error = useRepoStore(state => state.error)
  const mcmetaPaths = useRepoStore(state => state.mcmetaPaths)
  const isFiltering = useRepoStore(state => state.isFiltering)
  const setFirstVisibleIndex = useGridPositionStore(
    state => state.setFirstVisibleIndex,
  )

  // Image click handler (stable, shared by all cells)
  const {handleImageClick} = useImageClickHandler()

  const itemRenderer = ({index, item}: RenderData<string>) => (
    <ImageCell
      key={index}
      index={index}
      path={item}
      repo={repo}
      mcmetaPaths={mcmetaPaths}
      animationEnabled={animationEnabled}
      onSelect={handleImageClick}
    />
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
      {!error && (
        // A full-width band that holds the toolbar card. It is opaque, so when
        // it sticks, images scroll away cleanly under a straight edge across
        // the whole screen (the same way they do under the header) instead of
        // showing around a card-sized patch. The negative margins cancel the
        // section's padding so the band reaches the screen edges and takes no
        // extra room in the layout; its own padding is the gap around the card.
        <div
          className={cn(
            'sticky top-(--header-height) z-40 -mx-1 -mt-2 -mb-2 px-1 pt-2 pb-2 sm:-mx-2 sm:px-2',
            // Moves with the header using the same transform transition. With
            // the header hidden it slides up by the header's height, leaving
            // the band's top padding as the gap above the card.
            'transition-transform duration-200 ease-out in-data-[header=hidden]:-translate-y-(--header-height)',
            gridBackground === 'white'
              ? 'bg-white'
              : gridBackground === 'black'
                ? 'bg-black'
                : 'bg-background',
          )}>
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:gap-3">
            <div className="flex-1 sm:order-2">
              <FilterInput />
            </div>
            <FilterToolbar />
          </div>
        </div>
      )}

      {error && <RepoError error={error} onRetry={retry} />}

      {isLoadRef ||
      isLoadImagePaths ||
      isFiltering ||
      (!error && imageFiles === null && repo.owner && repo.name) ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border/60 bg-card/40 p-8 sm:p-12">
          <div
            className="flex flex-col items-center gap-4 text-center max-w-md"
            aria-live="polite">
            <div className="flex flex-col items-center gap-3">
              <LoaderIcon className="size-8 animate-spin text-accent-foreground" />
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
        <RepoEmptyState />
      ) : !error && filteredImageFiles && filteredImageFiles.length > 0 ? (
        <>
          <div role="region" aria-label="Image gallery" aria-live="polite">
            <VirtualizedFlexGrid
              items={filteredImageFiles}
              columnCount={columnCount}
              gap={8}
              render={itemRenderer}
              onFirstVisibleIndexChange={setFirstVisibleIndex}
              className={pixelated ? 'pixelated' : ''}
            />
          </div>
          <RepoImageViewer images={filteredImageFiles} />
        </>
      ) : null}
    </section>
  )
}
