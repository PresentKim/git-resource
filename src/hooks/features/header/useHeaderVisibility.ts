import {useState, useRef} from 'react'
import {useHeight} from '@/hooks/useHeight'
import {useScrollDetection} from '@/hooks/features/scroll/useScrollDetection'

interface UseHeaderVisibilityProps {
  headerRef: React.RefObject<HTMLElement | null>
}

/**
 * Hook for managing header visibility based on scroll
 * Shows/hides header based on scroll direction and position
 */
export function useHeaderVisibility({headerRef}: UseHeaderVisibilityProps) {
  const height = useHeight(headerRef)
  const [isVisible, setIsVisible] = useState(true)
  const scrollYRef = useRef(window.scrollY)

  useScrollDetection({
    onScroll: scrollY => {
      setIsVisible(scrollY < scrollYRef.current || scrollY < height)
      scrollYRef.current = scrollY
    },
  })

  return {
    isVisible,
    height,
  }
}
