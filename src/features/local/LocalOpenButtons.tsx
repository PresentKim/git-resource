import {useEffect, useRef, useState} from 'react'
import {FileArchive, FolderOpen, History, X} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {
  getRecentLocal,
  removeRecentLocal,
  type RecentLocal,
} from '@/shared/api/local/recentLocal'
import {useOpenLocal} from '@/features/local/useOpenLocal'
import {cn} from '@/shared/utils'

const ARCHIVE_AND_IMAGE_ACCEPT = '.zip,.jar,.png,.jpg,.jpeg,.gif,.webp,.svg'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Buttons that open a folder, or archives and images, from this device. The
 * File System Access pickers are used where they exist, because their
 * handles can be kept to reopen the files later; file inputs elsewhere.
 */
export function LocalOpenButtons({className}: {className?: string}) {
  const {openFileList, openHandles} = useOpenLocal()
  const folderInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openFolder = async () => {
    if (!window.showDirectoryPicker) {
      folderInputRef.current?.click()
      return
    }
    try {
      openHandles([await window.showDirectoryPicker({id: 'local-folder'})])
    } catch (error) {
      if (!isAbortError(error)) folderInputRef.current?.click()
    }
  }

  const openFiles = async () => {
    if (!window.showOpenFilePicker) {
      fileInputRef.current?.click()
      return
    }
    try {
      openHandles(
        await window.showOpenFilePicker({
          id: 'local-files',
          multiple: true,
          types: [
            {
              description: 'Archives and images',
              accept: {
                'application/zip': ['.zip', '.jar'],
                'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
              },
            },
          ],
        }),
      )
    } catch (error) {
      if (!isAbortError(error)) fileInputRef.current?.click()
    }
  }

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    // Choosing the same files again must fire change again
    event.target.value = ''
    if (files.length) openFileList(files)
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="max-sm:h-10"
        onClick={openFolder}>
        <FolderOpen className="size-4" />
        Open folder
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="max-sm:h-10"
        onClick={openFiles}>
        <FileArchive className="size-4" />
        Open .zip, .jar or images
      </Button>
      <input
        ref={folderInputRef}
        type="file"
        // webkitdirectory is not in React's input attributes
        {...{webkitdirectory: ''}}
        multiple
        hidden
        onChange={handleInput}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={ARCHIVE_AND_IMAGE_ACCEPT}
        multiple
        hidden
        onChange={handleInput}
      />
    </div>
  )
}

/**
 * Folders and files opened before that the browser can open again (only
 * where it keeps file handles). Renders nothing when there are none.
 */
export function RecentLocalList({className}: {className?: string}) {
  const {reopen} = useOpenLocal()
  const [recent, setRecent] = useState<RecentLocal[]>([])
  const [denied, setDenied] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void getRecentLocal().then(entries => {
      if (!cancelled) setRecent(entries)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!recent.length) return null

  const forget = (id: string) => {
    setRecent(entries => entries.filter(entry => entry.id !== id))
    void removeRecentLocal(id)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <History className="size-3.5" aria-hidden="true" />
        Opened before on this device
      </p>
      <ul className="flex flex-wrap gap-2">
        {recent.map(entry => (
          <li
            key={entry.id}
            className="flex items-center rounded-md border border-border/60 bg-card/60 text-xs">
            <button
              type="button"
              className="max-w-56 truncate rounded-l-md px-2.5 py-1.5 font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring max-sm:py-2.5"
              title={`Open ${entry.name} again`}
              onClick={async () => {
                setDenied(null)
                if (!(await reopen(entry))) setDenied(entry.name)
              }}>
              {entry.name}
            </button>
            <button
              type="button"
              className="rounded-r-md px-1.5 py-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-sm:py-2.5"
              aria-label={`Forget ${entry.name}`}
              title="Forget"
              onClick={() => forget(entry.id)}>
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {denied && (
        <p role="alert" className="text-xs text-destructive">
          Access to {denied} was not allowed, or it was moved or deleted.
        </p>
      )}
    </div>
  )
}
