import {useRef} from 'react'
import {cn} from '@/utils'
import {useHeaderVisibility} from '@/hooks/features/header/useHeaderVisibility'

export function FloatingHeader({
  className,
  ...props
}: Omit<React.ComponentProps<'header'>, 'ref'>) {
  const headerRef = useRef<HTMLElement>(null)
  const {isVisible, height} = useHeaderVisibility({headerRef})

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
