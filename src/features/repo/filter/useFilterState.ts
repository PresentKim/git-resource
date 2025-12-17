import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'

/**
 * Hook for managing filter state
 * Wraps useFilterQuery for consistent filter state management
 */
export function useFilterState() {
  const [filter, setFilter] = useFilterQuery()

  return {
    filter,
    setFilter,
  }
}
