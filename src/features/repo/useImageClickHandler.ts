import {useCallback} from 'react'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook providing a single, stable handler for opening the image viewer.
 * Cells call it with their own index, so no per-cell closures are needed.
 */
export function useImageClickHandler() {
  const setViewerState = useRepoStore(state => state.setViewerState)

  const handleImageClick = useCallback(
    (index: number) => {
      setViewerState({open: true, currentIndex: index})
    },
    [setViewerState],
  )

  return {handleImageClick}
}
