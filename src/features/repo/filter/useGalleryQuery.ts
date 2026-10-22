import {
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from 'nuqs'
import {CHANGE_FILTERS} from '@/shared/utils/galleryQuery'

/**
 * Hook for the duplicates view in the URL (?duplicates=true): only images
 * that have an identical copy are shown, grouped together
 */
export function useDuplicatesQuery() {
  const [duplicates, setDuplicates] = useQueryState(
    'duplicates',
    parseAsBoolean.withDefault(false),
  )
  return {duplicates, setDuplicates}
}

/**
 * Hook for comparing with another ref in the URL (?compare=v1.0), and for
 * the kind of changes shown (?changes=added). Both are left out by default.
 */
export function useCompareQuery() {
  const [compareRef, setCompareRef] = useQueryState('compare', parseAsString)
  const [changes, setChanges] = useQueryState(
    'changes',
    parseAsStringLiteral(CHANGE_FILTERS).withDefault('all'),
  )
  return {compareRef, setCompareRef, changes, setChanges}
}
