import {useEffect} from 'react'
import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for synchronizing filter changes with image list
 */
export function useFilterSync() {
  const [filter] = useFilterQuery()
  const updateFilteredImages = useRepoStore(state => state.updateFilteredImages)
  const imageFiles = useRepoStore(state => state.imageFiles)

  useEffect(() => {
    updateFilteredImages(filter)
  }, [filter, imageFiles, updateFilteredImages])

  return {}
}
