import {useEffect, useRef} from 'react'
import {cn} from '@/shared/utils'
import {useHeaderVisibility} from '@/shared/hooks/header/useHeaderVisibility'

export function FloatingHeader({
  className,
  ...props
}: Omit<React.ComponentProps<'header'>, 'ref'>) {
  const headerRef = useRef<HTMLElement>(null)
  const {isVisible, height} = useHeaderVisibility({headerRef})

  // Let elements below the header (the sticky toolbar) move with it.
  // The height is a variable that only changes when the header is resized,
  // and visibility is a data attribute that CSS can target; toggling a
  // custom property on the root on every show/hide would restyle the whole
  // document each time.
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--header-height', `${height}px`)
    return () => {
      root.style.removeProperty('--header-height')
    }
  }, [height])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.header = isVisible ? 'visible' : 'hidden'
    return () => {
      delete root.dataset.header
    }
  }, [isVisible])

  return (
    <>
      <div style={{minHeight: height}} />
      <header
        ref={headerRef}
        className={cn(
          'fixed top-0 z-50 transition-transform duration-200 ease-out',
          isVisible ? 'translate-y-0' : '-translate-y-full',
          className,
        )}
        {...props}
      />
    </>
  )
}
