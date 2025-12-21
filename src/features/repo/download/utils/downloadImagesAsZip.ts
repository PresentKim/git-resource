import type JSZip from 'jszip'
import {
  GithubRepo,
  createRawImageUrl,
  type FlattenMode,
  resolveDuplicatePaths,
} from '@/shared/utils'

// Constants
const LARGE_DOWNLOAD_THRESHOLD = 2000
const BATCH_SIZE = 50
const MAX_CONCURRENT_DOWNLOADS = 4 // Limit concurrent downloads to reduce memory usage

/**
 * Download a single image and add it to the zip with a specific path
 */
async function downloadImageToZip(
  zip: JSZip,
  repo: GithubRepo,
  originalPath: string,
  zipPath: string,
): Promise<void> {
  try {
    const url = createRawImageUrl(repo, originalPath)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${originalPath}: ${response.status} ${response.statusText}`,
      )
    }

    const blob = await response.blob()
    zip.file(zipPath, blob)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Failed to download ${originalPath}:`, errorMessage)
    throw error
  }
}

/**
 * Process images with concurrency limit to reduce memory usage
 * Uses a promise pool pattern to limit simultaneous downloads
 */
async function processWithConcurrencyLimit(
  zip: JSZip,
  repo: GithubRepo,
  imagePaths: string[],
  pathMap: Map<string, string>,
  onProgress?: (completed: number, total: number) => void,
): Promise<void> {
  let completed = 0
  const total = imagePaths.length
  const queue: Array<() => Promise<void>> = []

  // Create a queue of download tasks
  for (const originalPath of imagePaths) {
    const zipPath = pathMap.get(originalPath) || originalPath
    queue.push(async () => {
      try {
        await downloadImageToZip(zip, repo, originalPath, zipPath)
      } catch {
        // Error already logged in downloadImageToZip
        // Continue with other images
      } finally {
        completed += 1
        onProgress?.(completed, total)
      }
    })
  }

  // Process queue with concurrency limit
  const workers: Promise<void>[] = []
  let queueIndex = 0

  // Start initial workers up to the concurrency limit
  for (let i = 0; i < Math.min(MAX_CONCURRENT_DOWNLOADS, queue.length); i++) {
    workers.push(
      (async () => {
        while (queueIndex < queue.length) {
          const task = queue[queueIndex++]
          await task()
          // Yield to event loop periodically to keep UI responsive
          if (queueIndex % 10 === 0) {
            await new Promise(resolve => requestAnimationFrame(resolve))
          }
        }
      })(),
    )
  }

  // Wait for all workers to complete
  await Promise.all(workers)
}

/**
 * Process a batch of images (kept for backward compatibility, but uses concurrency limit internally)
 */
async function processBatch(
  zip: JSZip,
  repo: GithubRepo,
  batch: string[],
  pathMap: Map<string, string>,
  currentCompleted: number,
  total: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<number> {
  await processWithConcurrencyLimit(zip, repo, batch, pathMap, completed => {
    // Adjust progress to account for current batch offset
    onProgress?.(currentCompleted + completed, total)
  })

  return currentCompleted + batch.length
}

/**
 * Dynamically import jszip and file-saver only when needed
 * This reduces initial bundle size significantly
 */
export const downloadImagesAsZip = async (
  repo: GithubRepo,
  imagePaths: string[],
  onProgress?: (completed: number, total: number) => void,
  flattenMode: FlattenMode = 'original',
): Promise<void> => {
  if (!imagePaths.length) {
    throw new Error('No images to download')
  }

  // Simple safety guard for very large downloads
  if (
    imagePaths.length > LARGE_DOWNLOAD_THRESHOLD &&
    typeof window !== 'undefined'
  ) {
    const confirmed = window.confirm(
      `You are about to download ${imagePaths.length.toLocaleString()} images.\n` +
        'This may take a long time and use a lot of memory. Continue?',
    )
    if (!confirmed) {
      throw new Error('Download cancelled by user')
    }
  }

  // Resolve path transformations and duplicates
  const pathMap = resolveDuplicatePaths(imagePaths, flattenMode)

  // Dynamic import - only load when download is triggered
  let JSZipClass: typeof JSZip
  let saveAs: typeof import('file-saver').saveAs

  try {
    const [jszipModule, fileSaverModule] = await Promise.all([
      import('jszip'),
      import('file-saver'),
    ])
    JSZipClass = jszipModule.default
    saveAs = fileSaverModule.saveAs
  } catch (error) {
    throw new Error(
      `Failed to load required libraries: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }

  const zip = new JSZipClass()
  const total = imagePaths.length
  let completed = 0

  try {
    // Process images in batches
    for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
      const batch = imagePaths.slice(i, i + BATCH_SIZE)
      completed = await processBatch(
        zip,
        repo,
        batch,
        pathMap,
        completed,
        total,
        onProgress,
      )

      // Yield back to the event loop between batches to keep the UI responsive
      await new Promise(resolve => requestAnimationFrame(resolve))
    }

    // Generate and save the zip file
    const content = await zip.generateAsync({type: 'blob'})
    const fileName = `${repo.owner}-${repo.name}.zip`
    saveAs(content, fileName)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create zip file: ${errorMessage}`)
  }
}
