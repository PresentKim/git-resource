import {useEffect} from 'react'
import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'
import {useSortQuery} from '@/features/repo/filter/useSortQuery'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for synchronizing filter and sort changes with image list
 */
export function useFilterSync() {
  const {filter} = useFilterQuery()
  const {sort} = useSortQuery()
  const updateFilteredImages = useRepoStore(state => state.updateFilteredImages)
  const imageFiles = useRepoStore(state => state.imageFiles)

  useEffect(() => {
    updateFilteredImages(filter, sort)
  }, [filter, sort, imageFiles, updateFilteredImages])

  return {}
}
