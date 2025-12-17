import {useCallback} from 'react'
import {saveAs} from 'file-saver'
import {createRawImageUrl} from '@/shared/utils'
import type {GithubRepo} from '@/shared/utils'

interface UseImageDownloadProps {
  repo: GithubRepo
  imagePath: string
  fileName: string
}

/**
 * Hook for downloading current image
 * Handles image download functionality
 */
export function useImageDownload({
  repo,
  imagePath,
  fileName,
}: UseImageDownloadProps) {
  const handleDownload = useCallback(async () => {
    try {
      const url = createRawImageUrl(repo, imagePath)
      const response = await fetch(url)
      const blob = await response.blob()
      saveAs(blob, fileName || 'image.png')
    } catch (err) {
      console.error('Failed to download image', err)
    }
  }, [repo, imagePath, fileName])

  return {
    handleDownload,
  }
}
