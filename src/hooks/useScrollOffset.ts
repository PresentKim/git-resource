import {useState, useEffect, useRef} from 'react'

function useScrollOffset(targetRef: React.RefObject<HTMLElement | null>) {
  const [scrollTop, setScrollTop] = useState(0)
  const rafIdRef = useRef<number | null>(null)

  useEffect(() => {
    const handleWindowScroll = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
      }

      rafIdRef.current = requestAnimationFrame(() => {
        if (targetRef.current) {
          const {top} = targetRef.current.getBoundingClientRect()
          setScrollTop(Math.max(0, -top))
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
