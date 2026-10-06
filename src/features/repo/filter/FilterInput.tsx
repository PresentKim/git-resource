import {useEffect, useRef, useState} from 'react'
import {IconFilter, IconHelpCircle, IconX} from '@tabler/icons-react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/components/ui/input-group'
import {Button} from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'

import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'

function FilterHelpPopover() {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Filter syntax help"
        render={
          <Button variant="ghost">
            <IconHelpCircle className="size-5" />
          </Button>
        }
      />
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

export function FilterInput() {
  const {filter: filterQuery, setFilter: setFilterQuery} = useFilterQuery()
  const [filterInput, setFilterInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input with query when query changes externally
  useEffect(() => {
    setFilterInput(filterQuery)
  }, [filterQuery])

  const handleApplyFilter = () => setFilterQuery(filterInput)

  const handleClearFilter = () => {
    setFilterInput('')
    setFilterQuery('')
    inputRef.current?.focus()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyFilter()
    } else if (e.key === 'Escape' && filterInput) {
      handleClearFilter()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterInput(e.target.value)
  }

  // Nothing to apply while the input already matches the active filter
  const isApplied = filterInput.trim() === filterQuery.trim()

  return (
    <InputGroup>
      <InputGroupInput
        ref={inputRef}
        value={filterInput}
        onKeyDown={handleInputKeyDown}
        onChange={handleInputChange}
        type="text"
        placeholder="Filter paths, e.g. sword -old"
        aria-label="Filter images"
      />
      <InputGroupAddon align="inline-end">
        {filterInput && (
          <InputGroupButton
            aria-label="Clear filter"
            title="Clear filter (Esc)"
            onClick={handleClearFilter}>
            <IconX className="size-5" />
          </InputGroupButton>
        )}
        <FilterHelpPopover />
        <InputGroupButton
          aria-label="Apply filter"
          title="Apply filter (Enter)"
          onClick={handleApplyFilter}
          disabled={isApplied}>
          <IconFilter className="size-5" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
