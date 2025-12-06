import {GithubRepo, createRawImageUrl} from './github'
import type JSZip from 'jszip'

// Constants
const LARGE_DOWNLOAD_THRESHOLD = 2000
const BATCH_SIZE = 50

/**
 * Download a single image and add it to the zip
 */
async function downloadImageToZip(
  zip: JSZip,
  repo: GithubRepo,
  imagePath: string,
): Promise<void> {
  try {
    const url = createRawImageUrl(repo, imagePath)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${imagePath}: ${response.status} ${response.statusText}`,
      )
    }

    const blob = await response.blob()
    zip.file(imagePath, blob)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    console.error(`Failed to download ${imagePath}:`, errorMessage)
    throw error
  }
}

/**
 * Process a batch of images
 */
async function processBatch(
  zip: JSZip,
  repo: GithubRepo,
  batch: string[],
  currentCompleted: number,
  total: number,
  onProgress?: (completed: number, total: number) => void,
): Promise<number> {
  const results = await Promise.allSettled(
    batch.map(imagePath => downloadImageToZip(zip, repo, imagePath)),
  )

  let newCompleted = currentCompleted
  for (const result of results) {
    newCompleted += 1
    onProgress?.(newCompleted, total)

    if (result.status === 'rejected') {
      // Error already logged in downloadImageToZip
      // Continue with other images
    }
  }

  return newCompleted
}

/**
 * Dynamically import jszip and file-saver only when needed
 * This reduces initial bundle size significantly
 */
export const downloadImagesAsZip = async (
  repo: GithubRepo,
  imagePaths: string[],
  onProgress?: (completed: number, total: number) => void,
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
    const errorMessage =
      error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to create zip file: ${errorMessage}`)
  }
}
