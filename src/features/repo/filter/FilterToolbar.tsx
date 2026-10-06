import {memo, useState} from 'react'
import {Button} from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {
  Download as DownloadIcon,
  Loader as LoaderIcon,
  ChevronDown,
  Grid3x3 as SpriteIcon,
} from 'lucide-react'
import {useRepoStore} from '@/shared/stores/repoStore'
import {useImageCount} from '@/features/repo/filter/useImageCount'
import {useGridPositionStore} from '@/features/repo/gridPositionStore'
import {useImageDownload} from '@/features/repo/download/useImageDownload'
import {DownloadNotice} from '@/features/repo/download/DownloadNotice'
import {LARGE_DOWNLOAD_THRESHOLD} from '@/features/repo/download/utils/downloadImagesAsZip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {DensityControl} from '@/features/repo/filter/DensityControl'
import {SpriteDownloadDialog} from '@/features/repo/download/SpriteDownloadDialog'
import type {FlattenMode} from '@/shared/utils'
import {cn} from '@/shared/utils'

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

const flattenModeLabels: Record<FlattenMode, string> = {
  original: 'Original paths',
  'last-level': 'Last level only',
  flat: 'Flat (filename only)',
}

const DownloadButton = memo(function DownloadButton() {
  const repo = useRepoStore(state => state.repo)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const {filteredCount} = useImageCount()
  const [flattenMode, setFlattenMode] = useState<FlattenMode>('original')
  const [popoverOpen, setPopoverOpen] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)

  const {
    isDownloading,
    downloadProgress,
    handleDownload,
    outcome,
    dismissOutcome,
  } = useImageDownload({
    repo,
    imagePaths: filteredImageFiles || [],
    flattenMode,
  })

  const handleDownloadClick = () => {
    setPopoverOpen(false)
    if (filteredCount > LARGE_DOWNLOAD_THRESHOLD) {
      setConfirmOpen(true)
    } else {
      handleDownload()
    }
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <div className="flex gap-1">
          <Button
            aria-label="Download all filtered images as ZIP"
            disabled={isDownloading || !filteredCount}
            onClick={handleDownloadClick}
            size="sm"
            variant="outline"
            className="text-xs font-semibold flex flex-col items-center gap-0.5 min-w-[160px]">
            {isDownloading ? (
              <>
                <div className="flex items-center gap-1">
                  <LoaderIcon className="size-4 animate-spin" />
                  <span>
                    {downloadProgress !== null
                      ? `DOWNLOADING ${downloadProgress}%`
                      : 'DOWNLOADING...'}
                  </span>
                </div>
                {downloadProgress !== null && (
                  <div
                    className="mt-0.5 h-1 w-full rounded-full bg-muted overflow-hidden"
                    aria-hidden="true">
                    <div
                      className="h-full bg-accent transition-[width] duration-150 ease-out"
                      style={{width: `${downloadProgress}%`}}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1">
                <DownloadIcon className="size-4" />
                <span>DOWNLOAD FILTERED</span>
              </div>
            )}
          </Button>
          {!isDownloading && (
            <PopoverTrigger
              render={
                <Button
                  aria-label={`Download options (${flattenModeLabels[flattenMode]})`}
                  title={`Path structure: ${flattenModeLabels[flattenMode]}`}
                  size="sm"
                  variant="outline"
                  disabled={!filteredCount}>
                  <ChevronDown className="size-4" />
                </Button>
              }
            />
          )}
        </div>
        <PopoverContent side="bottom" align="end" className="w-64">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">
              Path structure
            </p>
            <div className="space-y-1">
              {(['original', 'last-level', 'flat'] as FlattenMode[]).map(
                mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setFlattenMode(mode)
                      setPopoverOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-xs transition-colors',
                      flattenMode === mode
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-muted text-muted-foreground',
                    )}>
                    {flattenModeLabels[mode]}
                  </button>
                ),
              )}
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t">
              Duplicate names will be renamed with -1, -2, etc.
            </p>
          </div>
        </PopoverContent>
      </Popover>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Download {filteredCount.toLocaleString()} images?
            </DialogTitle>
            <DialogDescription>
              This may take a long time and use a lot of memory. The images are
              fetched in batches and saved as a single ZIP file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false)
                handleDownload()
              }}>
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DownloadNotice outcome={outcome} onDismiss={dismissOutcome} />
    </>
  )
})

const SpriteButton = memo(function SpriteButton() {
  const {filteredCount} = useImageCount()
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button
        aria-label="Create sprite image from filtered images"
        disabled={!filteredCount}
        onClick={() => setDialogOpen(true)}
        size="sm"
        variant="outline"
        className="text-xs font-semibold flex items-center gap-1">
        <SpriteIcon className="size-4" />
        <span>SPRITE</span>
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
    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground sm:order-1 sm:mt-0 sm:flex-1 sm:justify-start">
      <ImageCountBadge
        filteredCount={filteredCount}
        totalCount={totalCount}
        firstVisibleIndex={firstVisibleIndex}
      />
      <div className="flex items-center gap-2">
        <DensityControl />
        <SpriteButton />
        <DownloadButton />
      </div>
    </div>
  )
})
