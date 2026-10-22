import {memo} from 'react'
import {LoaderCircle, X} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {useCompareQuery} from '@/features/repo/filter/useGalleryQuery'
import {useGithubRepo, useRepoStore} from '@/shared/stores/repoStore'
import {CHANGE_FILTERS, type ChangeFilter} from '@/shared/utils/galleryQuery'
import {cn} from '@/shared/utils'
import {shortenRef} from '@/shared/utils/github'

const FILTER_LABELS: Record<ChangeFilter, string> = {
  all: 'All changes',
  added: 'Added',
  modified: 'Modified',
  removed: 'Removed',
}

const FILTER_DOTS: Record<ChangeFilter, string> = {
  all: 'bg-muted-foreground',
  added: 'bg-emerald-600',
  modified: 'bg-amber-500',
  removed: 'bg-red-600',
}

/**
 * While comparing: what is compared, the kind of changes to show, and a way
 * to stop. Nothing otherwise.
 */
export const CompareBar = memo(function CompareBar() {
  const repo = useGithubRepo()
  const comparison = useRepoStore(state => state.comparison)
  const status = useRepoStore(state => state.compareStatus)
  const {setCompareRef, changes, setChanges} = useCompareQuery()

  if (!repo || (!comparison && !status)) return null

  const stop = () => {
    void setCompareRef(null)
    void setChanges(null)
  }
  const baseRef = comparison?.baseRef ?? status?.baseRef ?? ''

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border/60 bg-card px-2 py-1.5 text-xs shadow-sm"
      aria-live="polite">
      {status?.loading ? (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          Loading <span className="font-mono">{shortenRef(baseRef)}</span> to
          compare...
        </span>
      ) : status?.error ? (
        <span role="alert" className="text-destructive-foreground">
          Could not compare with{' '}
          <span className="font-mono">{shortenRef(baseRef)}</span>:{' '}
          <span className="text-muted-foreground">{status.error}</span>
        </span>
      ) : (
        comparison && (
          <>
            <span className="text-muted-foreground">
              Changes from{' '}
              <span className="font-mono" title={baseRef}>
                {shortenRef(baseRef)}
              </span>{' '}
              to{' '}
              <span className="font-mono text-foreground" title={repo.ref}>
                {shortenRef(repo.ref)}
              </span>
            </span>
            <div
              role="radiogroup"
              aria-label="Changes to show"
              className="flex flex-wrap gap-1">
              {CHANGE_FILTERS.map(filter => {
                const count =
                  filter === 'all'
                    ? comparison.counts.added +
                      comparison.counts.modified +
                      comparison.counts.removed
                    : comparison.counts[filter]
                const checked = changes === filter
                return (
                  <button
                    key={filter}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setChanges(filter === 'all' ? null : filter)}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 outline-none transition-colors max-sm:py-2',
                      'focus-visible:ring-2 focus-visible:ring-ring',
                      checked
                        ? 'bg-primary font-semibold text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}>
                    <span
                      aria-hidden="true"
                      className={cn('size-2 rounded-full', FILTER_DOTS[filter])}
                    />
                    {FILTER_LABELS[filter]}
                    <span className="tabular-nums opacity-80">
                      {count.toLocaleString()}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )
      )}
      <Button
        size="sm"
        variant="ghost"
        className="ml-auto text-xs max-sm:h-8"
        onClick={stop}>
        <X className="size-3.5" />
        Stop comparing
      </Button>
    </div>
  )
})
