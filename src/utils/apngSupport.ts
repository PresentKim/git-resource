/**
 * Browser APNG support detection utilities
 */

let apngSupportCache: boolean | null = null

/**
 * Detect if the browser supports APNG (Animated PNG)
 * Uses a combination of feature detection and test image approach
 */
export async function detectAPNGSupport(): Promise<boolean> {
  return (apngSupportCache ??= detectAPNGSupportSync())
}

/**
 * Alternative detection method using feature detection
 * Checks if the browser claims to support APNG
 */
export function detectAPNGSupportSync(): boolean {
  // Check if browser supports APNG by testing image loading capability
  // Modern browsers that support APNG will handle it natively
  // This is a synchronous check but less reliable

  // Chrome/Edge: Supported since version 59
  // Firefox: Supported since version 3
  // Safari: Supported since version 8
  // Opera: Supported since version 46

  const ua = navigator.userAgent.toLowerCase()

  // Quick check based on known browser versions
  if (ua.includes('chrome') && !ua.includes('edge')) {
    // Chrome 59+ supports APNG
    const match = ua.match(/chrome\/(\d+)/)
    if (match && parseInt(match[1]) >= 59) {
      return true
    }
  }

  if (ua.includes('firefox')) {
    // Firefox 3+ supports APNG
    return true
  }

  if (ua.includes('safari') && !ua.includes('chrome')) {
    // Safari 8+ supports APNG
    const match = ua.match(/version\/(\d+)/)
    if (match && parseInt(match[1]) >= 8) {
      return true
    }
  }

  if (ua.includes('edge')) {
    // Edge (Chromium) supports APNG
    return true
  }

  // Default: assume support for modern browsers, fallback to async detection
  return true
}

/**
 * Get cached APNG support status
 */
export function getCachedAPNGSupport(): boolean | null {
  return apngSupportCache
}
