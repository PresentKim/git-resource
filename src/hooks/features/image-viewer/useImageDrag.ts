import {useState, useRef, useCallback, useEffect} from 'react'

interface UseImageDragProps {
  scale: number
  translateX: number
  translateY: number
  onTranslateChange: (x: number, y: number) => void
  minScale?: number
}

/**
 * Hook for managing image drag functionality
 * Handles mouse drag events for panning zoomed images
 */
export function useImageDrag({
  scale,
  translateX,
  translateY,
  onTranslateChange,
  minScale = 1,
}: UseImageDragProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({x: 0, y: 0, translateX: 0, translateY: 0})

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only handle primary button drag when zoomed in
      if (e.button !== 0 || scale <= minScale) return

      // Prevent browser default drag behavior (e.g., dragging the image/canvas ghost)
      e.preventDefault()

      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        translateX,
        translateY,
      }
    },
    [scale, minScale, translateX, translateY],
  )

  // Handle drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      onTranslateChange(
        dragStartRef.current.translateX + deltaX,
        dragStartRef.current.translateY + deltaY,
      )
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, onTranslateChange])

  return {
    isDragging,
    handleMouseDown,
  }
}
