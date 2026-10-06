import {useCallback} from 'react'
import {useRepoStore} from '@/shared/stores/repoStore'
import {openViewer} from '@/features/repo/viewer/viewerRoute'

/**
 * Hook providing a single, stable handler for opening the image viewer.
 * Cells call it with their own index, so no per-cell closures are needed.
 */
export function useImageClickHandler() {
  const handleImageClick = useCallback((index: number) => {
    const path = useRepoStore.getState().filteredImageFiles?.[index]
    if (path) openViewer(path)
  }, [])

  return {handleImageClick}
}
