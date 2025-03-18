import {useEffect, useRef} from 'react'

import {Filter as FilterIcon, X as XIcon} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'

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
      className={cn(
        'flex justify-end items-center w-full space-x-2',
        className,
      )}
      {...props}>
      <div className="relative flex-1 max-w-lg">
        <Input
          ref={inputRef}
          defaultValue={filter}
          onKeyDown={handleKeyDown}
          type="text"
          placeholder="'keyword' to include, '-keyword' to exclude"
          className="w-full pr-8 peer"
        />
        <Button
          aria-label="Clear filter"
          onClick={handleClearFilter}
          size="icon"
          variant="ghost"
          className="absolute right-0 top-0 h-full px-2 peer-placeholder-shown:hidden">
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
      <Button
        aria-label="Apply filter"
        onClick={handleApplyFilter}
        size="icon"
        variant="outline">
        <FilterIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}
