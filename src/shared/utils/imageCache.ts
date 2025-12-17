const objectUrlCache = new Map<string, Promise<string>>()
const metadataCache = new Map<string, {width: number; height: number}>()
const preloadCache = new Map<string, Promise<void>>()

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
  metadataCache.clear()
  preloadCache.clear()
}

export function getCachedImageMetadata(src: string) {
  if (!src) return undefined
  return metadataCache.get(src)
}

export function setCachedImageMetadata(
  src: string,
  dimensions: {width: number; height: number},
) {
  if (!src) return
  metadataCache.set(src, dimensions)
}

/**
 * Preload an image and cache its object URL and dimensions.
 */
export async function preloadImage(src: string) {
  if (!src) return
  if (metadataCache.has(src)) return

  const existing = preloadCache.get(src)
  if (existing) return existing

  const promise = getCachedObjectUrl(src)
    .then(
      url =>
        new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.decoding = 'async'
          img.loading = 'eager'
          img.onload = () => {
            setCachedImageMetadata(src, {
              width: img.naturalWidth,
              height: img.naturalHeight,
            })
            resolve()
          }
          img.onerror = reject
          img.src = url
        }),
    )
    .catch(() => {
      // Ignore preload failures; rendering path will handle errors
    })
    .finally(() => {
      preloadCache.delete(src)
    })

  preloadCache.set(src, promise)
  return promise
}
