import {useRef, useCallback, useEffect} from 'react'

interface UseImageHistoryProps {
  open: boolean
  currentIndex: number
  onOpenChange: (open: boolean) => void
}

/**
 * Hook for managing browser history for image viewer
 * Handles history push/pop and back button detection
 */
export function useImageHistory({
  open,
  currentIndex,
  onOpenChange,
}: UseImageHistoryProps) {
  const isClosingViaPopStateRef = useRef(false)

  useEffect(() => {
    if (!open) {
      // Reset flag when viewer is closed
      isClosingViaPopStateRef.current = false
      return
    }

    // Push state when viewer opens
    const state = {viewer: true, index: currentIndex}
    window.history.pushState(state, '', window.location.href)

    // Handle popstate (back button)
    const handlePopState = () => {
      // Mark that we're closing via popstate
      isClosingViaPopStateRef.current = true
      // Close the viewer when back button is pressed
      onOpenChange(false)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open, currentIndex, onOpenChange])

  const handleClose = useCallback(() => {
    // Only remove history if we're not closing via popstate
    if (!isClosingViaPopStateRef.current && window.history.state?.viewer) {
      window.history.back()
    } else {
      onOpenChange(false)
    }
  }, [onOpenChange])

  const handleOpenAutoFocus = useCallback(
    (getDialogContent: () => HTMLDivElement | null) => (e: Event) => {
      e.preventDefault()
      const content = getDialogContent()
      if (content) {
        const firstFocusable = content.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) as HTMLElement | null
        if (firstFocusable) {
          firstFocusable.focus({preventScroll: true})
        }
      }
    },
    [],
  )

  return {
    handleClose,
    handleOpenAutoFocus,
    isClosingViaPopStateRef,
  }
}
