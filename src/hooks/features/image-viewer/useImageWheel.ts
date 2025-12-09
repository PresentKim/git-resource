import {useCallback, useEffect} from 'react'

interface UseImageWheelProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  onZoom: (delta: number, centerX: number, centerY: number) => void
  onNavigate?: (direction: 'next' | 'previous') => void
  enabled?: boolean
}

/**
 * Hook for managing wheel events (zoom and navigation)
 * Handles Ctrl/Cmd + wheel for zoom, regular wheel for navigation
 */
export function useImageWheel({
  containerRef,
  onZoom,
  onNavigate,
  enabled = true,
}: UseImageWheelProps) {
  const handleWheelZoom = useCallback(
    (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return

      e.preventDefault()
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const centerX = e.clientX - rect.left - rect.width / 2
      const centerY = e.clientY - rect.top - rect.height / 2

      const delta = -e.deltaY * 0.001
      onZoom(delta, centerX, centerY)
    },
    [containerRef, onZoom],
  )

  useEffect(() => {
    if (!enabled) return

    const handleWheel = (e: WheelEvent) => {
      const container = containerRef.current
      if (!container || !container.contains(e.target as Node)) {
        return
      }

      // If Ctrl/Cmd is pressed, handle zoom instead
      if (e.ctrlKey || e.metaKey) {
        handleWheelZoom(e)
        return
      }

      e.preventDefault()
      e.stopPropagation()
      if (Math.abs(e.deltaY) > 10) {
        if (e.deltaY > 0) {
          onNavigate?.('next')
        } else if (e.deltaY < 0) {
          onNavigate?.('previous')
        }
      }
    }

    window.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    })
    return () => {
      window.removeEventListener('wheel', handleWheel, {capture: true})
    }
  }, [enabled, handleWheelZoom, onNavigate, containerRef])

  return {}
}
