import {useEffect, useState} from 'react'
import {IconFilter, IconHelpCircle} from '@tabler/icons-react'
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
      <PopoverTrigger>
        <Button
          aria-label="Filter syntax help"
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground">
          <IconHelpCircle title="Filter syntax help" className="size-5" />
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

export function FilterInput() {
  const {filter: filterQuery, setFilter: setFilterQuery} = useFilterQuery()
  const [filterInput, setFilterInput] = useState('')

  // Sync input with query when query changes externally
  useEffect(() => {
    setFilterInput(filterQuery)
  }, [filterQuery])

  const handleApplyFilter = () => setFilterQuery(filterInput)

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyFilter()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterInput(e.target.value)
  }

  return (
    <InputGroup>
      <InputGroupInput
        value={filterInput}
        onKeyDown={handleInputKeyDown}
        onChange={handleInputChange}
        type="text"
        placeholder="'keyword' to include, '-keyword' to exclude"
        aria-label="Filter images"
        aria-describedby="filter-description"
      />
      <InputGroupAddon align="inline-end">
        <FilterHelpPopover />
        <InputGroupButton
          aria-label="Apply filter"
          title="Apply filter"
          onClick={handleApplyFilter}
          disabled={!filterInput.trim()}>
          <IconFilter title="Apply filter" className="size-5" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
