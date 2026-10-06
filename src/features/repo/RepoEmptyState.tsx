import {IconFilterOff} from '@tabler/icons-react'

import {Button} from '@/shared/components/ui/button'
import {RandomMessageLoader} from '@/shared/components/RandomMessageLoader'
import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'
import {useRepoStore} from '@/shared/stores/repoStore'
import {generateNoImagesMessage} from '@/shared/utils/randomMessages'

const containerClass =
  'flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-center'

/**
 * Shown when there is nothing to display. A filter that matches nothing in a
 * repository that does have images gets its own message and a way out,
 * instead of claiming the repository is empty.
 */
export function RepoEmptyState() {
  const {filter, setFilter} = useFilterQuery()
  const totalCount = useRepoStore(state => state.totalImageCount)

  if (totalCount > 0 && filter.trim()) {
    return (
      <div role="status" className={containerClass}>
        <IconFilterOff className="size-10 text-muted-foreground" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">No images match your filter</h2>
          <p className="text-sm text-muted-foreground">
            None of the {totalCount.toLocaleString()} images in this repository
            match{' '}
            <span className="break-all font-mono text-foreground">
              {filter.trim()}
            </span>
          </p>
        </div>
        <Button variant="outline" onClick={() => setFilter('')}>
          Clear filter
        </Button>
        <ul className="space-y-1 text-left text-xs text-muted-foreground">
          <li>· Every keyword must appear in the path (case-insensitive).</li>
          <li>· A leading - excludes paths that contain that word.</li>
        </ul>
      </div>
    )
  }

  return (
    <div role="status" className={containerClass}>
      <RandomMessageLoader provider={generateNoImagesMessage} />
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>No images were found in this repository.</p>
        <p>Make sure it contains PNG, JPEG, GIF, WebP or SVG images.</p>
      </div>
    </div>
  )
}
