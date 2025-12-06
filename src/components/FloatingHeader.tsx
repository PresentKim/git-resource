import {useEffect, useState, useRef} from 'react'
import {cn} from '@/utils'
import {useHeight} from '@/hooks/useHeight'

export function FloatingHeader({
  className,
  ...props
}: Omit<React.ComponentProps<'header'>, 'ref'>) {
  const headerRef = useRef<HTMLElement>(null)
  const height = useHeight(headerRef)
  const [isVisible, setIsVisible] = useState(true)
  const scrollYRef = useRef(window.scrollY)

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(
        window.scrollY < scrollYRef.current || window.scrollY < height,
      )
      scrollYRef.current = window.scrollY
    }

    window.addEventListener('scroll', handleScroll, {passive: true})
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [height])

  return (
    <>
      <div style={{minHeight: height}} />
      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 z-50 transition-all',
          isVisible ? 'translate-y-0' : '-translate-y-full',
          className,
        )}
        {...props}
      />
    </>
  )
}
