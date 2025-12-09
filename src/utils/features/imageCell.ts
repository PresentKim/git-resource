// Cache regex to avoid recompilation
const FILE_EXTENSION_REGEX = /\.[^/.]+$/

/**
 * Parse image path to extract directory and filename parts
 * Optimized: Use cached regex and efficient string operations
 */
export function parseImagePath(path: string): {
  directory: string
  filename: string
} {
  // Remove file extension
  const pathWithoutExt = path.replace(FILE_EXTENSION_REGEX, '')
  const lastSlashIndex = pathWithoutExt.lastIndexOf('/')

  if (lastSlashIndex === -1) {
    return {directory: '', filename: pathWithoutExt || path}
  }

  // Extract directory (parent folder name) and filename efficiently
  const beforeLastSlash = pathWithoutExt.slice(0, lastSlashIndex)
  const secondLastSlashIndex = beforeLastSlash.lastIndexOf('/')
  const directory =
    secondLastSlashIndex === -1
      ? beforeLastSlash
      : beforeLastSlash.slice(secondLastSlashIndex + 1)
  const filename = pathWithoutExt.slice(lastSlashIndex + 1)

  return {
    directory: directory || '',
    filename: filename || '',
  }
}
