import {memo} from 'react'
import {ArrowDownUp, Check} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {useSortQuery} from '@/features/repo/filter/useSortQuery'
import {useRepoStore} from '@/shared/stores/repoStore'
import {
  getAvailableSortModes,
  sortModeLabels,
} from '@/shared/utils/sortImagePaths'
import {cn} from '@/shared/utils'

/** Toolbar button for choosing the order of the gallery */
export const SortControl = memo(function SortControl() {
  const {sort, setSort} = useSortQuery()
  const metaFields = useRepoStore(state => state.metaFields)
  // Sizes and dates are offered only when the source knows them; a mode from
  // a shared link stays listed so it can be seen and changed
  const modes = getAvailableSortModes(metaFields)
  if (!modes.includes(sort)) modes.push(sort)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={`Sort images (${sortModeLabels[sort]})`}
            title={`Sort: ${sortModeLabels[sort]}`}
            size="sm"
            variant="outline"
            className="text-xs font-semibold">
            <ArrowDownUp className="size-4" />
            <span className="hidden sm:inline">SORT</span>
          </Button>
        }
      />
      <PopoverContent side="bottom" align="start" className="w-60">
        <div role="radiogroup" aria-label="Sort order" className="space-y-1">
          {modes.map(mode => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={sort === mode}
              onClick={() => setSort(mode)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors outline-none max-sm:py-2.5',
                'focus-visible:ring-2 focus-visible:ring-ring',
                sort === mode
                  ? 'bg-primary font-semibold text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}>
              <span>{sortModeLabels[mode]}</span>
              {sort === mode && <Check className="size-3.5" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
})
