import {memo, useState} from 'react'
import {Button} from '@/shared/components/ui/button'
import {Camera as ScreenshotIcon} from 'lucide-react'
import {useImageCount} from '@/features/repo/filter/useImageCount'
import {useGridPositionStore} from '@/features/repo/gridPositionStore'
import {DownloadButton} from '@/features/repo/download/DownloadButton'
import {DensityControl} from '@/features/repo/filter/DensityControl'
import {FolderBrowser} from '@/features/repo/filter/FolderBrowser'
import {SortControl} from '@/features/repo/filter/SortControl'
import {SpriteDownloadDialog} from '@/features/repo/download/SpriteDownloadDialog'

interface ImageCountBadgeProps {
  filteredCount: number
  totalCount: number
  /** Index of the first image at the top of the screen; hidden at the top */
  firstVisibleIndex: number
}

const ImageCountBadge = memo(
  function ImageCountBadge({
    filteredCount,
    totalCount,
    firstVisibleIndex,
  }: ImageCountBadgeProps) {
    return (
      <span className="whitespace-nowrap rounded-full bg-background/70 px-2 py-1">
        Showing{' '}
        <span className="font-semibold text-accent-foreground">
          {filteredCount.toLocaleString()}
        </span>
        {' of '}
        {totalCount.toLocaleString()} images
        {firstVisibleIndex > 0 && (
          <span
            className="text-muted-foreground"
            title="First image at the top of the screen">
            {' · '}from #{(firstVisibleIndex + 1).toLocaleString()}
          </span>
        )}
      </span>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.filteredCount === nextProps.filteredCount &&
      prevProps.totalCount === nextProps.totalCount &&
      prevProps.firstVisibleIndex === nextProps.firstVisibleIndex
    )
  },
)

const ScreenshotButton = memo(function ScreenshotButton() {
  const {filteredCount} = useImageCount()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button
        aria-label="Take a screenshot of the filtered images"
        title="Screenshot"
        disabled={!filteredCount}
        onClick={() => setDialogOpen(true)}
        size="sm"
        variant="outline"
        className="text-xs font-semibold flex items-center gap-1">
        <ScreenshotIcon className="size-4" />
        <span className="hidden sm:inline">SCREENSHOT</span>
      </Button>
      <SpriteDownloadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
})

export const FilterToolbar = memo(function FilterToolbar() {
  const {filteredCount, totalCount} = useImageCount()
  const firstVisibleIndex = useGridPositionStore(
    state => state.firstVisibleIndex,
  )

  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:order-1 sm:mt-0 sm:flex-1 sm:justify-start xl:flex-none">
      <ImageCountBadge
        filteredCount={filteredCount}
        totalCount={totalCount}
        firstVisibleIndex={firstVisibleIndex}
      />
      <div className="flex flex-wrap items-center gap-2">
        <FolderBrowser />
        <SortControl />
        <DensityControl />
        <ScreenshotButton />
        <DownloadButton />
      </div>
    </div>
  )
})
