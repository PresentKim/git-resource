import {ArrowRight, Sparkles} from 'lucide-react'

import {cn, createGithubRepo, createRawImageUrl} from '@/shared/utils'
import type {FeaturedRepository} from '@/shared/utils/example-repositories'

interface FeaturedRepositoryCardProps {
  repository: FeaturedRepository
  onOpen: () => void
}

export function FeaturedRepositoryCard({
  repository,
  onOpen,
}: FeaturedRepositoryCardProps) {
  const {owner, name, ref, description, previewImages} = repository
  const repo = createGithubRepo(owner, name, ref)
  const displayName = `${owner}/${name}`

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open featured repository ${displayName}`}
      className={cn(
        'group relative flex w-full flex-col gap-3 overflow-hidden p-4 text-left',
        'rounded-xl border border-border/60 bg-card/60 shadow-sm backdrop-blur',
        'transition-all duration-150 cursor-pointer',
        'hover:border-chart-8/60 hover:bg-accent/20 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}>
      {/* Accent line along the top edge, in the hero gradient */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-chart-3 via-chart-8 to-chart-6"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3 text-chart-8" aria-hidden="true" />
          Featured
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
          Open
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>

      <div className="space-y-1">
        <p className="truncate font-mono text-sm font-semibold sm:text-base">
          {displayName}
        </p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Decorative: the samples only hint at what the repository holds */}
      {/* Eight equal columns keep the strip on one row down to phone width */}
      <ul
        aria-hidden="true"
        className="grid grid-cols-8 gap-1.5 sm:w-fit sm:gap-2">
        {previewImages.map(path => (
          <li
            key={path}
            className="flex aspect-square items-center justify-center rounded-md bg-muted/60 transition-transform group-hover:scale-105 sm:size-10">
            <img
              src={createRawImageUrl(repo, path)}
              alt=""
              width={16}
              height={16}
              loading="lazy"
              draggable={false}
              className="pixelated size-7 sm:size-8"
            />
          </li>
        ))}
      </ul>
    </button>
  )
}
