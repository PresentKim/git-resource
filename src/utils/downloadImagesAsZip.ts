import {GithubRepo, createRawImageUrl} from './github'

/**
 * Dynamically import jszip and file-saver only when needed
 * This reduces initial bundle size significantly
 */
export const downloadImagesAsZip = async (
  repo: GithubRepo,
  imagePaths: string[],
): Promise<void> => {
  // Dynamic import - only load when download is triggered
  const [{default: JSZip}, {saveAs}] = await Promise.all([
    import('jszip'),
    import('file-saver'),
  ])

  const zip = new JSZip()

  // Create an array of promises for fetching images
  const downloadPromises = imagePaths.map(async imagePath => {
    try {
      const response = await fetch(createRawImageUrl(repo, imagePath))
      const blob = await response.blob()

      zip.file(imagePath, blob)
    } catch (error) {
      console.error(`Failed to download ${imagePath}:`, error)
    }
  })

  await Promise.all(downloadPromises)
  const content = await zip.generateAsync({type: 'blob'})
  saveAs(content, `${repo.owner}-${repo.name}.zip`)
}
