import {useCallback} from 'react'
import {saveAs} from 'file-saver'
import {getImageUrl, type ImageSource} from '@/shared/utils/imageSource'

interface UseImageDownloadProps {
  source: ImageSource
  imagePath: string
  fileName: string
}

/**
 * Hook for downloading current image
 * Handles image download functionality
 */
export function useImageDownload({
  source,
  imagePath,
  fileName,
}: UseImageDownloadProps) {
  const handleDownload = useCallback(async () => {
    try {
      const url = getImageUrl(source, imagePath)
      const response = await fetch(url)
      const blob = await response.blob()
      saveAs(blob, fileName || 'image.png')
    } catch (err) {
      console.error('Failed to download image', err)
    }
  }, [source, imagePath, fileName])

  return {
    handleDownload,
  }
}
