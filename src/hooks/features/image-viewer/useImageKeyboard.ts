import {useEffect} from 'react'

interface UseImageKeyboardProps {
  onPrevious?: () => void
  onNext?: () => void
  onClose?: () => void
  enabled?: boolean
}

/**
 * Hook for managing keyboard events (arrow keys, escape)
 * Handles navigation and close actions
 */
export function useImageKeyboard({
  onPrevious,
  onNext,
  onClose,
  enabled = true,
}: UseImageKeyboardProps) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        onPrevious?.()
      } else if (e.key === 'ArrowRight') {
        onNext?.()
      } else if (e.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onPrevious, onNext, onClose])

  return {}
}
