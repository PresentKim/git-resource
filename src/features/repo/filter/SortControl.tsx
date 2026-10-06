import {memo} from 'react'
import {ArrowDownUp, Check} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {useSortQuery} from '@/features/repo/filter/useSortQuery'
import {SORT_MODES, sortModeLabels} from '@/shared/utils/sortImagePaths'
import {cn} from '@/shared/utils'

/** Toolbar button for choosing the order of the gallery */
export const SortControl = memo(function SortControl() {
  const {sort, setSort} = useSortQuery()

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
            <span>SORT</span>
          </Button>
        }
      />
      <PopoverContent side="bottom" align="start" className="w-60">
        <div role="radiogroup" aria-label="Sort order" className="space-y-1">
          {SORT_MODES.map(mode => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={sort === mode}
              onClick={() => setSort(mode)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                sort === mode
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted',
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
