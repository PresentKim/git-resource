import {create} from 'zustand'

interface SettingsDialogStore {
  open: boolean
  setOpen: (open: boolean) => void
}

/**
 * Open state of the settings dialog, so places other than the header button
 * (e.g. the rate-limit error) can open it.
 */
export const useSettingsDialogStore = create<SettingsDialogStore>(set => ({
  open: false,
  setOpen: open => set({open}),
}))
