import {useCallback, useState} from 'react'
import {
  createSpriteImage,
  downloadBlob,
  type SpriteOptions,
} from '@/features/repo/download/utils/createSpriteImage'
import {createRawImageUrl} from '@/shared/utils'
import type {GithubRepo} from '@/shared/utils'

interface UseSpriteDownloadProps {
  repo: GithubRepo
  imagePaths: string[]
  mcmetaPaths?: Set<string>
  animationEnabled?: boolean
  githubToken?: string | null
}

/**
 * Hook for downloading images as a sprite sheet
 * Handles download progress and state management
 */
export function useSpriteDownload({
  repo,
  imagePaths,
  mcmetaPaths,
  animationEnabled,
  githubToken,
}: UseSpriteDownloadProps) {
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = useCallback(
    async (options: SpriteOptions) => {
      if (!imagePaths.length) return

      setIsDownloading(true)
      setDownloadProgress(0)

      try {
        // Create image URLs
        const imageUrls = imagePaths.map(path => createRawImageUrl(repo, path))

        // Create sprite
        const result = await createSpriteImage(
          imageUrls,
          imagePaths,
          {
            ...options,
            repo,
            mcmetaPaths,
            animationEnabled,
            githubToken,
          },
          (loaded, total) => {
            const percent = Math.round((loaded / total) * 100)
            setDownloadProgress(percent)
          },
        )

        // Generate filename
        const filename = `sprite-${repo.owner}-${repo.name}-${Date.now()}.png`

        // Download
        downloadBlob(result.blob, filename)

        setDownloadProgress(100)
        // Briefly show 100%, then reset
        setTimeout(() => {
          setDownloadProgress(null)
          setIsDownloading(false)
        }, 500)
      } catch (error) {
        console.error('Failed to create sprite image:', error)
        setDownloadProgress(null)
        setIsDownloading(false)
        throw error
      }
    },
    [repo, imagePaths, mcmetaPaths, animationEnabled, githubToken],
  )

  return {
    isDownloading,
    downloadProgress,
    handleDownload,
  }
}
