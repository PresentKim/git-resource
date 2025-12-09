import {useState, useCallback} from 'react'
import {useScrollLock} from '@/hooks/useScrollLock'

interface UseSettingsDialogProps {
  onOpen?: () => void
  onClose?: () => void
}

/**
 * Hook for managing settings dialog state
 * Handles dialog open/close and scroll lock
 */
export function useSettingsDialog({
  onOpen,
  onClose,
}: UseSettingsDialogProps = {}) {
  const [isOpen, setIsOpen] = useState(false)

  // Lock background scroll while the settings dialog is open
  useScrollLock(isOpen)

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      if (open) {
        onOpen?.()
      } else {
        onClose?.()
      }
    },
    [onOpen, onClose],
  )

  return {
    isOpen,
    handleOpenChange,
  }
}
