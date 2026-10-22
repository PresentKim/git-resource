import {useEffect} from 'react'
import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'
import {useSortQuery} from '@/features/repo/filter/useSortQuery'
import {
  useCompareQuery,
  useDuplicatesQuery,
} from '@/features/repo/filter/useGalleryQuery'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for synchronizing the gallery query in the URL (filter, sort,
 * duplicates, changes) with the image list
 */
export function useFilterSync() {
  const {filter} = useFilterQuery()
  const {sort} = useSortQuery()
  const {duplicates} = useDuplicatesQuery()
  const {changes} = useCompareQuery()
  const updateFilteredImages = useRepoStore(state => state.updateFilteredImages)
  const imageFiles = useRepoStore(state => state.imageFiles)
  const fileMeta = useRepoStore(state => state.fileMeta)
  const comparison = useRepoStore(state => state.comparison)

  useEffect(() => {
    updateFilteredImages({filter, sort, duplicates, changes})
  }, [
    filter,
    sort,
    duplicates,
    changes,
    imageFiles,
    fileMeta,
    comparison,
    updateFilteredImages,
  ])

  return {}
}
