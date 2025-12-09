import {useRef, useEffect} from 'react'

interface UseImageTouchProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  onZoom: (delta: number, centerX: number, centerY: number) => void
  enabled?: boolean
}

/**
 * Hook for managing touch gestures (pinch zoom)
 * Handles touch events for mobile devices
 */
export function useImageTouch({
  containerRef,
  onZoom,
  enabled = true,
}: UseImageTouchProps) {
  const lastDistanceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current
    let touches: Touch[] = []

    const handleTouchStart = (e: TouchEvent) => {
      touches = Array.from(e.touches)
      if (touches.length === 2) {
        const distance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY,
        )
        lastDistanceRef.current = distance
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || lastDistanceRef.current === null) return

      e.preventDefault()
      const newTouches = Array.from(e.touches)
      const newDistance = Math.hypot(
        newTouches[0].clientX - newTouches[1].clientX,
        newTouches[0].clientY - newTouches[1].clientY,
      )

      const rect = container.getBoundingClientRect()
      const centerX =
        (newTouches[0].clientX + newTouches[1].clientX) / 2 -
        rect.left -
        rect.width / 2
      const centerY =
        (newTouches[0].clientY + newTouches[1].clientY) / 2 -
        rect.top -
        rect.height / 2

      const scaleChange = newDistance / lastDistanceRef.current
      const delta = (scaleChange - 1) * 0.5
      onZoom(delta, centerX, centerY)

      lastDistanceRef.current = newDistance
    }

    const handleTouchEnd = () => {
      touches = []
      lastDistanceRef.current = null
    }

    container.addEventListener('touchstart', handleTouchStart, {passive: false})
    container.addEventListener('touchmove', handleTouchMove, {passive: false})
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, containerRef, onZoom])

  return {}
}
