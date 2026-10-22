import {memo, useId, useState} from 'react'
import {GitCompareArrows} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {Input} from '@/shared/components/ui/input'
import {Label} from '@/shared/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {useGithubRefs} from '@/shared/api/github/hooks/useGithubRefs'
import {useCompareQuery} from '@/features/repo/filter/useGalleryQuery'
import {useGithubRepo} from '@/shared/stores/repoStore'
import {shortenRef} from '@/shared/utils/github'

const MAX_SUGGESTIONS = 5

interface CompareFormProps {
  owner: string
  name: string
  currentRef: string
  onDone: () => void
}

/** Mounted while the popover is open, so it starts from the URL's ref */
function CompareForm({owner, name, currentRef, onDone}: CompareFormProps) {
  const {compareRef, setCompareRef, setChanges} = useCompareQuery()
  const [value, setValue] = useState(compareRef ?? '')
  const inputId = useId()
  const listId = useId()
  const refs = useGithubRefs({owner, name})

  const others = (names: string[] | undefined) =>
    (names ?? []).filter(refName => refName !== currentRef)
  const tags = others(refs.data?.tags)
  const branches = others(refs.data?.branches)
  const suggestions = [
    ...tags.slice(0, MAX_SUGGESTIONS),
    ...branches.slice(0, MAX_SUGGESTIONS),
  ]

  const compareWith = (ref: string) => {
    const trimmed = ref.trim()
    if (!trimmed) return
    void setCompareRef(trimmed)
    void setChanges(null)
    onDone()
  }

  return (
    <form
      className="space-y-3"
      onSubmit={event => {
        event.preventDefault()
        compareWith(value)
      }}>
      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="text-xs font-semibold">
          Compare <span className="font-mono">{shortenRef(currentRef)}</span>{' '}
          with
        </Label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            list={listId}
            value={value}
            onChange={event => setValue(event.target.value)}
            placeholder="Branch, tag or commit"
            autoComplete="off"
            spellCheck={false}
            className="h-8 min-w-0 flex-1 text-xs"
          />
          <Button type="submit" size="lg" disabled={!value.trim()}>
            Compare
          </Button>
        </div>
        <datalist id={listId}>
          {[...tags, ...branches].map(refName => (
            <option key={refName} value={refName} />
          ))}
        </datalist>
      </div>

      {suggestions.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Suggestions">
          {suggestions.map(refName => (
            <li key={refName}>
              <button
                type="button"
                className="max-w-40 truncate rounded border border-border/60 px-1.5 py-0.5 font-mono text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-sm:py-1.5"
                title={`Compare with ${refName}`}
                onClick={() => compareWith(refName)}>
                {refName}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Shows only the images added, modified or removed since then, so changes
        between versions are easy to review.
      </p>

      {compareRef && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void setCompareRef(null)
            void setChanges(null)
            onDone()
          }}>
          Stop comparing
        </Button>
      )}
    </form>
  )
}

/** Toolbar button to compare the open ref with another one (GitHub only) */
export const CompareControl = memo(function CompareControl() {
  const repo = useGithubRepo()
  const {compareRef} = useCompareQuery()
  const [open, setOpen] = useState(false)

  if (!repo?.owner || !repo.ref) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-label={
              compareRef
                ? `Comparing with ${compareRef}`
                : 'Compare with another branch, tag or commit'
            }
            title="Compare versions"
            size="sm"
            variant={compareRef ? 'default' : 'outline'}
            className="text-xs font-semibold">
            <GitCompareArrows className="size-4" />
            <span className="hidden sm:inline">COMPARE</span>
          </Button>
        }
      />
      <PopoverContent side="bottom" align="start" className="w-80">
        <CompareForm
          owner={repo.owner}
          name={repo.name}
          currentRef={repo.ref}
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
})
