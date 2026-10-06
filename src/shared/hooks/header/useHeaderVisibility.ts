import {useState, useRef} from 'react'
import {useHeight} from '@/shared/hooks/useHeight'
import {useScrollDetection} from '@/shared/hooks/scroll/useScrollDetection'

/** Scrolling less than this in one direction does not toggle the header */
const TOGGLE_THRESHOLD_PX = 8

interface UseHeaderVisibilityProps {
  headerRef: React.RefObject<HTMLElement | null>
}

/**
 * Hook for managing header visibility based on scroll
 * Shows/hides header based on scroll direction and position. Movement is
 * accumulated per direction, so trackpad jitter or a tiny back-and-forth
 * does not flip the header and restart its animation.
 */
export function useHeaderVisibility({headerRef}: UseHeaderVisibilityProps) {
  const height = useHeight(headerRef)
  const [isVisible, setIsVisible] = useState(true)
  const scrollYRef = useRef(window.scrollY)
  const travelRef = useRef(0)

  useScrollDetection({
    onScroll: scrollY => {
      const delta = scrollY - scrollYRef.current
      scrollYRef.current = scrollY

      // Always visible near the top of the page
      if (scrollY < height) {
        travelRef.current = 0
        setIsVisible(true)
        return
      }

      // A change of direction starts counting again
      if (Math.sign(delta) !== Math.sign(travelRef.current)) {
        travelRef.current = 0
      }
      travelRef.current += delta

      if (travelRef.current > TOGGLE_THRESHOLD_PX) {
        setIsVisible(false)
      } else if (travelRef.current < -TOGGLE_THRESHOLD_PX) {
        setIsVisible(true)
      }
    },
  })

  return {
    isVisible,
    height,
  }
}
