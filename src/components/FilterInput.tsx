import {useEffect, useRef} from 'react'

import {Filter as FilterIcon, HelpCircle, X as XIcon} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'

import {useFilterQuery} from '@/hooks/useFilterQuery'
import {cn} from '@/utils'

export function FilterInput({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [filter, setFilter] = useFilterQuery()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = filter
    }
  }, [filter])

  const handleClearFilter = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setFilter('')
  }

  const handleApplyFilter = () => {
    if (inputRef.current && inputRef.current.value !== filter) {
      setFilter(inputRef.current.value || '')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          ref={inputRef}
          defaultValue={filter}
          onKeyDown={handleKeyDown}
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
      <Popover>
        <PopoverTrigger asChild>
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
              <span className="font-mono text-accent">-</span> to exclude.
            </p>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <span className="font-mono text-accent">button</span> – include
                paths containing &quot;button&quot;
              </li>
              <li>
                <span className="font-mono text-accent">button -dark</span> –
                include &quot;button&quot; but exclude &quot;dark&quot;
              </li>
              <li>
                <span className="font-mono text-accent">ui/icons/ -32</span> –
                include &quot;ui/icons/&quot; but exclude &quot;32&quot;
              </li>
            </ul>
          </div>
        </PopoverContent>
      </Popover>
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
