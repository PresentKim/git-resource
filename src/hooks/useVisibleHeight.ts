import {observeIntersection} from '@/utils'
import {useState, useEffect, useMemo} from 'react'

// Pre-compute threshold array to avoid recreation on every render
const INTERSECTION_THRESHOLDS = Array.from({length: 101}, (_, i) => i / 100)

function useVisibleHeight(targetRef: React.RefObject<HTMLElement | null>) {
  const [visibleHeight, setVisibleHeight] = useState(0)

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
        setVisibleHeight(entry.intersectionRect.height)
      },
      observerOptions,
    )
  }, [targetRef, observerOptions])

  return visibleHeight
}

export {useVisibleHeight}
