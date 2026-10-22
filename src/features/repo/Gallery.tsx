import type {ReactNode} from 'react'
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
import {CompareBar} from '@/features/repo/compare/CompareBar'
import {useGridPositionStore} from '@/features/repo/gridPositionStore'

import {useDisplaySettings} from '@/shared/stores/settingStore'
import {useRepoStore} from '@/shared/stores/repoStore'
import {useFilterSync} from '@/features/repo/filter/useFilterSync'
import {useDuplicateHashes} from '@/features/repo/filter/useDuplicateHashes'
import {useImageClickHandler} from '@/features/repo/useImageClickHandler'
import {cn} from '@/shared/utils'
import {getPageTitle} from '@/shared/utils/routeMeta'
import {Loader as LoaderIcon} from 'lucide-react'
import {parseAsString, useQueryState} from 'nuqs'

/** What the gallery is waiting for, in words */
export interface GalleryLoading {
  title: string
  description: string
  /** 0–100 when the progress is known */
  progress?: number | null
}

/**
 * The tab title of the gallery (and of the open image). React hoists the
 * <title> into <head> and removes it again on leaving the page, which brings
 * back the static title of index.html. Kept apart from the gallery so
 * opening an image re-renders only this.
 */
function GalleryDocumentTitle({label}: {label: string | null}) {
  const [imagePath] = useQueryState('image', parseAsString)

  return <title>{getPageTitle(label, imagePath)}</title>
}

/**
 * Owns the viewer route so that opening/closing the viewer or changing the
 * current image does not re-render the (large) gallery.
 */
function GalleryImageViewer({images}: {images: string[]}) {
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

export function GalleryLoader({loading}: {loading: GalleryLoading}) {
  const {title, description, progress} = loading
  const hasProgress = progress !== undefined && progress !== null

  return (
    <div className="flex flex-1 items-center justify-center rounded-xl border border-border/60 bg-card/40 p-8 sm:p-12">
      <div
        className="flex flex-col items-center gap-4 text-center max-w-md"
        aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <LoaderIcon className="size-8 animate-spin text-accent-foreground" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="w-full max-w-xs">
          <div
            className="h-1.5 w-full rounded-full bg-muted overflow-hidden relative"
            {...(hasProgress && {
              role: 'progressbar',
              'aria-valuemin': 0,
              'aria-valuemax': 100,
              'aria-valuenow': Math.round(progress),
            })}>
            {hasProgress ? (
              <div
                className="h-full bg-accent transition-[width] duration-200"
                style={{width: `${progress}%`}}
              />
            ) : (
              <div className="absolute h-full w-[30%] bg-accent animate-[loading_1.5s_ease-in-out_infinite]" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface GalleryProps {
  /** Names the source in the tab title; null for the plain app title */
  titleLabel: string | null
  /** Set while the source is still loading its file list */
  loading: GalleryLoading | null
  /** Shown instead of the gallery when the source failed to load */
  error?: ReactNode
  /** Shown above the gallery, e.g. a problem that leaves it usable */
  notice?: ReactNode
}

/**
 * The image gallery of the source in the repo store: the toolbar, the grid
 * and the viewer. Pages load a source into the store and render this.
 */
export function Gallery({titleLabel, loading, error, notice}: GalleryProps) {
  const {columnCount, pixelated, animationEnabled} = useDisplaySettings()
  const source = useRepoStore(state => state.source)

  // Sync filter changes
  useFilterSync()
  const hashing = useDuplicateHashes()

  // Get state from repoStore
  const imageFiles = useRepoStore(state => state.imageFiles)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const cellBadges = useRepoStore(state => state.cellBadges)
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
      source={source}
      badge={cellBadges?.get(item)}
      mcmetaPaths={mcmetaPaths}
      animationEnabled={animationEnabled}
      onSelect={handleImageClick}
    />
  )

  const shownLoading: GalleryLoading | null =
    loading ??
    hashing.loading ??
    (isFiltering
      ? {
          title: 'Filtering images',
          description: 'Applying filters to image list...',
        }
      : null)

  return (
    <section
      aria-label={titleLabel ? `Images of ${titleLabel}` : 'Images'}
      className={cn(
        'flex w-full flex-col gap-3 sm:gap-4 bg-background px-1 py-2 sm:px-2',
      )}>
      <GalleryDocumentTitle label={titleLabel} />
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
            // On phones the toolbar is a lot of the screen, so it leaves with
            // the header while scrolling down and returns on scrolling up. It
            // stays while something in it has focus (the on-screen keyboard
            // would otherwise scroll it away mid-typing).
            'max-sm:in-data-[header=hidden]:[&:not(:focus-within)]:-translate-y-[calc(100%+var(--header-height))]',
            'bg-background',
          )}>
          {/* The filter sits beside the toolbar only from xl; below that the
              toolbar needs the full width to stay on one row */}
          <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-2 shadow-sm xl:flex-row xl:items-center xl:gap-3">
            <div className="flex-1 xl:order-2">
              <FilterInput />
            </div>
            <FilterToolbar />
          </div>
          <div className="mt-2 empty:hidden">
            <CompareBar />
          </div>
        </div>
      )}

      {error}
      {!error && notice}
      {!error && hashing.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          Could not compare the file contents: {hashing.error}
        </p>
      )}

      {!error && shownLoading ? (
        <GalleryLoader loading={shownLoading} />
      ) : !error &&
        imageFiles !== null &&
        (!filteredImageFiles || !filteredImageFiles.length) ? (
        <RepoEmptyState />
      ) : !error && filteredImageFiles && filteredImageFiles.length > 0 ? (
        <>
          {/* Not a live region: cells mount and unmount while scrolling, and
              the image count in the toolbar already reports filter results */}
          <div role="region" aria-label="Image gallery">
            <VirtualizedFlexGrid
              items={filteredImageFiles}
              columnCount={columnCount}
              gap={8}
              render={itemRenderer}
              onFirstVisibleIndexChange={setFirstVisibleIndex}
              className={pixelated ? 'pixelated' : ''}
            />
          </div>
          <GalleryImageViewer images={filteredImageFiles} />
        </>
      ) : null}
    </section>
  )
}
