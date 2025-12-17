/**
 * Format file size to human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Parse image path to extract filename and directory path
 */
export function parseImagePath(imagePath: string): {
  fileName: string
  filePath: string | null
} {
  const fileName = imagePath?.split('/').pop() || imagePath
  const filePath = imagePath?.includes('/')
    ? imagePath.substring(0, imagePath.lastIndexOf('/'))
    : null

  return {fileName, filePath}
}
