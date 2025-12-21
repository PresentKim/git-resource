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
} from 'lucide-react'
import {useRepoStore} from '@/shared/stores/repoStore'
import {useImageCount} from '@/features/repo/filter/useImageCount'
import {useImageDownload} from '@/features/repo/download/useImageDownload'
import type {FlattenMode} from '@/shared/utils'
import {cn} from '@/shared/utils'

interface ImageCountBadgeProps {
  filteredCount: number
  totalCount: number
}

const ImageCountBadge = memo(
  function ImageCountBadge({filteredCount, totalCount}: ImageCountBadgeProps) {
    return (
      <span className="rounded-full bg-background/70 px-2 py-1">
        Showing{' '}
        <span className="font-semibold text-accent">{filteredCount}</span>
        {' of '}
        {totalCount.toLocaleString()} images
      </span>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.filteredCount === nextProps.filteredCount &&
      prevProps.totalCount === nextProps.totalCount
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

  const {isDownloading, downloadProgress, handleDownload} = useImageDownload({
    repo,
    imagePaths: filteredImageFiles || [],
    flattenMode,
  })

  const handleDownloadClick = () => {
    setPopoverOpen(false)
    handleDownload()
  }

  return (
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
          <PopoverTrigger asChild>
            <Button
              aria-label="Download options"
              size="sm"
              variant="outline"
              disabled={!filteredCount}
              className="px-2">
              <ChevronDown className="size-4" />
            </Button>
          </PopoverTrigger>
        )}
      </div>
      <PopoverContent side="bottom" align="end" className="w-64">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">
            Path structure
          </p>
          <div className="space-y-1">
            {(['original', 'last-level', 'flat'] as FlattenMode[]).map(mode => (
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
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-1 border-t">
            Duplicate names will be renamed with -1, -2, etc.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
})

export const FilterToolbar = memo(function FilterToolbar() {
  const {filteredCount, totalCount} = useImageCount()

  return (
    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground sm:order-1 sm:mt-0 sm:flex-1 sm:justify-start">
      <ImageCountBadge filteredCount={filteredCount} totalCount={totalCount} />
      <DownloadButton />
    </div>
  )
})
