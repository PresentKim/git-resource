import {getCachedImageMetadata} from '@/shared/utils/imageCache'
import {createRawImageUrl} from '@/shared/utils/github'
import type {GithubRepo} from '@/shared/utils/github'
import type {SpriteOptions} from './createSpriteImage'
import {
  getMcmetaPath,
  fetchMcmetaData,
  parseMcmeta,
} from '@/shared/utils/mcmeta'

export interface SpriteSizeEstimate {
  width: number
  height: number
  columns: number
  rows: number
  pixelCount: number
  estimatedFileSizeMB: number
  canCalculate: boolean
}

/**
 * Estimate sprite image size before actually creating it
 * Uses cached image metadata when available
 * For animated images, calculates first frame size
 */
export async function estimateSpriteSize(
  repo: GithubRepo,
  imagePaths: string[],
  options: SpriteOptions & {
    mcmetaPaths?: Set<string>
    animationEnabled?: boolean
    githubToken?: string | null
  },
): Promise<SpriteSizeEstimate> {
  if (imagePaths.length === 0) {
    return {
      width: 0,
      height: 0,
      columns: 0,
      rows: 0,
      pixelCount: 0,
      estimatedFileSizeMB: 0,
      canCalculate: false,
    }
  }

  const scale = options.scale || 1.0
  const columns = options.columns || Math.ceil(Math.sqrt(imagePaths.length))
  const rows = Math.ceil(imagePaths.length / columns)

  // Try to get cached image dimensions
  const imageWidths: number[] = []
  const imageHeights: number[] = []
  let allDimensionsAvailable = true

  for (const path of imagePaths) {
    const url = createRawImageUrl(repo, path)
    const metadata = getCachedImageMetadata(url)

    if (metadata) {
      let width = metadata.width
      let height = metadata.height

      // Check if this is an animated image and use first frame size
      if (
        options.animationEnabled === true &&
        options.mcmetaPaths &&
        options.mcmetaPaths.size > 0
      ) {
        const mcmetaPath = getMcmetaPath(path)
        const hasMcmeta = options.mcmetaPaths.has(mcmetaPath)

        if (hasMcmeta) {
          try {
            const mcmetaUrl = createRawImageUrl(repo, mcmetaPath)
            const mcmetaData = await fetchMcmetaData(
              mcmetaUrl,
              options.githubToken,
            )

            if (mcmetaData?.animation) {
              const parsedAnimation = parseMcmeta(mcmetaData, width, height)

              if (parsedAnimation && parsedAnimation.frames.length > 0) {
                // Calculate frame dimensions (same logic as createSpriteImage)
                const frameWidthRatio = parsedAnimation.frameWidth
                const frameSize = frameWidthRatio
                  ? Math.floor(width / frameWidthRatio)
                  : width
                const frameWidthPx = frameSize
                // Frame height defaults to frame width (square frames)
                const frameHeightPx = frameSize

                // Use first frame size instead of full sprite sheet size
                width = frameWidthPx
                height = frameHeightPx
              }
            }
          } catch (error) {
            // If mcmeta loading fails, use the full image size
            console.warn('Failed to load mcmeta for size estimation:', error)
          }
        }
      }

      imageWidths.push(width)
      imageHeights.push(height)
    } else {
      allDimensionsAvailable = false
      // Use placeholder dimensions if not cached
      imageWidths.push(64)
      imageHeights.push(64)
    }
  }

  if (!allDimensionsAvailable) {
    return {
      width: 0,
      height: 0,
      columns,
      rows,
      pixelCount: 0,
      estimatedFileSizeMB: 0,
      canCalculate: false,
    }
  }

  const maxImageWidth = Math.max(...imageWidths)
  const maxImageHeight = Math.max(...imageHeights)

  const baseWidth = columns * maxImageWidth + (columns - 1) * options.gap
  const baseHeight = rows * maxImageHeight + (rows - 1) * options.gap

  const width = Math.round(baseWidth * scale)
  const height = Math.round(baseHeight * scale)
  const pixelCount = width * height

  // Estimate file size (PNG compression varies, but roughly 1-3 bytes per pixel for typical images)
  // Use conservative estimate of 2 bytes per pixel
  const estimatedFileSizeMB = (pixelCount * 2) / (1024 * 1024)

  return {
    width,
    height,
    columns,
    rows,
    pixelCount,
    estimatedFileSizeMB,
    canCalculate: true,
  }
}
