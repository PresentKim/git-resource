import {useState, useEffect, useRef} from 'react'

/**
 * Track window scroll position.
 *
 * @param step When greater than 0, the reported offset is rounded down to a
 *   multiple of `step`, so consumers only re-render when the scroll position
 *   crosses a step boundary (e.g. a grid row) instead of on every scroll event.
 */
function useScrollOffset(
  targetRef: React.RefObject<HTMLElement | null>,
  step = 0,
) {
  const [scrollTop, setScrollTop] = useState(0)
  const rafIdRef = useRef<number | null>(null)
  const lastScrollTopRef = useRef<number>(0)

  useEffect(() => {
    const element = targetRef.current
    if (!element) return

    const handleWindowScroll = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }

      rafIdRef.current = requestAnimationFrame(() => {
        // Use window.scrollY directly instead of getBoundingClientRect()
        // This avoids forced synchronous layout (reflow)
        const rawScrollTop = Math.max(0, window.scrollY)
        const newScrollTop =
          step > 0 ? Math.floor(rawScrollTop / step) * step : rawScrollTop

        // Only update state if the position changed enough to matter:
        // a step boundary was crossed, or 2px when no step is given
        const scrollDelta = Math.abs(newScrollTop - lastScrollTopRef.current)
        if (step > 0 ? scrollDelta > 0 : scrollDelta >= 2) {
          lastScrollTopRef.current = newScrollTop
          setScrollTop(newScrollTop)
        }
        rafIdRef.current = null
      })
    }
    window.addEventListener('scroll', handleWindowScroll, {passive: true})

    handleWindowScroll()

    return () => {
      window.removeEventListener('scroll', handleWindowScroll)
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [targetRef, step])

  return scrollTop
}

export {useScrollOffset}
