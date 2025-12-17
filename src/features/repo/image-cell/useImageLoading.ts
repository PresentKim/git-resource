import {useState, useRef, useCallback} from 'react'
import {getCachedImageMetadata, setCachedImageMetadata} from '@/shared/utils'

interface UseImageLoadingProps {
  onLoad?: (dimensions?: {width: number; height: number}) => void
  onError?: () => void
}

/**
 * Hook for managing image loading state and refs
 * Handles loading, error states, and image element ref management
 */
export function useImageLoading({onLoad, onError}: UseImageLoadingProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const handleLoad = useCallback(
    (dimensions?: {width: number; height: number}) => {
      setLoading(false)
      const source = imgRef.current?.src
      const width =
        dimensions?.width ?? imgRef.current?.naturalWidth ?? undefined
      const height =
        dimensions?.height ?? imgRef.current?.naturalHeight ?? undefined

      if (source && width && height) {
        setCachedImageMetadata(source, {width, height})
        onLoad?.({width, height})
      } else {
        onLoad?.(dimensions)
      }
    },
    [onLoad],
  )

  const handleError = useCallback(() => {
    setLoading(false)
    setError(true)
    onError?.()
  }, [onError])

  const handleImageRef = useCallback(
    (img: HTMLImageElement | null) => {
      imgRef.current = img
      if (img?.src) {
        const cached = getCachedImageMetadata(img.src)
        if (cached) {
          setLoading(false)
          onLoad?.(cached)
          return
        }
      }
      if (img && img.complete) {
        // When the image is already cached, use its natural size directly
        const width = img.naturalWidth
        const height = img.naturalHeight
        handleLoad({width, height})
      }
    },
    [handleLoad, onLoad],
  )

  return {
    loading,
    error,
    imgRef,
    handleLoad,
    handleError,
    handleImageRef,
  }
}
