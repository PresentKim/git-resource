import {useCallback, useState} from 'react'
import {downloadImagesAsZip} from '@/utils'
import type {GithubRepo} from '@/utils'

interface UseImageDownloadProps {
  repo: GithubRepo
  imagePaths: string[]
}

/**
 * Hook for downloading images as ZIP
 * Handles download progress and state management
 */
export function useImageDownload({repo, imagePaths}: UseImageDownloadProps) {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    if (!imagePaths.length) return

    setIsDownloading(true)
    setDownloadProgress(0)
    try {
      await downloadImagesAsZip(repo, imagePaths, (completed, total) => {
        const percent = Math.round((completed / total) * 100)
        setDownloadProgress(percent)
      })
      setDownloadProgress(100)
      // Briefly show 100%, then reset
      setTimeout(() => {
        setDownloadProgress(null)
        setIsDownloading(false)
      }, 500)
    } catch (error) {
      console.error('Failed to download images:', error)
      setDownloadProgress(null)
      setIsDownloading(false)
    }
  }, [repo, imagePaths])

  return {
    isDownloading,
    downloadProgress,
    handleDownload,
  }
}
