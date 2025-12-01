import {useEffect, useRef} from 'react'

/**
 * Lock background scroll while preserving current scroll position.
 */
export function useScrollLock(active: boolean) {
  const scrollYRef = useRef(0)

  useEffect(() => {
    if (!active) return

    const scrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    scrollYRef.current = scrollY

    const originalBodyPosition = document.body.style.position
    const originalBodyTop = document.body.style.top
    const originalBodyWidth = document.body.style.width
    const originalBodyOverflowY = document.body.style.overflowY

    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    document.body.style.overflowY = 'hidden'

    return () => {
      document.body.style.position = originalBodyPosition
      document.body.style.top = originalBodyTop
      document.body.style.width = originalBodyWidth
      document.body.style.overflowY = originalBodyOverflowY
      window.scrollTo(0, scrollYRef.current)
    }
  }, [active])
}
