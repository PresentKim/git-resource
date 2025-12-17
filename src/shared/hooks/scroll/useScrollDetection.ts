import {useEffect, useRef} from 'react'

interface UseScrollDetectionProps {
  onScroll?: (scrollY: number, direction: 'up' | 'down') => void
  enabled?: boolean
}

/**
 * Hook for detecting scroll events and direction
 * Can be reused across components that need scroll detection
 */
export function useScrollDetection({
  onScroll,
  enabled = true,
}: UseScrollDetectionProps = {}) {
  const lastScrollYRef = useRef(window.scrollY)

  useEffect(() => {
    if (!enabled) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const direction = currentScrollY > lastScrollYRef.current ? 'down' : 'up'
      lastScrollYRef.current = currentScrollY
      onScroll?.(currentScrollY, direction)
    }

    window.addEventListener('scroll', handleScroll, {passive: true})
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [enabled, onScroll])
}
