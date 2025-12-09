const objectUrlCache = new Map<string, Promise<string>>()

/**
 * Fetch image once and reuse as object URL to avoid repeated network fetch/decoding.
 * Returns the cached object URL or the original URL if fetch fails.
 */
export async function getCachedObjectUrl(src: string): Promise<string> {
  if (!src) return src

  const existing = objectUrlCache.get(src)
  if (existing) {
    return existing
  }

  const promise = fetch(src)
    .then(async res => {
      if (!res.ok) {
        throw new Error(`Failed to fetch image: ${res.status}`)
      }
      const blob = await res.blob()
      return URL.createObjectURL(blob)
    })
    .catch(() => src)

  objectUrlCache.set(src, promise)
  return promise
}

export function clearImageCache() {
  objectUrlCache.clear()
}

