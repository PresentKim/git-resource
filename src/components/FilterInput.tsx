import {memo, useCallback, useEffect, useRef, useState} from 'react'

import {Filter as FilterIcon, HelpCircle, X as XIcon} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'

import {useFilterQuery} from '@/hooks/useFilterQuery'
import {cn} from '@/utils'

const FilterHelpPopover = memo(function FilterHelpPopover() {
  return (
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
  )
})

interface FilterInputFieldProps {
  initialValue: string
  onClear: () => void
  onApply: (value: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

const FilterInputField = memo(
  function FilterInputField({
    initialValue,
    onClear,
    onApply,
    inputRef,
  }: FilterInputFieldProps) {
    const [localValue, setLocalValue] = useState(initialValue)

    useEffect(() => {
      setLocalValue(initialValue)
      if (inputRef.current) {
        inputRef.current.value = initialValue
      }
    }, [initialValue, inputRef])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
          const value = inputRef.current?.value || ''
          setLocalValue(value)
          onApply(value)
        }
      },
      [onApply, inputRef],
    )

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value)
      },
      [],
    )

    return (
      <div className="relative flex-1 max-w-lg">
        <Input
          ref={inputRef}
          value={localValue}
          onChange={handleChange}
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
          onClick={onClear}
          size="icon"
          variant="ghost"
          className="absolute right-0 top-0 h-full px-2 peer-placeholder-shown:hidden">
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  },
  (prevProps, nextProps) => {
    return prevProps.initialValue === nextProps.initialValue
  },
)

const FilterApplyButton = memo(function FilterApplyButton({
  onApply,
}: {
  onApply: () => void
}) {
  return (
    <Button
      aria-label="Apply filter"
      onClick={onApply}
      size="icon"
      variant="outline"
      className="shrink-0">
      <FilterIcon className="h-4 w-4" />
    </Button>
  )
})

export const FilterInput = memo(function FilterInput({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const [filter, setFilter] = useFilterQuery()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClearFilter = useCallback(() => {
    setFilter('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [setFilter])

  const handleApplyFilter = useCallback(() => {
    const value = inputRef.current?.value || ''
    if (value !== filter) {
      setFilter(value)
    }
  }, [filter, setFilter])

  const handleInputApply = useCallback(
    (value: string) => {
      if (value !== filter) {
        setFilter(value)
      }
    },
    [filter, setFilter],
  )

  return (
    <div
      className={cn('flex w-full items-center justify-end gap-1.5', className)}
      {...props}>
      <FilterInputField
        initialValue={filter}
        onClear={handleClearFilter}
        onApply={handleInputApply}
        inputRef={inputRef}
      />
      <FilterHelpPopover />
      <FilterApplyButton onApply={handleApplyFilter} />
    </div>
  )
})
