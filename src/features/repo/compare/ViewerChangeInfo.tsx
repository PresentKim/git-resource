import type {ChangeKind} from '@/shared/utils/compareListings'
import {cn} from '@/shared/utils'
import {shortenRef} from '@/shared/utils/github'

const KIND_LABELS: Record<ChangeKind, string> = {
  added: 'Added',
  modified: 'Modified',
  removed: 'Removed',
}

const KIND_STYLES: Record<ChangeKind, string> = {
  added: 'bg-emerald-600 text-white',
  modified: 'bg-amber-500 text-black',
  removed: 'bg-red-600 text-white',
}

interface ViewerChangeInfoProps {
  kind: ChangeKind
  baseRef: string
  currentRef: string
  /** Modified images can show their version from the base ref */
  showingBefore: boolean
  onShowBeforeChange: (before: boolean) => void
}

/** How the open image changed while comparing, under the viewer's title */
export function ViewerChangeInfo({
  kind,
  baseRef,
  currentRef,
  showingBefore,
  onShowBeforeChange,
}: ViewerChangeInfoProps) {
  const versionButton = (before: boolean, ref: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={showingBefore === before}
      title={ref}
      onClick={() => onShowBeforeChange(before)}
      className={cn(
        'max-w-36 truncate rounded px-2 py-1 font-mono outline-none max-sm:py-2',
        'focus-visible:ring-2 focus-visible:ring-ring',
        showingBefore === before
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}>
      {before ? 'Before' : 'After'}: {shortenRef(ref)}
    </button>
  )

  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-normal">
      <span
        className={cn(
          'rounded px-1.5 py-0.5 font-semibold',
          KIND_STYLES[kind],
        )}>
        {KIND_LABELS[kind]} since {shortenRef(baseRef)}
      </span>
      {kind === 'modified' && (
        <div
          role="radiogroup"
          aria-label="Version to show"
          className="flex gap-0.5 rounded-md border border-border/60 bg-card/80 p-0.5">
          {versionButton(true, baseRef)}
          {versionButton(false, currentRef)}
        </div>
      )}
    </div>
  )
}
