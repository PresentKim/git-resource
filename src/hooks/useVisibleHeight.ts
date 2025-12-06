import {observeIntersection} from '@/utils'
import {useState, useEffect, useMemo, useRef} from 'react'

// Use fewer thresholds to reduce computation
// Only track key visibility points (0%, 25%, 50%, 75%, 100%)
const INTERSECTION_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1]

function useVisibleHeight(targetRef: React.RefObject<HTMLElement | null>) {
  const [visibleHeight, setVisibleHeight] = useState(0)
  const lastHeightRef = useRef<number>(0)

  // Memoize observer options to avoid recreating on every render
  const observerOptions = useMemo(
    () => ({
      root: null as Element | null, // Use viewport as root
      threshold: INTERSECTION_THRESHOLDS,
    }),
    [],
  )

  // Calculate visible height using IntersectionObserver
  useEffect(() => {
    return observeIntersection(
      targetRef.current,
      entry => {
        const newHeight = entry.intersectionRect.height
        // Only update if height changed significantly (threshold: 10px)
        // This reduces unnecessary re-renders during scroll
        if (Math.abs(newHeight - lastHeightRef.current) >= 10) {
          lastHeightRef.current = newHeight
          setVisibleHeight(newHeight)
        }
      },
      observerOptions,
    )
  }, [targetRef, observerOptions])

  return visibleHeight
}

export {useVisibleHeight}
