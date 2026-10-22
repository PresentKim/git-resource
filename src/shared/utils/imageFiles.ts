const IMAGE_FILE_EXTENSIONS_REGEX = /\.(png|jpe?g|gif|webp|svg)$/i
const MCMETA_FILE_EXTENSIONS_REGEX = /\.mcmeta$/i

/** Images and their .mcmeta files; every source lists these and nothing else */
export function isImageTreePath(path: string): boolean {
  return (
    IMAGE_FILE_EXTENSIONS_REGEX.test(path) ||
    MCMETA_FILE_EXTENSIONS_REGEX.test(path)
  )
}

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  // Without its type an SVG blob does not render in <img>
  svg: 'image/svg+xml',
  mcmeta: 'application/json',
}

/** The media type of a listed file, from its extension */
export function getMimeType(path: string): string {
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  return MIME_TYPES[extension] ?? 'application/octet-stream'
}
