/**
 * Create a sprite image from multiple image URLs
 * Images are arranged in a grid layout
 */

import {
  getMcmetaPath,
  fetchMcmetaData,
  parseMcmeta,
} from '@/shared/utils/mcmeta'
import {createRawImageUrl} from '@/shared/utils/github'
import type {GithubRepo} from '@/shared/utils/github'

export interface SpriteOptions {
  /** Gap between images in pixels */
  gap: number
  /** Background color (CSS color string, e.g., '#ffffff', 'transparent', 'rgba(0,0,0,0)') */
  backgroundColor: string
  /** Number of columns in the grid (0 = auto-calculate) */
  columns?: number
  /** Maximum width for the sprite (0 = no limit) */
  maxWidth?: number
  /** Maximum height for the sprite (0 = no limit) */
  maxHeight?: number
  /** Scale factor for the sprite (1.0 = original size, 2.0 = 2x, etc.) */
  scale?: number
  /** Whether to use image smoothing (false = pixelated, true = smooth interpolation) */
  imageSmoothing?: boolean
}

export interface SpriteResult {
  /** The sprite image as a Blob */
  blob: Blob
  /** Width of the sprite image */
  width: number
  /** Height of the sprite image */
  height: number
  /** Number of columns used */
  columns: number
  /** Number of rows used */
  rows: number
}

/**
 * Get maximum canvas size supported by the browser
 */
function getMaxCanvasSize(): {maxWidth: number; maxHeight: number} {
  // Most browsers have a limit around 32,767px
  // Test actual limit by creating a test canvas
  const testCanvas = document.createElement('canvas')
  const testCtx = testCanvas.getContext('2d')
  if (!testCtx) {
    return {maxWidth: 16384, maxHeight: 16384}
  }

  // Try to find the actual limit (conservative estimate)
  let maxSize = 32767
  try {
    testCanvas.width = maxSize
    testCanvas.height = 1
    if (testCanvas.width !== maxSize) {
      maxSize = 16384
    }
  } catch {
    maxSize = 16384
  }

  return {maxWidth: maxSize, maxHeight: maxSize}
}

/**
 * Load an image from a URL using ImageBitmap for better performance and security
 * Falls back to Image element if ImageBitmap is not supported
 */
async function loadImage(url: string): Promise<{
  image: HTMLImageElement | ImageBitmap
  width: number
  height: number
}> {
  try {
    // Try to use ImageBitmap first (more efficient and avoids blob URL issues)
    if (typeof createImageBitmap !== 'undefined') {
      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image: ${response.status} ${response.statusText}`,
          )
        }

        const blob = await response.blob()
        const imageBitmap = await createImageBitmap(blob)

        return {
          image: imageBitmap,
          width: imageBitmap.width,
          height: imageBitmap.height,
        }
      } catch (bitmapError) {
        // If ImageBitmap fails, fall back to Image element
        console.warn(
          'ImageBitmap failed, falling back to Image element:',
          bitmapError,
        )
      }
    }

    // Fallback: Use Image element with original URL
    // GitHub raw images typically work without CORS issues for canvas operations
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        // Verify image loaded successfully
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          reject(new Error(`Image has invalid dimensions: ${url}`))
          return
        }
        resolve({
          image: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
        })
      }

      img.onerror = () => {
        reject(
          new Error(
            `Failed to load image: ${url}. The image format may not be supported.`,
          ),
        )
      }

      // Use original URL directly - GitHub raw images work fine for canvas
      img.src = url
    })
  } catch (error) {
    throw new Error(
      `Failed to load image: ${url}. ` +
        `${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Calculate optimal grid dimensions
 */
function calculateGridDimensions(
  imageCount: number,
  imageWidths: number[],
  imageHeights: number[],
  gap: number,
  maxWidth: number,
  maxHeight: number,
  preferredColumns?: number,
): {columns: number; rows: number; spriteWidth: number; spriteHeight: number} {
  if (imageCount === 0) {
    return {columns: 0, rows: 0, spriteWidth: 0, spriteHeight: 0}
  }

  // If preferred columns is specified, use it
  if (preferredColumns && preferredColumns > 0) {
    const rows = Math.ceil(imageCount / preferredColumns)
    const maxImageWidth = Math.max(...imageWidths)
    const maxImageHeight = Math.max(...imageHeights)
    const spriteWidth =
      preferredColumns * maxImageWidth + (preferredColumns - 1) * gap
    const spriteHeight = rows * maxImageHeight + (rows - 1) * gap

    // Check if within limits
    if (
      (maxWidth === 0 || spriteWidth <= maxWidth) &&
      (maxHeight === 0 || spriteHeight <= maxHeight)
    ) {
      return {columns: preferredColumns, rows, spriteWidth, spriteHeight}
    }
  }

  // Calculate optimal columns based on image dimensions
  const maxImageWidth = Math.max(...imageWidths)
  const maxImageHeight = Math.max(...imageHeights)

  // Try to find optimal column count
  let bestColumns = Math.ceil(Math.sqrt(imageCount))
  let bestRows = Math.ceil(imageCount / bestColumns)
  let bestWidth = bestColumns * maxImageWidth + (bestColumns - 1) * gap
  let bestHeight = bestRows * maxImageHeight + (bestRows - 1) * gap

  // If we have size limits, adjust
  if (maxWidth > 0 && bestWidth > maxWidth) {
    bestColumns = Math.floor((maxWidth + gap) / (maxImageWidth + gap))
    bestRows = Math.ceil(imageCount / bestColumns)
    bestWidth = bestColumns * maxImageWidth + (bestColumns - 1) * gap
    bestHeight = bestRows * maxImageHeight + (bestRows - 1) * gap
  }

  if (maxHeight > 0 && bestHeight > maxHeight) {
    bestRows = Math.floor((maxHeight + gap) / (maxImageHeight + gap))
    bestColumns = Math.ceil(imageCount / bestRows)
    bestWidth = bestColumns * maxImageWidth + (bestColumns - 1) * gap
    bestHeight = bestRows * maxImageHeight + (bestRows - 1) * gap
  }

  return {
    columns: Math.max(1, bestColumns),
    rows: Math.max(1, bestRows),
    spriteWidth: bestWidth,
    spriteHeight: bestHeight,
  }
}

/**
 * Create a sprite image from multiple image URLs
 * @param imageUrls Array of image URLs
 * @param imagePaths Array of image paths (for detecting animated images)
 * @param options Sprite generation options
 * @param onProgress Progress callback
 */
export async function createSpriteImage(
  imageUrls: string[],
  imagePaths: string[],
  options: SpriteOptions & {
    repo?: GithubRepo
    mcmetaPaths?: Set<string>
    animationEnabled?: boolean
    githubToken?: string | null
  },
  onProgress?: (loaded: number, total: number) => void,
): Promise<SpriteResult> {
  if (imageUrls.length === 0) {
    throw new Error('No images provided')
  }

  if (imageUrls.length !== imagePaths.length) {
    throw new Error('imageUrls and imagePaths must have the same length')
  }

  // Load all images
  const images: (HTMLImageElement | ImageBitmap)[] = []
  const imageWidths: number[] = []
  const imageHeights: number[] = []

  try {
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      const imagePath = imagePaths[i]
      const {image, width, height} = await loadImage(imageUrl)

      // Check if this is an animated image and extract first frame only
      let finalImage = image
      let finalWidth = width
      let finalHeight = height

      // Only process animated images if animation is enabled
      if (
        options.animationEnabled === true &&
        options.repo &&
        options.mcmetaPaths &&
        options.mcmetaPaths.size > 0
      ) {
        const mcmetaPath = getMcmetaPath(imagePath)
        const hasMcmeta = options.mcmetaPaths.has(mcmetaPath)

        if (hasMcmeta) {
          try {
            const mcmetaUrl = createRawImageUrl(options.repo, mcmetaPath)
            const mcmetaData = await fetchMcmetaData(
              mcmetaUrl,
              options.githubToken,
            )

            if (mcmetaData?.animation) {
              const parsedAnimation = parseMcmeta(mcmetaData, width, height)

              if (parsedAnimation && parsedAnimation.frames.length > 0) {
                // Calculate frame dimensions (same logic as AnimatedSprite)
                const frameWidthRatio = parsedAnimation.frameWidth
                const frameSize = frameWidthRatio
                  ? Math.floor(width / frameWidthRatio)
                  : width
                const frameWidthPx = frameSize
                // Frame height defaults to frame width (square frames)
                const frameHeightPx = frameSize

                // Get first frame index (frames are stored vertically)
                const firstFrame = parsedAnimation.frames[0]
                const firstFrameIndex = firstFrame?.index ?? 0

                // Calculate Y position of first frame (frames are stacked vertically)
                // Each frame is positioned at frameIndex * frameHeightPx from the top
                const sourceY = firstFrameIndex * frameHeightPx

                // Extract first frame
                if (image instanceof ImageBitmap) {
                  // Create a new ImageBitmap with just the first frame
                  const extractedFrame = await createImageBitmap(
                    image,
                    0,
                    sourceY,
                    frameWidthPx,
                    frameHeightPx,
                  )
                  image.close() // Close the original
                  finalImage = extractedFrame
                  finalWidth = frameWidthPx
                  finalHeight = frameHeightPx
                } else {
                  // For HTMLImageElement, create a canvas and draw the first frame
                  const canvas = document.createElement('canvas')
                  canvas.width = frameWidthPx
                  canvas.height = frameHeightPx
                  const ctx = canvas.getContext('2d')
                  if (ctx) {
                    // Draw first frame from sprite sheet
                    // Source: (0, sourceY, frameWidthPx, frameHeightPx) from image
                    // Destination: (0, 0, frameWidthPx, frameHeightPx) on canvas
                    ctx.drawImage(
                      image,
                      0,
                      sourceY,
                      frameWidthPx,
                      frameHeightPx,
                      0,
                      0,
                      frameWidthPx,
                      frameHeightPx,
                    )
                    const blob = await new Promise<Blob>((resolve, reject) => {
                      canvas.toBlob(blob => {
                        if (blob) resolve(blob)
                        else reject(new Error('Failed to create blob'))
                      }, 'image/png')
                    })
                    const extractedFrame = await createImageBitmap(blob)
                    finalImage = extractedFrame
                    finalWidth = frameWidthPx
                    finalHeight = frameHeightPx
                  }
                }
              }
            }
          } catch (error) {
            // If mcmeta loading fails, use the full image
            console.warn('Failed to load mcmeta for animated image:', error)
          }
        }
      }

      images.push(finalImage)
      imageWidths.push(finalWidth)
      imageHeights.push(finalHeight)
      onProgress?.(i + 1, imageUrls.length)
    }
  } catch (error) {
    // Cleanup ImageBitmaps on error
    images.forEach(img => {
      if (img instanceof ImageBitmap) {
        img.close()
      }
    })
    throw error
  }

  // Calculate grid dimensions
  let {columns, rows, spriteWidth, spriteHeight} = calculateGridDimensions(
    images.length,
    imageWidths,
    imageHeights,
    options.gap,
    options.maxWidth || 0,
    options.maxHeight || 0,
    options.columns,
  )

  // Check browser canvas size limits
  const {maxWidth: maxCanvasWidth, maxHeight: maxCanvasHeight} =
    getMaxCanvasSize()

  // Adjust dimensions if they exceed browser limits
  if (spriteWidth > maxCanvasWidth || spriteHeight > maxCanvasHeight) {
    // Recalculate with browser limits
    const adjustedMaxWidth = Math.min(
      options.maxWidth || maxCanvasWidth,
      maxCanvasWidth,
    )
    const adjustedMaxHeight = Math.min(
      options.maxHeight || maxCanvasHeight,
      maxCanvasHeight,
    )

    const adjusted = calculateGridDimensions(
      images.length,
      imageWidths,
      imageHeights,
      options.gap,
      adjustedMaxWidth,
      adjustedMaxHeight,
      options.columns,
    )

    columns = adjusted.columns
    rows = adjusted.rows
    spriteWidth = adjusted.spriteWidth
    spriteHeight = adjusted.spriteHeight

    if (spriteWidth > maxCanvasWidth || spriteHeight > maxCanvasHeight) {
      throw new Error(
        `Sprite image would be too large (${spriteWidth}x${spriteHeight}px). ` +
          `Maximum supported size is ${maxCanvasWidth}x${maxCanvasHeight}px. ` +
          `Try reducing the number of images or using smaller images.`,
      )
    }
  }

  // Apply scale factor
  const scale = options.scale || 1.0
  const scaledWidth = Math.round(spriteWidth * scale)
  const scaledHeight = Math.round(spriteHeight * scale)

  // Validate dimensions
  if (scaledWidth <= 0 || scaledHeight <= 0) {
    throw new Error(
      `Invalid sprite dimensions: ${scaledWidth}x${scaledHeight}px`,
    )
  }

  // Create canvas
  const canvas = document.createElement('canvas')

  try {
    canvas.width = scaledWidth
    canvas.height = scaledHeight
  } catch {
    throw new Error(
      `Failed to create canvas with dimensions ${scaledWidth}x${scaledHeight}px. ` +
        `This may exceed browser limits.`,
    )
  }

  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error(
      'Failed to get canvas context. Your browser may not support canvas.',
    )
  }

  // Set image smoothing based on options (false = pixelated, true = smooth)
  // Default to pixelated (false) if scale is 1.0, otherwise use the option value
  const imageSmoothing =
    options.imageSmoothing ?? (scale === 1.0 ? false : true)
  ctx.imageSmoothingEnabled = imageSmoothing

  // Fill background
  if (options.backgroundColor !== 'transparent') {
    ctx.fillStyle = options.backgroundColor
    ctx.fillRect(0, 0, scaledWidth, scaledHeight)
  }

  // Draw images
  const maxImageWidth = Math.max(...imageWidths)
  const maxImageHeight = Math.max(...imageHeights)

  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    const col = i % columns
    const row = Math.floor(i / columns)

    const x = col * (maxImageWidth + options.gap)
    const y = row * (maxImageHeight + options.gap)

    // Get image dimensions (ImageBitmap uses width/height, HTMLImageElement uses naturalWidth/naturalHeight)
    const imgWidth = img instanceof ImageBitmap ? img.width : img.naturalWidth
    const imgHeight =
      img instanceof ImageBitmap ? img.height : img.naturalHeight

    // Center the image in its cell if it's smaller than max size
    const offsetX = (maxImageWidth - imgWidth) / 2
    const offsetY = (maxImageHeight - imgHeight) / 2

    // Draw with scale
    if (scale !== 1.0) {
      ctx.save()
      ctx.scale(scale, scale)
      ctx.drawImage(img, x + offsetX, y + offsetY)
      ctx.restore()
    } else {
      ctx.drawImage(img, x + offsetX, y + offsetY)
    }
  }

  // Convert to blob
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        blob => {
          // Cleanup ImageBitmaps after canvas operations
          images.forEach(img => {
            if (img instanceof ImageBitmap) {
              img.close()
            }
          })

          if (!blob) {
            reject(
              new Error(
                `Failed to create sprite image blob. ` +
                  `Canvas size: ${scaledWidth}x${scaledHeight}px. ` +
                  `This may be due to browser memory limits or canvas size restrictions. ` +
                  `Try reducing the number of images or their sizes.`,
              ),
            )
            return
          }
          resolve({
            blob,
            width: scaledWidth,
            height: scaledHeight,
            columns,
            rows,
          })
        },
        'image/png',
        1.0,
      )
    } catch (error) {
      // Cleanup ImageBitmaps on error
      images.forEach(img => {
        if (img instanceof ImageBitmap) {
          img.close()
        }
      })

      reject(
        new Error(
          `Failed to convert canvas to blob: ${error instanceof Error ? error.message : String(error)}. ` +
            `Canvas size: ${scaledWidth}x${scaledHeight}px.`,
        ),
      )
    }
  })
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
