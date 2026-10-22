import {useNavigate} from 'react-router-dom'
import {
  itemsFromFileList,
  itemsFromHandles,
  takeDrop,
} from '@/shared/api/local/readLocalInput'
import {
  requestReadAccess,
  type RecentLocal,
} from '@/shared/api/local/recentLocal'
import {useLocalStore, type LocalItemsReader} from '@/shared/stores/localStore'

export const LOCAL_ROUTE = '/local'

/**
 * Ways to open files from this device. Each one goes to the local gallery,
 * which shows the progress, and starts reading.
 */
export function useOpenLocal() {
  const navigate = useNavigate()
  const open = useLocalStore(state => state.open)

  const start = (
    read: LocalItemsReader,
    handles?: Promise<FileSystemHandle[]> | FileSystemHandle[],
  ) => {
    // Without the previous filter, sort or open image of another source
    navigate(LOCAL_ROUTE)
    void open(read, handles)
  }

  return {
    /** Files from an <input type="file">, with or without webkitdirectory */
    openFileList: (files: File[]) => {
      start(async () => itemsFromFileList(files))
    },
    /** Handles from a picker or a launched app */
    openHandles: (handles: FileSystemHandle[]) => {
      start(onFound => itemsFromHandles(handles, onFound), handles)
    },
    /** Call synchronously from the drop handler */
    openDrop: (dataTransfer: DataTransfer) => {
      const drop = takeDrop(dataTransfer)
      start(drop.read, drop.handles)
    },
    /**
     * Open a remembered opening again; call from a click, since the browser
     * may ask for permission. Resolves false if access was not given.
     */
    reopen: async (recent: RecentLocal): Promise<boolean> => {
      if (!(await requestReadAccess(recent.handles))) return false
      start(
        onFound => itemsFromHandles(recent.handles, onFound),
        recent.handles,
      )
      return true
    },
  }
}
