import {useMemo} from 'react'
import {getImageUrl, type ImageSource} from '@/shared/utils/imageSource'

interface UseImageUrlProps {
  source: ImageSource
  imagePath: string
}

/**
 * Hook for generating image URL from the image source and path
 * Memoizes URL to avoid recalculation
 */
export function useImageUrl({source, imagePath}: UseImageUrlProps) {
  const imageUrl = useMemo(
    () => getImageUrl(source, imagePath),
    [source, imagePath],
  )

  return {
    imageUrl,
  }
}
