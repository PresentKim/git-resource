import {useCallback} from 'react'

interface UseImageNavigationProps {
  currentIndex: number
  totalImages: number
  onIndexChange?: (index: number) => void
  onNavigate?: () => void
}

/**
 * Hook for managing image navigation (previous/next)
 * Handles navigation logic and state updates
 */
export function useImageNavigation({
  currentIndex,
  totalImages,
  onIndexChange,
  onNavigate,
}: UseImageNavigationProps) {
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < totalImages - 1

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      const newIndex = currentIndex - 1
      onIndexChange?.(newIndex)
      onNavigate?.()
    }
  }, [currentIndex, hasPrevious, onIndexChange, onNavigate])

  const handleNext = useCallback(() => {
    if (hasNext) {
      const newIndex = currentIndex + 1
      onIndexChange?.(newIndex)
      onNavigate?.()
    }
  }, [currentIndex, hasNext, onIndexChange, onNavigate])

  return {
    hasPrevious,
    hasNext,
    handlePrevious,
    handleNext,
  }
}
