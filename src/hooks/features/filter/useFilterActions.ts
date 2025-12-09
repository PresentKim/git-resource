import {useCallback} from 'react'

interface UseFilterActionsProps {
  filter: string
  setFilter: (filter: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}

/**
 * Hook for managing filter actions (apply, clear)
 * Handles filter application and clearing logic
 */
export function useFilterActions({
  filter,
  setFilter,
  inputRef,
}: UseFilterActionsProps) {
  const handleClearFilter = useCallback(() => {
    setFilter('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }, [setFilter, inputRef])

  const handleApplyFilter = useCallback(() => {
    const value = inputRef.current?.value || ''
    if (value !== filter) {
      setFilter(value)
    }
  }, [filter, setFilter, inputRef])

  const handleInputApply = useCallback(
    (value: string) => {
      if (value !== filter) {
        setFilter(value)
      }
    },
    [filter, setFilter],
  )

  return {
    handleClearFilter,
    handleApplyFilter,
    handleInputApply,
  }
}
