import {useCallback, useState} from 'react'
import {downloadImagesAsZip} from '@/features/repo/download/utils/downloadImagesAsZip'
import type {GithubRepo, FlattenMode} from '@/shared/utils'

interface UseImageDownloadProps {
  repo: GithubRepo
  imagePaths: string[]
  flattenMode?: FlattenMode
}

/** How the last download ended, for the UI to report */
export type DownloadOutcome =
  | {kind: 'success'; total: number}
  | {kind: 'partial'; total: number; failed: string[]}
  | {kind: 'error'; message: string}

/**
 * Hook for downloading images as ZIP
 * Handles download progress, state management and the outcome to report
 */
export function useImageDownload({
  repo,
  imagePaths,
  flattenMode = 'original',
}: UseImageDownloadProps) {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [outcome, setOutcome] = useState<DownloadOutcome | null>(null)

  const handleDownload = useCallback(async () => {
    if (!imagePaths.length) return

    setOutcome(null)
    setIsDownloading(true)
    setDownloadProgress(0)
    try {
      const {total, failed} = await downloadImagesAsZip(
        repo,
        imagePaths,
        (completed, total) => {
          const percent = Math.round((completed / total) * 100)
          setDownloadProgress(percent)
        },
        flattenMode,
      )
      setDownloadProgress(100)
      setOutcome(
        failed.length
          ? {kind: 'partial', total, failed}
          : {kind: 'success', total},
      )
      // Briefly show 100%, then reset
      setTimeout(() => {
        setDownloadProgress(null)
        setIsDownloading(false)
      }, 500)
    } catch (error) {
      console.error('Failed to download images:', error)
      setOutcome({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
      setDownloadProgress(null)
      setIsDownloading(false)
    }
  }, [repo, imagePaths, flattenMode])

  const dismissOutcome = useCallback(() => setOutcome(null), [])

  return {
    isDownloading,
    downloadProgress,
    handleDownload,
    outcome,
    dismissOutcome,
  }
}
