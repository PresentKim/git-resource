import {isImageTreePath} from '@/shared/utils/imageFiles'

/** A file inside an opened folder, with its path below that folder */
export interface LocalFolderFile {
  path: string
  file: File
}

/**
 * Something opened from this device, before its images are listed: a folder
 * (only its images and .mcmeta files are kept), or a single file (an image,
 * or a .zip/.jar archive that is unpacked later)
 */
export type LocalItem =
  | {kind: 'directory'; name: string; files: LocalFolderFile[]}
  | {kind: 'file'; name: string; file: File}

/** Called with the number of images found so far while folders are read */
export type FoundCallback = (found: number) => void

const ARCHIVE_NAME_REGEX = /\.(zip|jar)$/i

/** Archives that are unpacked when opened (a .jar is a zip) */
export function isArchiveName(name: string): boolean {
  return ARCHIVE_NAME_REGEX.test(name)
}

/** Whether a file opened on its own can be shown */
export function isOpenableFileName(name: string): boolean {
  return isArchiveName(name) || isImageTreePath(name)
}

/**
 * Items from a file input: a folder input gives every file with its path
 * from the chosen folder (webkitRelativePath), a file input loose files
 */
export function itemsFromFileList(files: Iterable<File>): LocalItem[] {
  const folders = new Map<string, LocalFolderFile[]>()
  const looseFiles: LocalItem[] = []

  for (const file of files) {
    const relativePath = file.webkitRelativePath
    const slash = relativePath.indexOf('/')
    if (slash === -1) {
      if (isOpenableFileName(file.name)) {
        looseFiles.push({kind: 'file', name: file.name, file})
      }
      continue
    }

    const folderName = relativePath.slice(0, slash)
    const path = relativePath.slice(slash + 1)
    if (!isImageTreePath(path)) continue
    let folder = folders.get(folderName)
    if (!folder) {
      folder = []
      folders.set(folderName, folder)
    }
    folder.push({path, file})
  }

  const items: LocalItem[] = []
  for (const [name, folderFiles] of folders) {
    items.push({kind: 'directory', name, files: folderFiles})
  }
  return [...items, ...looseFiles]
}

function readEntries(
  reader: FileSystemDirectoryReader,
): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject))
}

function getEntryFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject))
}

/** Every image below a dropped folder (the old, widely supported API) */
async function readDirectoryEntry(
  directory: FileSystemDirectoryEntry,
  prefix: string,
  out: LocalFolderFile[],
  onFound?: FoundCallback,
): Promise<void> {
  const reader = directory.createReader()
  // readEntries answers in batches until it returns an empty one
  for (;;) {
    const batch = await readEntries(reader)
    if (!batch.length) return

    await Promise.all(
      batch.map(async entry => {
        const path = `${prefix}${entry.name}`
        if (entry.isDirectory) {
          await readDirectoryEntry(
            entry as FileSystemDirectoryEntry,
            `${path}/`,
            out,
            onFound,
          )
        } else if (isImageTreePath(path)) {
          out.push({
            path,
            file: await getEntryFile(entry as FileSystemFileEntry),
          })
          onFound?.(out.length)
        }
      }),
    )
  }
}

/** Every image below a folder handle (File System Access API) */
async function readDirectoryHandle(
  directory: FileSystemDirectoryHandle,
  prefix: string,
  out: LocalFolderFile[],
  onFound?: FoundCallback,
): Promise<void> {
  const pending: Promise<void>[] = []
  for await (const [name, handle] of directory.entries()) {
    const path = `${prefix}${name}`
    if (handle.kind === 'directory') {
      pending.push(readDirectoryHandle(handle, `${path}/`, out, onFound))
    } else if (isImageTreePath(path)) {
      pending.push(
        handle.getFile().then(file => {
          out.push({path, file})
          onFound?.(out.length)
        }),
      )
    }
  }
  await Promise.all(pending)
}

/** Items from handles: a folder picker, a file picker or a launched app */
export async function itemsFromHandles(
  handles: readonly FileSystemHandle[],
  onFound?: FoundCallback,
): Promise<LocalItem[]> {
  const items: LocalItem[] = []
  let found = 0
  for (const handle of handles) {
    if (handle.kind === 'directory') {
      const files: LocalFolderFile[] = []
      await readDirectoryHandle(
        handle as FileSystemDirectoryHandle,
        '',
        files,
        count => onFound?.(found + count),
      )
      found += files.length
      items.push({kind: 'directory', name: handle.name, files})
    } else if (isOpenableFileName(handle.name)) {
      const file = await (handle as FileSystemFileHandle).getFile()
      items.push({kind: 'file', name: handle.name, file})
    }
  }
  return items
}

/** What a drop holds: its items, and handles to reopen it later if any */
export interface DroppedInput {
  read: (onFound?: FoundCallback) => Promise<LocalItem[]>
  /** Empty where the browser gives no handles for dropped files */
  handles: Promise<FileSystemHandle[]>
}

/**
 * Take what was dropped. Must run synchronously in the drop handler: the
 * browser empties the DataTransfer once the event is over, so the entries
 * and handles are taken here and read afterwards.
 */
export function takeDrop(dataTransfer: DataTransfer): DroppedInput {
  const entries: FileSystemEntry[] = []
  const handlePromises: Promise<FileSystemHandle | null>[] = []

  for (const item of dataTransfer.items) {
    if (item.kind !== 'file') continue
    if (item.getAsFileSystemHandle) {
      handlePromises.push(item.getAsFileSystemHandle().catch(() => null))
    }
    const entry = item.webkitGetAsEntry()
    if (entry) entries.push(entry)
  }
  // Without entry support, the dropped files are still there
  const looseFiles = entries.length ? [] : [...dataTransfer.files]

  return {
    read: async onFound => {
      if (looseFiles.length) return itemsFromFileList(looseFiles)

      const items: LocalItem[] = []
      let found = 0
      for (const entry of entries) {
        if (entry.isDirectory) {
          const files: LocalFolderFile[] = []
          await readDirectoryEntry(
            entry as FileSystemDirectoryEntry,
            '',
            files,
            count => onFound?.(found + count),
          )
          found += files.length
          items.push({kind: 'directory', name: entry.name, files})
        } else if (isOpenableFileName(entry.name)) {
          const file = await getEntryFile(entry as FileSystemFileEntry)
          items.push({kind: 'file', name: entry.name, file})
        }
      }
      return items
    },
    handles: Promise.all(handlePromises).then(handles =>
      handles.filter(handle => handle !== null),
    ),
  }
}
