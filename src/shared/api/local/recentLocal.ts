import {get, set} from 'idb-keyval'

/**
 * Something opened from this device that can be opened again: the browser
 * keeps file and folder handles in IndexedDB (Chromium only), and asks for
 * permission again when one is reopened.
 */
export interface RecentLocal {
  id: string
  name: string
  handles: FileSystemHandle[]
  openedAt: number
}

const STORAGE_KEY = 'local.recent'
const MAX_RECENT = 6

export async function getRecentLocal(): Promise<RecentLocal[]> {
  try {
    return ((await get(STORAGE_KEY)) as RecentLocal[] | undefined) ?? []
  } catch {
    return []
  }
}

async function isSameOpening(
  a: readonly FileSystemHandle[],
  b: readonly FileSystemHandle[],
): Promise<boolean> {
  if (a.length !== b.length) return false
  const same = await Promise.all(
    a.map((handle, index) => handle.isSameEntry(b[index])),
  )
  return same.every(Boolean)
}

/** Remember an opening; the same files opened again move to the top */
export async function addRecentLocal(
  name: string,
  handles: FileSystemHandle[],
): Promise<void> {
  if (!handles.length) return
  try {
    const recent = await getRecentLocal()
    const others: RecentLocal[] = []
    for (const entry of recent) {
      if (!(await isSameOpening(entry.handles, handles))) others.push(entry)
    }
    await set(
      STORAGE_KEY,
      [
        {id: crypto.randomUUID(), name, handles, openedAt: Date.now()},
        ...others,
      ].slice(0, MAX_RECENT),
    )
  } catch {
    // Not every browser can store handles; reopening is a convenience
  }
}

export async function removeRecentLocal(id: string): Promise<void> {
  try {
    const recent = await getRecentLocal()
    await set(
      STORAGE_KEY,
      recent.filter(entry => entry.id !== id),
    )
  } catch {
    // See addRecentLocal
  }
}

/**
 * Ask for read access to the handles again. Must be called from a click (or
 * another user action), or the browser refuses to ask.
 */
export async function requestReadAccess(
  handles: readonly FileSystemHandle[],
): Promise<boolean> {
  for (const handle of handles) {
    const descriptor = {mode: 'read'} as const
    if ((await handle.queryPermission?.(descriptor)) === 'granted') continue
    if ((await handle.requestPermission?.(descriptor)) !== 'granted') {
      return false
    }
  }
  return true
}
