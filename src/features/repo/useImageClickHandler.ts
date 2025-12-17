import {useCallback, useRef} from 'react'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for managing image click handlers
 * Provides memoized click handlers for image cells
 */
export function useImageClickHandler() {
  const setViewerState = useRepoStore(state => state.setViewerState)

  const handleImageClick = useCallback(
    (index: number) => {
      setViewerState({open: true, currentIndex: index})
    },
    [setViewerState],
  )

  // Create stable click handlers map to avoid recreating functions
  const clickHandlersRef = useRef<Map<number, () => void>>(new Map())

  const getClickHandler = useCallback(
    (index: number) => {
      if (!clickHandlersRef.current.has(index)) {
        clickHandlersRef.current.set(index, () => handleImageClick(index))
      }
      return clickHandlersRef.current.get(index)!
    },
    [handleImageClick],
  )

  return {
    handleImageClick,
    getClickHandler,
  }
}
