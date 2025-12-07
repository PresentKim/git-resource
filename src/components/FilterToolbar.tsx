import {memo, useCallback, useMemo, useState} from 'react'
import {Button} from '@/components/ui/button'
import {Download as DownloadIcon, Loader as LoaderIcon} from 'lucide-react'
import {downloadImagesAsZip, type GithubRepo, isMcmetaFile} from '@/utils'
import {usePromise} from '@/hooks/usePromise'
import type {GithubImageFileTree} from '@/api/github/types'

interface FilterToolbarProps {
  repo: GithubRepo
  filteredImageFiles: string[] | null
  imageFiles: GithubImageFileTree | null
}

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

interface DownloadButtonProps {
  repo: GithubRepo
  filteredImageFiles: string[] | null
}

function areRepoEqual(prev: GithubRepo, next: GithubRepo): boolean {
  return (
    prev.owner === next.owner &&
    prev.name === next.name &&
    prev.ref === next.ref
  )
}

function areArraysEqual<T>(prev: T[] | null, next: T[] | null): boolean {
  if (prev === next) return true
  if (prev === null || next === null) return false
  if (prev.length !== next.length) return false
  return prev.every((item, index) => item === next[index])
}

const DownloadButton = memo(
  function DownloadButton({repo, filteredImageFiles}: DownloadButtonProps) {
    const filteredCount = useMemo(
      () => filteredImageFiles?.length ?? 0,
      [filteredImageFiles],
    )
    const [downloadProgress, setDownloadProgress] = useState<number | null>(
      null,
    )

    const downloadFilteredImages = useCallback(async () => {
      const paths = filteredImageFiles || []
      if (!paths.length) return

      setDownloadProgress(0)
      try {
        await downloadImagesAsZip(repo, paths, (completed, total) => {
          const percent = Math.round((completed / total) * 100)
          setDownloadProgress(percent)
        })
        setDownloadProgress(100)
        // Briefly show 100%, then reset
        setTimeout(() => setDownloadProgress(null), 500)
      } catch (error) {
        console.error('Failed to download images:', error)
        setDownloadProgress(null)
        // Optionally show error to user
      }
    }, [repo, filteredImageFiles])

    const [isDownloading, downloadAll] = usePromise(downloadFilteredImages)

    return (
      <Button
        aria-label="Download all filtered images as ZIP"
        disabled={isDownloading || !filteredCount}
        onClick={downloadAll}
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
  },
  (prevProps, nextProps) => {
    return (
      areRepoEqual(prevProps.repo, nextProps.repo) &&
      areArraysEqual(prevProps.filteredImageFiles, nextProps.filteredImageFiles)
    )
  },
)

export const FilterToolbar = memo(
  function FilterToolbar({
    repo,
    filteredImageFiles,
    imageFiles,
  }: FilterToolbarProps) {
    const filteredCount = useMemo(
      () => filteredImageFiles?.length ?? 0,
      [filteredImageFiles],
    )

    const totalCount = useMemo(() => {
      if (!imageFiles) return 0
      return imageFiles.filter(path => !isMcmetaFile(path)).length
    }, [imageFiles])

    return (
      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground sm:order-1 sm:mt-0 sm:flex-1 sm:justify-start">
        <ImageCountBadge
          filteredCount={filteredCount}
          totalCount={totalCount}
        />
        <DownloadButton repo={repo} filteredImageFiles={filteredImageFiles} />
      </div>
    )
  },
  (prevProps, nextProps) => {
    return (
      areRepoEqual(prevProps.repo, nextProps.repo) &&
      areArraysEqual(
        prevProps.filteredImageFiles,
        nextProps.filteredImageFiles,
      ) &&
      areArraysEqual(prevProps.imageFiles, nextProps.imageFiles)
    )
  },
)
