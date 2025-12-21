import {useQueryState} from 'nuqs'

/**
 * Hook for managing filter query state.
 */
export function useFilterQuery() {
  const [filter, setFilter] = useQueryState('filter', {defaultValue: ''})
  return {filter, setFilter}
}
