import {useQueryState} from 'nuqs'

export function useFilterQuery() {
  return useQueryState('filter', {defaultValue: ''})
}
