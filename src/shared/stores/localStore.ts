import {create} from 'zustand'
import {
  openLocalItems,
  type LocalProgress,
  type OpenedLocalFiles,
} from '@/shared/api/local/openLocalFiles'
import type {FoundCallback, LocalItem} from '@/shared/api/local/readLocalInput'
import {addRecentLocal} from '@/shared/api/local/recentLocal'

/** Reads what the user chose; reports images found while reading folders */
export type LocalItemsReader = (onFound: FoundCallback) => Promise<LocalItem[]>

interface LocalStore {
  /** The files last opened from this device; gone after a reload */
  opened: OpenedLocalFiles | null
  status: 'idle' | 'opening' | 'error'
  progress: LocalProgress | null
  /** Why the last opening failed; what was open before stays open */
  error: string | null
  dismissError: () => void
  /**
   * Open files from this device, replacing what was open. With handles, the
   * opening is remembered so it can be reopened after a reload.
   */
  open: (
    read: LocalItemsReader,
    handles?: Promise<FileSystemHandle[]> | FileSystemHandle[],
  ) => Promise<void>
}

/** The opening in progress, so a newer one can cancel it */
let currentOpening: AbortController | null = null

export const useLocalStore = create<LocalStore>(set => ({
  opened: null,
  status: 'idle',
  progress: null,
  error: null,

  dismissError: () => set({status: 'idle', error: null}),

  open: async (read, handles = []) => {
    currentOpening?.abort()
    const controller = new AbortController()
    currentOpening = controller
    const isCurrent = () => currentOpening === controller

    set({
      status: 'opening',
      error: null,
      progress: {label: 'Reading files', done: 0, total: null},
    })

    try {
      const items = await read(found => {
        if (isCurrent()) {
          set({progress: {label: 'Reading files', done: found, total: null}})
        }
      })
      const opened = await openLocalItems(
        items,
        progress => {
          if (isCurrent()) set({progress})
        },
        controller.signal,
      )
      if (!isCurrent()) return

      set({opened, status: 'idle', progress: null})
      void Promise.resolve(handles).then(resolved =>
        addRecentLocal(opened.source.name, resolved),
      )
    } catch (error) {
      if (!isCurrent()) return
      set({
        status: 'error',
        progress: null,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      if (isCurrent()) currentOpening = null
    }
  },
}))
