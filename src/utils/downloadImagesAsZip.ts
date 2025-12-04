import {GithubRepo, createRawImageUrl} from './github'

/**
 * Dynamically import jszip and file-saver only when needed
 * This reduces initial bundle size significantly
 */
export const downloadImagesAsZip = async (
  repo: GithubRepo,
  imagePaths: string[],
): Promise<void> => {
  if (!imagePaths.length) return

  // Simple safety guard for very large downloads
  const LARGE_DOWNLOAD_THRESHOLD = 2000
  if (
    imagePaths.length > LARGE_DOWNLOAD_THRESHOLD &&
    typeof window !== 'undefined'
  ) {
    const confirmed = window.confirm(
      `You are about to download ${imagePaths.length.toLocaleString()} images.\n` +
        'This may take a long time and use a lot of memory. Continue?',
    )
    if (!confirmed) return
  }

  // Dynamic import - only load when download is triggered
  const [{default: JSZip}, {saveAs}] = await Promise.all([
    import('jszip'),
    import('file-saver'),
  ])

  const zip = new JSZip()

  // Limit concurrent fetches to avoid overwhelming network/CPU
  const BATCH_SIZE = 50

  for (let i = 0; i < imagePaths.length; i += BATCH_SIZE) {
    const batch = imagePaths.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async imagePath => {
        try {
          const response = await fetch(createRawImageUrl(repo, imagePath))
          const blob = await response.blob()
          zip.file(imagePath, blob)
        } catch (error) {
          console.error(`Failed to download ${imagePath}:`, error)
        }
      }),
    )

    // Yield back to the event loop between batches to keep the UI responsive
    await new Promise(requestAnimationFrame)
  }

  const content = await zip.generateAsync({type: 'blob'})
  saveAs(content, `${repo.owner}-${repo.name}.zip`)
}
