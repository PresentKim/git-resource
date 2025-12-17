/**
 * APNG encoder utility
 * Converts sprite sheet frames to APNG format using UPNG.js
 */

import UPNG from 'upng-js'

export interface APNGFrame {
  imageData: ImageData
  delay: number // Delay in milliseconds
}

// Cache for converted APNG blobs
const apngCache = new Map<string, Promise<string>>()

/**
 * Generate cache key for APNG conversion
 */
function getAPNGCacheKey(
  src: string,
  frameWidthPx: number,
  frameHeightPx: number,
  frames: Array<{index: number; time: number}>,
  interpolate: boolean,
): string {
  const frameData = frames.map(f => `${f.index}:${f.time}`).join(',')
  return `apng:${src}:${frameWidthPx}x${frameHeightPx}:${frameData}:interp=${interpolate ? 1 : 0}`
}

/**
 * Encode frames into APNG format using UPNG.js
 */
export async function encodeAPNG(
  frames: APNGFrame[],
  width: number,
  height: number,
): Promise<Blob> {
  if (frames.length === 0) {
    throw new Error('No frames to encode')
  }

  // Convert ImageData frames to RGBA arrays for UPNG
  const rgbaArrays: ArrayBuffer[] = []
  const delays: number[] = []

  for (const frame of frames) {
    // UPNG expects RGBA data as ArrayBuffer (ImageData.data is Uint8ClampedArray)
    const clampedArray = frame.imageData.data
    const uint8Array = new Uint8Array(
      clampedArray.buffer,
      clampedArray.byteOffset,
      clampedArray.byteLength,
    )
    rgbaArrays.push(uint8Array.buffer)
    delays.push(frame.delay)
  }

  // Encode APNG using UPNG
  const apngBuffer = UPNG.encode(rgbaArrays, width, height, 0, delays)

  // Convert ArrayBuffer to Blob
  return new Blob([apngBuffer], {type: 'image/png'})
}

/**
 * Convert sprite sheet to APNG and cache the result
 */
export async function convertSpriteToAPNG(
  src: string,
  image: HTMLImageElement,
  frameWidthPx: number,
  frameHeightPx: number,
  frames: Array<{index: number; time: number}>,
  interpolate: boolean = false,
): Promise<string> {
  const cacheKey = getAPNGCacheKey(
    src,
    frameWidthPx,
    frameHeightPx,
    frames,
    interpolate,
  )

  // Check cache first
  const cached = apngCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // Extract frames and encode
  const promise = extractSpriteFrames(
    image,
    frameWidthPx,
    frameHeightPx,
    frames,
    interpolate,
  )
    .then(apngFrames => encodeAPNG(apngFrames, frameWidthPx, frameHeightPx))
    .then(blob => URL.createObjectURL(blob))

  apngCache.set(cacheKey, promise)
  return promise
}

/**
 * Extract frames from sprite sheet and mcmeta data
 */
export async function extractSpriteFrames(
  image: HTMLImageElement,
  frameWidthPx: number,
  frameHeightPx: number,
  frames: Array<{index: number; time: number}>,
  interpolate: boolean = false,
): Promise<APNGFrame[]> {
  const canvas = document.createElement('canvas')
  canvas.width = frameWidthPx
  canvas.height = frameHeightPx
  const ctx = canvas.getContext('2d', {willReadFrequently: true})

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  ctx.imageSmoothingEnabled = false

  const apngFrames: APNGFrame[] = []
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]

    // Draw current frame from sprite sheet
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(
      image,
      0,
      frame.index * frameHeightPx,
      frameWidthPx,
      frameHeightPx,
      0,
      0,
      frameWidthPx,
      frameHeightPx,
    )

    // Get base frame image data
    const baseImageData = ctx.getImageData(0, 0, frameWidthPx, frameHeightPx)

    // If interpolation is disabled or frame time is 1, push a single frame
    if (!interpolate || frame.time <= 1) {
      const delay = frame.time * 50 // ms
      apngFrames.push({
        imageData: baseImageData,
        delay,
      })
      continue
    }

    // Interpolation enabled and time > 1: generate intermediate frames between current and next frame
    const nextFrame = frames[(i + 1) % frames.length]

    // Draw next frame to get its image data
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(
      image,
      0,
      nextFrame.index * frameHeightPx,
      frameWidthPx,
      frameHeightPx,
      0,
      0,
      frameWidthPx,
      frameHeightPx,
    )
    const nextImageData = ctx.getImageData(0, 0, frameWidthPx, frameHeightPx)

    const pixelCount = frameWidthPx * frameHeightPx * 4

    // frame.time ticks → generate that many sub-frames of 50ms each
    for (let t = 0; t < frame.time; t++) {
      const delta = t / frame.time
      const blended = new ImageData(frameWidthPx, frameHeightPx)
      const srcA = baseImageData.data
      const srcB = nextImageData.data
      const dst = blended.data

      for (let p = 0; p < pixelCount; p++) {
        dst[p] = srcA[p] + (srcB[p] - srcA[p]) * delta
      }

      apngFrames.push({
        imageData: blended,
        delay: 50, // 1 tick = 50ms
      })
    }
  }

  return apngFrames
}
