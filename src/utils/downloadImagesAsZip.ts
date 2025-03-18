import JSZip from 'jszip'
import {saveAs} from 'file-saver'
import {GithubRepo, createRawImageUrl} from './github'

export const downloadImagesAsZip = async (
  repo: GithubRepo,
  imagePaths: string[],
): Promise<void> => {
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
