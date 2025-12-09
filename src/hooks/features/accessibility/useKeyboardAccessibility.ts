import {useCallback} from 'react'

interface UseKeyboardAccessibilityProps {
  onActivate?: () => void
  keys?: string[]
}

/**
 * Hook for handling keyboard accessibility (Enter/Space keys)
 * Can be reused across components that need keyboard activation
 */
export function useKeyboardAccessibility({
  onActivate,
  keys = ['Enter', ' '],
}: UseKeyboardAccessibilityProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (keys.includes(e.key)) {
        e.preventDefault()
        onActivate?.()
      }
    },
    [keys, onActivate],
  )

  return {handleKeyDown}
}
