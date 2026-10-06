import {useEffect, useRef} from 'react'
import {cn} from '@/shared/utils'
import {useHeaderVisibility} from '@/shared/hooks/header/useHeaderVisibility'

export function FloatingHeader({
  className,
  ...props
}: Omit<React.ComponentProps<'header'>, 'ref'>) {
  const headerRef = useRef<HTMLElement>(null)
  const {isVisible, height} = useHeaderVisibility({headerRef})

  // Let sticky elements below the header follow it as it hides and shows
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--header-offset', isVisible ? `${height}px` : '0px')
    return () => {
      root.style.removeProperty('--header-offset')
    }
  }, [isVisible, height])

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
