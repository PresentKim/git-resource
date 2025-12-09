import {useMemo} from 'react'
import {useRepoStore} from '@/stores/repoStore'
import {isMcmetaFile} from '@/utils'

/**
 * Hook for calculating image counts
 * Returns filtered count and total count (excluding mcmeta files)
 */
export function useImageCount() {
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const imageFiles = useRepoStore(state => state.imageFiles)

  const filteredCount = useMemo(
    () => filteredImageFiles?.length ?? 0,
    [filteredImageFiles],
  )

  const totalCount = useMemo(() => {
    if (!imageFiles) return 0
    return imageFiles.filter(path => !isMcmetaFile(path)).length
  }, [imageFiles])

  return {
    filteredCount,
    totalCount,
  }
}
