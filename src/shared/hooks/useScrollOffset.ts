import {useState, useEffect, useRef} from 'react'

function useScrollOffset(targetRef: React.RefObject<HTMLElement | null>) {
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
        const newScrollTop = Math.max(0, window.scrollY)

        // Only update state if scroll position changed significantly (threshold: 2px)
        // This reduces unnecessary re-renders during smooth scrolling
        const scrollDelta = Math.abs(newScrollTop - lastScrollTopRef.current)
        if (scrollDelta >= 2) {
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
  }, [targetRef])

  return scrollTop
}

export {useScrollOffset}
