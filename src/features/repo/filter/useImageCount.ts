import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for reading image counts
 * Returns filtered count and total count (excluding mcmeta files)
 */
export function useImageCount() {
  const filteredCount = useRepoStore(
    state => state.filteredImageFiles?.length ?? 0,
  )
  const totalCount = useRepoStore(state => state.totalImageCount)

  return {
    filteredCount,
    totalCount,
  }
}
