import type JSZip from 'jszip'
import {
  GithubRepo,
  createRawImageUrl,
  type FlattenMode,
  resolveDuplicatePaths,
} from '@/shared/utils'

// Constants
/** Above this many images the UI asks for confirmation before downloading */
export const LARGE_DOWNLOAD_THRESHOLD = 2000
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
  failures: string[],
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
        // Already logged in downloadImageToZip; remember it so the caller
        // can report it, and continue with the other images
        failures.push(originalPath)
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
  failures: string[],
  currentCompleted: number,
  total: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<number> {
  await processWithConcurrencyLimit(
    zip,
    repo,
    batch,
    pathMap,
    failures,
    completed => {
      // Adjust progress to account for current batch offset
      onProgress?.(currentCompleted + completed, total)
    },
  )

  return currentCompleted + batch.length
}

/** Every requested image failed, so there is nothing worth saving */
class NothingDownloadedError extends Error {}

export interface ZipDownloadResult {
  total: number
  /** Original paths of images that could not be fetched */
  failed: string[]
}

/**
 * Dynamically import jszip and file-saver only when needed
 * This reduces initial bundle size significantly
 *
 * Images that fail to download are skipped and reported in the result. If
 * none could be downloaded, it throws instead of saving an empty ZIP.
 */
export const downloadImagesAsZip = async (
  repo: GithubRepo,
  imagePaths: string[],
  onProgress?: (completed: number, total: number) => void,
  flattenMode: FlattenMode = 'original',
): Promise<ZipDownloadResult> => {
  if (!imagePaths.length) {
    throw new Error('No images to download')
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
      {cause: error},
    )
  }

  const zip = new JSZipClass()
  const total = imagePaths.length
  const failures: string[] = []
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
        failures,
        completed,
        total,
        onProgress,
      )

      // Yield back to the event loop between batches to keep the UI responsive
      await new Promise(resolve => requestAnimationFrame(resolve))
    }

    if (failures.length === total) {
      throw new NothingDownloadedError(
        `None of the ${total.toLocaleString()} images could be downloaded`,
      )
    }

    // Generate and save the zip file
    const content = await zip.generateAsync({type: 'blob'})
    const fileName = `${repo.owner}-${repo.name}.zip`
    saveAs(content, fileName)
    return {total, failed: failures}
  } catch (error) {
    if (error instanceof NothingDownloadedError) throw error
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create zip file: ${errorMessage}`, {
      cause: error,
    })
  }
}
