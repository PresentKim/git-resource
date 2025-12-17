import {get, set, del} from 'idb-keyval'

interface GithubApiCacheData<T> {
  etag: string
  value: T
  expiredAt: number
}

interface WorkerStorageInterface {
  getItem: (key: string) => Promise<string | null> | (string | null)
  setItem: (key: string, value: string) => Promise<unknown> | unknown
  removeItem: (key: string) => Promise<unknown> | unknown
}

const compactedStorage: WorkerStorageInterface =
  typeof indexedDB === 'undefined'
    ? localStorage
    : {
        getItem: async (k: string) => (await get(k)) ?? null,
        setItem: async (k: string, v: string) => await set(k, v),
        removeItem: async (k: string) => await del(k),
      }

const CACHE_EXPIRY = 1000 * 60 * 60 // 1 hour

class WorkerStorage {
  async getCache<T>(key: string): Promise<GithubApiCacheData<T> | null> {
    try {
      const data = await compactedStorage.getItem(key)
      if (!data) return null

      const cache = JSON.parse(data) as GithubApiCacheData<T>
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
    await compactedStorage.setItem(key, JSON.stringify(cache))
  }

  async removeCache(key: string): Promise<void> {
    await compactedStorage.removeItem(key)
  }
}

export type {GithubApiCacheData}
export {WorkerStorage}
