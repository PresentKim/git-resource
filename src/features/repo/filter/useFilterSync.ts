import {useEffect} from 'react'
import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for synchronizing filter changes with image list
 * Updates filtered images when filter changes
 */
export function useFilterSync() {
  const [filter] = useFilterQuery()
  const updateFilteredImages = useRepoStore(state => state.updateFilteredImages)

  useEffect(() => {
    updateFilteredImages(filter)
  }, [filter, updateFilteredImages])

  return {}
}
