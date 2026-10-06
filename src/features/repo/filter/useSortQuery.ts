import {parseAsStringLiteral, useQueryState} from 'nuqs'
import {DEFAULT_SORT_MODE, SORT_MODES} from '@/shared/utils/sortImagePaths'

/**
 * Hook for managing the sort order in the URL (?sort=name). The default
 * order is left out of the URL.
 */
export function useSortQuery() {
  const [sort, setSort] = useQueryState(
    'sort',
    parseAsStringLiteral(SORT_MODES).withDefault(DEFAULT_SORT_MODE),
  )
  return {sort, setSort}
}
