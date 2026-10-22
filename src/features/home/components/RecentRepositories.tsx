import {History, X} from 'lucide-react'

import {useRecentReposStore} from '@/shared/stores/recentReposStore'
import {cn} from '@/shared/utils'

interface RecentRepositoriesProps {
  onOpen: (owner: string, name: string, ref: string) => void
  className?: string
}

/** Repositories opened before in this browser; nothing when there are none */
export function RecentRepositories({
  onOpen,
  className,
}: RecentRepositoriesProps) {
  const recent = useRecentReposStore(state => state.recent)
  const removeRecent = useRecentReposStore(state => state.removeRecent)

  if (!recent.length) return null

  return (
    <div className={cn('space-y-2', className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <History className="size-3.5" aria-hidden="true" />
        Recently opened
      </p>
      <ul className="flex flex-wrap gap-2">
        {recent.map(entry => {
          const label = `${entry.owner}/${entry.name}`
          return (
            <li
              key={label}
              className="flex items-center rounded-md border border-border/60 bg-card/60 text-xs">
              <button
                type="button"
                className="max-w-64 truncate rounded-l-md px-2.5 py-1.5 font-mono outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring max-sm:py-2.5"
                title={`Open ${label}${entry.ref ? `@${entry.ref}` : ''}`}
                onClick={() => onOpen(entry.owner, entry.name, entry.ref)}>
                {label}
                {entry.ref && (
                  <span className="text-muted-foreground">@{entry.ref}</span>
                )}
              </button>
              <button
                type="button"
                className="rounded-r-md px-1.5 py-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-sm:py-2.5"
                aria-label={`Forget ${label}`}
                title="Forget"
                onClick={() => removeRecent(entry)}>
                <X className="size-3.5" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
