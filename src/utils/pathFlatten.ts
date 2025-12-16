/**
 * Flatten mode for ZIP download
 */
export type FlattenMode = 'original' | 'last-level' | 'flat'

/**
 * Transform path based on flatten mode
 */
export function transformPath(path: string, mode: FlattenMode): string {
  switch (mode) {
    case 'original':
      return path
    case 'last-level': {
      // Keep only the last directory level
      const parts = path.split('/')
      if (parts.length <= 2) {
        return path // Already flat or only one level
      }
      return parts.slice(-2).join('/')
    }
    case 'flat': {
      // Flatten completely - use only filename
      const parts = path.split('/')
      return parts[parts.length - 1] || path
    }
    default:
      return path
  }
}

/**
 * Resolve duplicate file names by appending -1, -2, etc.
 * Returns a map of original path to final path in ZIP
 */
export function resolveDuplicatePaths(
  paths: string[],
  mode: FlattenMode,
): Map<string, string> {
  const pathMap = new Map<string, string>()
  const usedPaths = new Set<string>()

  for (const originalPath of paths) {
    const transformedPath = transformPath(originalPath, mode)
    let finalPath = transformedPath
    let counter = 1

    // If path already exists, append -1, -2, etc.
    while (usedPaths.has(finalPath)) {
      const extIndex = transformedPath.lastIndexOf('.')
      if (extIndex === -1) {
        // No extension
        finalPath = `${transformedPath}-${counter}`
      } else {
        // Has extension
        const name = transformedPath.slice(0, extIndex)
        const ext = transformedPath.slice(extIndex)
        finalPath = `${name}-${counter}${ext}`
      }
      counter += 1
    }

    usedPaths.add(finalPath)
    pathMap.set(originalPath, finalPath)
  }

  return pathMap
}
