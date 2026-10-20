import {useState, type CSSProperties} from 'react'
import {ArrowRight, Sparkles} from 'lucide-react'

import {cn} from '@/shared/utils'

interface RepositoryCardProps {
  owner: string
  name: string
  description?: string
  thumbnailUrls: string[]
  /** Featured cards carry a badge and keep the accent line visible */
  featured?: boolean
  onOpen: () => void
  className?: string
  style?: CSSProperties
}

export function RepositoryCard({
  owner,
  name,
  description,
  thumbnailUrls,
  featured = false,
  onOpen,
  className,
  style,
}: RepositoryCardProps) {
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(new Set())
  const visibleUrls = thumbnailUrls.filter(url => !failedUrls.has(url))
  const displayName = `${owner}/${name}`

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${featured ? 'featured' : 'example'} repository ${displayName}`}
      style={style}
      className={cn(
        'group relative flex w-full flex-col gap-3 overflow-hidden p-4 text-left',
        'rounded-xl border border-border/60 bg-card/60 shadow-sm backdrop-blur',
        'transition-all duration-150 cursor-pointer',
        'hover:border-chart-8/60 hover:bg-accent/20 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}>
      {/* Accent line along the top edge, in the hero gradient */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-chart-3 via-chart-8 to-chart-6',
          !featured &&
            'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          {featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3 text-chart-8" aria-hidden="true" />
              Featured
            </span>
          )}
          <p className="truncate font-mono text-sm font-semibold sm:text-base">
            {displayName}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
          Open
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>

      {description && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {/* Decorative: the samples only hint at what the repository holds.
          Eight equal columns keep the strip on one row down to phone width */}
      {visibleUrls.length > 0 && (
        <ul
          aria-hidden="true"
          className="grid grid-cols-8 gap-1.5 sm:w-fit sm:gap-2">
          {visibleUrls.map(url => (
            <li
              key={url}
              className="flex aspect-square items-center justify-center rounded-md bg-muted/60 transition-transform group-hover:scale-105 sm:size-10">
              <img
                src={url}
                alt=""
                width={16}
                height={16}
                loading="lazy"
                draggable={false}
                className="pixelated size-7 sm:size-8"
                onError={() => setFailedUrls(prev => new Set(prev).add(url))}
              />
            </li>
          ))}
        </ul>
      )}
    </button>
  )
}
