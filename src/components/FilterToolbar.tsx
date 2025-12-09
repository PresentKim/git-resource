import {memo} from 'react'
import {Button} from '@/components/ui/button'
import {Download as DownloadIcon, Loader as LoaderIcon} from 'lucide-react'
import {useRepoStore} from '@/stores/repoStore'
import {useImageCount} from '@/hooks/features/filter/useImageCount'
import {useImageDownload} from '@/hooks/features/download/useImageDownload'

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

const DownloadButton = memo(function DownloadButton() {
  const repo = useRepoStore(state => state.repo)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const {filteredCount} = useImageCount()

  const {isDownloading, downloadProgress, handleDownload} = useImageDownload({
    repo,
    imagePaths: filteredImageFiles || [],
  })

  return (
    <Button
      aria-label="Download all filtered images as ZIP"
      disabled={isDownloading || !filteredCount}
      onClick={handleDownload}
      size="sm"
      variant="outline"
      className="text-xs font-semibold flex flex-col items-center gap-0.5 min-w-[190px]">
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
