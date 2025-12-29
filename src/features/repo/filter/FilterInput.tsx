import {useEffect} from 'react'
import {Filter as FilterIcon, HelpCircle, X as XIcon} from 'lucide-react'

import {Input} from '@/shared/components/ui/input'
import {Button} from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'

import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'
import {cn} from '@/shared/utils'
import {useInputRef} from '@/shared/hooks/form/useInputRef'

function FilterHelpPopover() {
  return (
    <Popover>
      <PopoverTrigger>
        <Button
          aria-label="Filter syntax help"
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end">
        <div className="space-y-2 text-xs">
          <p className="font-semibold text-foreground">Filter syntax</p>
          <p className="text-muted-foreground">
            Use plain keywords to include, and prefix with{' '}
            <span className="font-mono text-accent-foreground">-</span> to
            exclude.
          </p>
          <ul className="space-y-1 text-muted-foreground">
            <li>
              <span className="font-mono text-accent-foreground">button</span> –
              include paths containing &quot;button&quot;
            </li>
            <li>
              <span className="font-mono text-accent-foreground">
                button -dark
              </span>{' '}
              – include &quot;button&quot; but exclude &quot;dark&quot;
            </li>
            <li>
              <span className="font-mono text-accent-foreground">
                ui/icons/ -32
              </span>{' '}
              – include &quot;ui/icons/&quot; but exclude &quot;32&quot;
            </li>
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function FilterInput({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const {filter: filterQuery, setFilter: setFilterQuery} = useFilterQuery()
  const {
    inputRef: filterInputRef,
    clearInput: clearFilterInput,
    getValue: getFilterInput,
    setValue: setFilterInput,
  } = useInputRef()

  // Sync input with query when query changes externally
  useEffect(() => {
    setFilterInput(filterQuery)
  }, [filterQuery, setFilterInput])

  const handleApplyFilter = () => setFilterQuery(getFilterInput())
  const handleClearFilter = () => clearFilterInput()

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyFilter()
    }
  }

  return (
    <div
      className={cn('flex w-full items-center justify-end gap-1.5', className)}
      {...props}>
      <div className="relative flex-1 max-w-lg">
        <Input
          ref={filterInputRef}
          defaultValue={getFilterInput()}
          onKeyDown={handleInputKeyDown}
          type="text"
          placeholder="'keyword' to include, '-keyword' to exclude"
          className="w-full pr-8 peer"
          aria-label="Filter images"
          aria-describedby="filter-description"
        />
        <span id="filter-description" className="sr-only">
          Enter keywords to include or exclude images. Use '-keyword' to
          exclude.
        </span>
        <Button
          aria-label="Clear filter"
          onClick={handleClearFilter}
          size="icon"
          variant="ghost"
          className="absolute right-0 top-0 h-full px-2 peer-placeholder-shown:hidden">
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
      <FilterHelpPopover />
      <Button
        aria-label="Apply filter"
        onClick={handleApplyFilter}
        size="icon"
        variant="outline"
        className="shrink-0">
        <FilterIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
