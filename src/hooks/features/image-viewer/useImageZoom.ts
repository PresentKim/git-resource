import {useState, useCallback, useRef} from 'react'

interface UseImageZoomProps {
  minScale?: number
  maxScale?: number
  initialScale?: number
  onImageChange?: () => void
}

/**
 * Hook for managing image zoom functionality
 * Handles zoom state, zoom actions, and zoom limits
 */
export function useImageZoom({
  minScale = 0.5,
  maxScale = 5,
  initialScale = 1,
  onImageChange,
}: UseImageZoomProps = {}) {
  const [scale, setScale] = useState(initialScale)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Reset zoom when image changes
  const resetZoom = useCallback(() => {
    setScale(initialScale)
    setTranslateX(0)
    setTranslateY(0)
    onImageChange?.()
  }, [initialScale, onImageChange])

  const handleZoom = useCallback(
    (delta: number, centerX?: number, centerY?: number) => {
      setScale(prevScale => {
        const newScale = Math.max(
          minScale,
          Math.min(maxScale, prevScale + delta),
        )

        // Zoom towards center point if provided
        if (
          centerX !== undefined &&
          centerY !== undefined &&
          containerRef.current
        ) {
          setTranslateX(prevX => {
            const scaleChange = newScale / prevScale
            return centerX - (centerX - prevX) * scaleChange
          })
          setTranslateY(prevY => {
            const scaleChange = newScale / prevScale
            return centerY - (centerY - prevY) * scaleChange
          })
        }

        return newScale
      })
    },
    [minScale, maxScale],
  )

  const handleResetZoom = useCallback(() => {
    resetZoom()
  }, [resetZoom])

  const setTranslate = useCallback((x: number, y: number) => {
    setTranslateX(x)
    setTranslateY(y)
  }, [])

  return {
    scale,
    translateX,
    translateY,
    containerRef,
    handleZoom,
    handleResetZoom,
    resetZoom,
    setTranslate,
  }
}
