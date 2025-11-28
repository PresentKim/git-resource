import {useMemo} from 'react'
import type {RandomMessageGenerator} from '@/utils/randomMessages'
import {cn} from '@/utils'

interface RandomMessageLoaderProps extends React.ComponentProps<'div'> {
  provider: RandomMessageGenerator
}

export function RandomMessageLoader({
  provider,
  className,
  children,
  ...props
}: RandomMessageLoaderProps) {
  const {title, description, footer} = useMemo(() => provider(), [provider])

  return (
    <div
      className={cn(
        'flex flex-col items-center max-w-md mx-auto p-6 space-y-4 text-center text-foreground',
        className,
      )}
      {...props}>
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-lg">{description}</p>
      <p className="text-lg italic">{footer}</p>
      {children}
    </div>
  )
}
