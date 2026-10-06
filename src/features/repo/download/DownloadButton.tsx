import {memo, useState} from 'react'
import {Download as DownloadIcon} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {DownloadDialog} from '@/features/repo/download/DownloadDialog'
import {DownloadNotice} from '@/features/repo/download/DownloadNotice'
import {useImageDownload} from '@/features/repo/download/useImageDownload'
import {useImageCount} from '@/features/repo/filter/useImageCount'
import {useRepoStore} from '@/shared/stores/repoStore'
import type {FlattenMode} from '@/shared/utils'

/**
 * Compact toolbar button. It opens a dialog to choose how to download
 * instead of carrying the options itself; the result is reported by a notice.
 */
export const DownloadButton = memo(function DownloadButton() {
  const repo = useRepoStore(state => state.repo)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const {filteredCount} = useImageCount()
  const [open, setOpen] = useState(false)
  const [flattenMode, setFlattenMode] = useState<FlattenMode>('original')

  const imagePaths = filteredImageFiles ?? []
  const {
    isDownloading,
    downloadProgress,
    handleDownload,
    outcome,
    dismissOutcome,
  } = useImageDownload({repo, imagePaths, flattenMode})

  const handleConfirm = async () => {
    // The hook reports success and failure through `outcome`, so the dialog
    // can close either way and the notice says what happened
    await handleDownload()
    setOpen(false)
  }

  return (
    <>
      <Button
        aria-label="Download the filtered images"
        aria-haspopup="dialog"
        title="Download"
        disabled={!filteredCount}
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="text-xs font-semibold flex items-center gap-1">
        <DownloadIcon className="size-4" />
        <span className="hidden sm:inline">DOWNLOAD</span>
      </Button>
      <DownloadDialog
        open={open}
        onOpenChange={setOpen}
        imagePaths={imagePaths}
        flattenMode={flattenMode}
        onFlattenModeChange={setFlattenMode}
        isDownloading={isDownloading}
        progress={downloadProgress}
        onDownload={handleConfirm}
      />
      <DownloadNotice outcome={outcome} onDismiss={dismissOutcome} />
    </>
  )
})
