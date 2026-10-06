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

    // Listen in the capture phase: arrow keys pressed while focus is inside
    // the dialog never bubble up to window, so a bubble listener missed them
    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, onPrevious, onNext, onClose])

  return {}
}
