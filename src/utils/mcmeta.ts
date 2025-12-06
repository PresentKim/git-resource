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

// Fallback proxy URLs (in order of preference)
const PROXY_URLS = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
  'https://cors-anywhere.herokuapp.com/',
]

// In-memory cache for mcmeta data
const mcmetaCache = new Map<string, McmetaData | null>()

/**
 * Parse GitHub raw URL to extract owner, repo, ref, and path
 */
function parseGithubRawUrl(url: string): {
  owner: string
  repo: string
  ref: string
  path: string
} | null {
  const match = url.match(
    /^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/,
  )
  if (!match) {
    return null
  }
  return {
    owner: match[1],
    repo: match[2],
    ref: match[3],
    path: match[4],
  }
}

/**
 * Fetch mcmeta data using GitHub API (CORS-friendly, no proxy needed)
 */
async function fetchViaGitHubApi(
  owner: string,
  repo: string,
  ref: string,
  path: string,
  token?: string | null,
): Promise<McmetaData | null> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`
  
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const response = await fetch(apiUrl, {headers})
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    // GitHub API returns base64 encoded content
    if (data.content && data.encoding === 'base64') {
      const decodedContent = atob(data.content.replace(/\s/g, ''))
      return JSON.parse(decodedContent) as McmetaData
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Fetch mcmeta data using proxy as fallback
 */
async function fetchViaProxy(
  url: string,
  proxyIndex = 0,
): Promise<McmetaData | null> {
  if (proxyIndex >= PROXY_URLS.length) {
    return null
  }

  try {
    const proxyUrl = PROXY_URLS[proxyIndex] + encodeURIComponent(url)
    const response = await fetch(proxyUrl, {cache: 'no-store'})
    
    if (!response.ok) {
      // Try next proxy if this one fails
      if (response.status === 403 || response.status === 429) {
        return fetchViaProxy(url, proxyIndex + 1)
      }
      return null
    }
    
    const data = (await response.json()) as McmetaData
    return data
  } catch {
    // Try next proxy on error
    return fetchViaProxy(url, proxyIndex + 1)
  }
}

/**
 * Fetch and parse mcmeta data from a URL
 * Tries GitHub API first, then falls back to proxy services
 */
export async function fetchMcmetaData(
  url: string,
  githubToken?: string | null,
): Promise<McmetaData | null> {
  // Check cache first
  if (mcmetaCache.has(url)) {
    return mcmetaCache.get(url) ?? null
  }

  // Try GitHub API first (CORS-friendly, no proxy needed)
  const parsed = parseGithubRawUrl(url)
  if (parsed) {
    const apiData = await fetchViaGitHubApi(
      parsed.owner,
      parsed.repo,
      parsed.ref,
      parsed.path,
      githubToken,
    )
    if (apiData) {
      mcmetaCache.set(url, apiData)
      return apiData
    }
  }

  // Fallback to proxy services
  try {
    const proxyData = await fetchViaProxy(url)
    if (proxyData) {
      mcmetaCache.set(url, proxyData)
      return proxyData
    }
  } catch {
    // Ignore proxy errors
  }

  // Cache null result to avoid retrying immediately
  mcmetaCache.set(url, null)
  return null
}
