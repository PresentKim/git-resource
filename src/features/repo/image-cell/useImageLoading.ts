import {useState, useRef, useCallback} from 'react'
import {getCachedImageMetadata, setCachedImageMetadata} from '@/shared/utils'

interface UseImageLoadingProps {
  /** What is being shown (e.g. its path); an error belongs to one source */
  source: string
  onLoad?: (dimensions?: {width: number; height: number}) => void
  onError?: () => void
}

/**
 * Hook for managing image loading state and refs
 * Handles loading, error states, and image element ref management
 */
export function useImageLoading({
  source,
  onLoad,
  onError,
}: UseImageLoadingProps) {
  const [loading, setLoading] = useState(true)
  // Remembering which source failed, rather than a flag, lets a component
  // that is reused for another image (a recycled grid cell, the viewer moving
  // to the next image) start without the previous image's error
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const error = failedSource !== null && failedSource === source
  // Changed on retry to remount the media, so the browser requests it again
  const [attempt, setAttempt] = useState(0)
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
    setFailedSource(source)
    onError?.()
  }, [source, onError])

  const retry = useCallback(() => {
    setFailedSource(null)
    setLoading(true)
    setAttempt(prev => prev + 1)
  }, [])

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
    attempt,
    imgRef,
    handleLoad,
    handleError,
    handleImageRef,
    retry,
  }
}
