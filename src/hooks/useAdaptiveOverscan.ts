import {useMemo} from 'react'

/**
 * Performance levels based on device capabilities
 */
enum PerformanceLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very-high',
}

/**
 * Detect device performance level based on hardware capabilities
 * Uses CPU cores, memory, and connection speed as indicators
 *
 * Optimized to be more generous when memory info is unavailable,
 * assuming modern devices have sufficient RAM
 */
function detectPerformanceLevel(): PerformanceLevel {
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2

  // Check device memory if available (in GB)
  // Note: deviceMemory is only available in Chrome/Edge
  const memory =
    (navigator as Navigator & {deviceMemory?: number}).deviceMemory || null

  // When memory info is unavailable (Firefox, Safari, etc.),
  // assume modern device with sufficient RAM and be more generous
  const isMemoryUnknown = memory === null

  // Determine performance level
  // Very High: 8+ cores (or 4+ cores with unknown memory on modern browsers)
  if (cores >= 8) {
    if (isMemoryUnknown || memory >= 8) {
      return PerformanceLevel.VERY_HIGH
    }
    // High core count but low memory - still treat as high
    if (memory >= 4) {
      return PerformanceLevel.HIGH
    }
  }

  // High: 4-7 cores (or 2+ cores with unknown memory - assume sufficient RAM)
  if (cores >= 4) {
    if (isMemoryUnknown || memory >= 4) {
      return PerformanceLevel.HIGH
    }
    // If memory is known and low, still treat as medium-high
    return PerformanceLevel.MEDIUM
  }

  // Medium: 2-3 cores (or unknown memory - assume modern device)
  if (cores >= 2) {
    // If memory is unknown, assume modern device with sufficient RAM
    if (isMemoryUnknown) {
      return PerformanceLevel.HIGH
    }
    return PerformanceLevel.MEDIUM
  }

  // Low: Single core (but still generous if memory unknown)
  if (isMemoryUnknown) {
    return PerformanceLevel.MEDIUM
  }
  return PerformanceLevel.LOW
}

/**
 * Calculate overscan multiplier based on performance level
 * This multiplier is applied to visible height to determine how much extra to render
 * Higher multiplier = more items rendered, smoother scrolling but more memory usage
 *
 * Increased multipliers for more generous pre-rendering to reduce scroll delays
 */
function getOverscanMultiplier(performanceLevel: PerformanceLevel): number {
  switch (performanceLevel) {
    case PerformanceLevel.VERY_HIGH:
      return 5.0 // Render 5x visible height worth of items (increased from 3.0)
    case PerformanceLevel.HIGH:
      return 4.0 // Render 4x visible height worth of items (increased from 2.5)
    case PerformanceLevel.MEDIUM:
      return 3.0 // Render 3x visible height worth of items (increased from 2.0)
    case PerformanceLevel.LOW:
    default:
      return 2.0 // Default: render 2x visible height worth of items (increased from 1.5)
  }
}

/**
 * Hook to get adaptive overscan value based on device performance
 *
 * @param manualOverscan Optional manual override for overscan value (in rows)
 * @param visibleHeight Visible viewport height in pixels
 * @param itemSize Size of each item including gap in pixels
 * @param columnCount Number of columns in the grid
 * @returns Overscan value in rows, optimized for device performance
 */
export function useAdaptiveOverscan(
  manualOverscan: number | null | undefined,
  visibleHeight: number,
  itemSize: number,
  columnCount: number,
): number {
  return useMemo(() => {
    // If manual overscan is provided, use it directly (in rows)
    if (manualOverscan !== null && manualOverscan !== undefined) {
      return Math.max(0, manualOverscan)
    }

    // Calculate overscan based on visible height and performance level
    // This ensures consistent number of images rendered regardless of columnCount
    if (visibleHeight <= 0 || itemSize <= 0 || columnCount <= 0) {
      // Fallback to default rows if dimensions are not available yet
      return 5
    }

    const performanceLevel = detectPerformanceLevel()
    const multiplier = getOverscanMultiplier(performanceLevel)

    // Calculate how many rows we want to render based on visible height
    // Total height to render = visibleHeight * multiplier
    const totalRenderHeight = visibleHeight * multiplier
    const actualItemSize = itemSize
    const targetRows = Math.ceil(totalRenderHeight / actualItemSize)

    // Subtract the visible rows to get overscan rows
    const visibleRows = Math.ceil(visibleHeight / actualItemSize) + 1
    let overscanRows = Math.max(0, targetRows - visibleRows)

    // For high-performance devices, be even more generous
    // Add extra buffer for very high performance devices
    if (performanceLevel === PerformanceLevel.VERY_HIGH) {
      // Add 50% more overscan for very high performance devices
      overscanRows = Math.ceil(overscanRows * 1.5)
    } else if (performanceLevel === PerformanceLevel.HIGH) {
      // Add 25% more overscan for high performance devices
      overscanRows = Math.ceil(overscanRows * 1.25)
    }

    // For high-performance devices, allow much larger overscan
    // No hard limit - let the browser handle memory management
    // Ensure minimum overscan for smooth scrolling
    const minOverscan =
      performanceLevel === PerformanceLevel.VERY_HIGH
        ? 15
        : performanceLevel === PerformanceLevel.HIGH
          ? 10
          : performanceLevel === PerformanceLevel.MEDIUM
            ? 7
            : 5

    return Math.max(overscanRows, minOverscan)
  }, [manualOverscan, visibleHeight, itemSize, columnCount])
}
