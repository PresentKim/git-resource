/**
 * Minecraft .mcmeta file animation utilities
 * Based on: https://minecraft.wiki/w/Resource_pack#Animation
 */

export interface McmetaFrame {
  /** Frame index in the sprite sheet */
  index: number
  /** Frame duration in ticks (1 tick = 50ms in Minecraft, but we use 1 tick = 1 frame time) */
  time: number
}

export interface McmetaAnimation {
  /** Whether to interpolate between frames */
  interpolate?: boolean
  /** Width of the frame (defaults to texture width) */
  width?: number
  /** Height of the frame (defaults to texture width for square frames) */
  height?: number
  /** Default frame time in ticks */
  frametime?: number
  /** Frame order and timing - can be numbers or {index, time} objects */
  frames?: Array<number | {index: number; time?: number}>
}

export interface McmetaData {
  animation?: McmetaAnimation
}

export interface ParsedMcmetaAnimation {
  frameWidth: number | null
  frameHeight: number | null
  defaultFrameTime: number
  frames: McmetaFrame[]
}

/**
 * Default frame time in ticks (50ms per tick in Minecraft)
 */
const DEFAULT_FRAME_TIME = 1
export const TICK_MS = 50 // 1 Minecraft tick = 50ms

/**
 * Parse raw mcmeta JSON data into a structured animation object
 */
export function parseMcmeta(
  data: McmetaData,
  frameCount?: number,
): ParsedMcmetaAnimation | null {
  if (!data.animation) {
    return null
  }

  const animation = data.animation
  const defaultFrameTime = animation.frametime ?? DEFAULT_FRAME_TIME
  const frameWidth = animation.width ?? null
  const frameHeight = animation.height ?? null

  let frames: McmetaFrame[] = []

  if (animation.frames && animation.frames.length > 0) {
    // Parse explicit frame order
    frames = animation.frames.map(frame => {
      if (typeof frame === 'number') {
        return {index: frame, time: defaultFrameTime}
      }
      return {
        index: frame.index,
        time: frame.time ?? defaultFrameTime,
      }
    })
  } else if (frameCount !== undefined && frameCount > 0) {
    // Generate sequential frames based on sprite sheet
    frames = Array.from({length: frameCount}, (_, i) => ({
      index: i,
      time: defaultFrameTime,
    }))
  }

  return {
    frameWidth,
    frameHeight,
    defaultFrameTime,
    frames,
  }
}

/**
 * Calculate the number of frames in a sprite sheet based on dimensions
 * Minecraft textures are typically square, so an animated texture
 * will have height = width * frameCount
 */
export function calculateFrameCount(
  imageWidth: number,
  imageHeight: number,
  frameWidth?: number | null,
  frameHeight?: number | null,
): number {
  const effectiveFrameWidth = frameWidth ?? imageWidth
  const effectiveFrameHeight = frameHeight ?? effectiveFrameWidth

  // For vertical sprite sheets (most common in Minecraft)
  if (imageHeight > imageWidth) {
    return Math.floor(imageHeight / effectiveFrameHeight)
  }

  // For horizontal sprite sheets
  if (imageWidth > imageHeight) {
    return Math.floor(imageWidth / effectiveFrameWidth)
  }

  // Square image - single frame
  return 1
}

/**
 * Get the mcmeta file path for an image
 */
export function getMcmetaPath(imagePath: string): string {
  return `${imagePath}.mcmeta`
}

/**
 * Check if a path is an mcmeta file
 */
export function isMcmetaFile(path: string): boolean {
  return path.toLowerCase().endsWith('.mcmeta')
}

const PROXY_URL = 'https://corsproxy.io/?url='

// In-memory cache for mcmeta data
const mcmetaCache = new Map<string, McmetaData | null>()

/**
 * Fetch and parse mcmeta data from a URL (using CORS proxy with caching)
 */
export async function fetchMcmetaData(url: string): Promise<McmetaData | null> {
  // Check cache first
  if (mcmetaCache.has(url)) {
    return mcmetaCache.get(url) ?? null
  }

  try {
    const proxyUrl = PROXY_URL + encodeURIComponent(url)
    const response = await fetch(proxyUrl, {cache: 'no-store'})
    if (!response.ok) {
      mcmetaCache.set(url, null)
      return null
    }
    const data = (await response.json()) as McmetaData
    mcmetaCache.set(url, data)
    return data
  } catch {
    mcmetaCache.set(url, null)
    return null
  }
}
