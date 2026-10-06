import {get, set, del} from 'idb-keyval'

interface GithubApiCacheData<T> {
  etag: string
  value: T
  expiredAt: number
}

interface WorkerStorageInterface {
  getItem: (key: string) => Promise<unknown> | unknown
  setItem: (key: string, value: unknown) => Promise<unknown> | unknown
  removeItem: (key: string) => Promise<unknown> | unknown
}

// IndexedDB stores values with structured clone, so the cache object is
// written and read as-is. Serializing a list of tens of thousands of paths to
// JSON and parsing it back on every load is avoided.
// localStorage only holds strings, so that fallback still uses JSON.
const compactedStorage: WorkerStorageInterface =
  typeof indexedDB === 'undefined'
    ? {
        getItem: (k: string) => localStorage.getItem(k),
        setItem: (k: string, v: unknown) =>
          localStorage.setItem(k, JSON.stringify(v)),
        removeItem: (k: string) => localStorage.removeItem(k),
      }
    : {
        getItem: async (k: string) => (await get(k)) ?? null,
        setItem: async (k: string, v: unknown) => await set(k, v),
        removeItem: async (k: string) => await del(k),
      }

const CACHE_EXPIRY = 1000 * 60 * 60 // 1 hour

function isCacheData<T>(data: unknown): data is GithubApiCacheData<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof (data as GithubApiCacheData<T>).etag === 'string' &&
    typeof (data as GithubApiCacheData<T>).expiredAt === 'number'
  )
}

class WorkerStorage {
  async getCache<T>(key: string): Promise<GithubApiCacheData<T> | null> {
    try {
      const data = await compactedStorage.getItem(key)
      if (data === null || data === undefined || data === '') return null

      // Entries written before structured-clone storage (and the
      // localStorage fallback) are JSON strings
      const cache = typeof data === 'string' ? JSON.parse(data) : data
      if (!isCacheData<T>(cache)) {
        throw new Error('Malformed GitHub API cache entry')
      }
      return cache
    } catch {
      // If cache data is corrupted or parsing fails, clear the key and treat as a cache miss
      try {
        await compactedStorage.removeItem(key)
      } catch {
        // Ignore storage removal errors and still treat as a cache miss
      }
      return null
    }
  }

  async setCache<T>(key: string, etag: string, value: T): Promise<void> {
    const cache: GithubApiCacheData<T> = {
      etag,
      value,
      expiredAt: Date.now() + CACHE_EXPIRY,
    }
    await compactedStorage.setItem(key, cache)
  }

  async removeCache(key: string): Promise<void> {
    await compactedStorage.removeItem(key)
  }
}

export type {GithubApiCacheData}
export {WorkerStorage}
