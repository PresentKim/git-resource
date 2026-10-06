import {useEffect, useEffectEvent} from 'react'
import {useScrollLock} from '@/shared/hooks/useScrollLock'
import {useSettingsDialogStore} from '@/shared/stores/settingsDialogStore'

interface UseSettingsDialogProps {
  onOpen?: () => void
  onClose?: () => void
}

/**
 * Hook for managing settings dialog state
 * Handles dialog open/close and scroll lock. The open state lives in a store
 * so it can also be opened from outside the dialog's own trigger.
 */
export function useSettingsDialog({
  onOpen,
  onClose,
}: UseSettingsDialogProps = {}) {
  const isOpen = useSettingsDialogStore(state => state.open)
  const handleOpenChange = useSettingsDialogStore(state => state.setOpen)

  // Lock background scroll while the settings dialog is open
  useScrollLock(isOpen)

  const notify = useEffectEvent((open: boolean) => {
    if (open) {
      onOpen?.()
    } else {
      onClose?.()
    }
  })
  useEffect(() => {
    notify(isOpen)
  }, [isOpen])

  return {
    isOpen,
    handleOpenChange,
  }
}
