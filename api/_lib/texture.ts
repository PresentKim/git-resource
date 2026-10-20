import UPNG from 'upng-js'

/** Larger images are not decoded: they cost memory and are rarely textures */
const MAX_PIXELS = 2048 * 2048

interface PixelateOptions {
  /** Cut a vertical animation strip (a .mcmeta texture) to its first frame */
  firstFrame?: boolean
  /** Skip images wider or taller than this */
  maxSide?: number
}

/**
 * Scale a PNG to fit a box with nearest-neighbour sampling and return it as a
 * data URI, so pixel art stays crisp in the card.
 *
 * Satori has no `image-rendering: pixelated`: an <img> drawn larger than its
 * source is smoothed. Drawing an image at exactly its own size is not, so the
 * texture is upscaled here and placed at 1:1.
 *
 * Small images grow by a whole factor (every source pixel becomes an equal
 * square); larger ones shrink to fit.
 */
export function pixelatePng(
  png: ArrayBuffer,
  boxWidth: number,
  boxHeight: number,
  {firstFrame = false, maxSide = Infinity}: PixelateOptions = {},
): string | null {
  const image = UPNG.decode(png)
  if (!image.width || !image.height) return null
  if (image.width * image.height > MAX_PIXELS) return null

  const width = image.width
  let height = image.height
  if (firstFrame && height > width && height % width === 0) height = width
  if (width > maxSide || height > maxSide) return null

  // The first frame of an APNG, or the only frame of a PNG
  const rgba = UPNG.toRGBA8(image)[0]
  if (!rgba) return null

  const fit = Math.min(boxWidth / width, boxHeight / height)
  const scale = fit >= 1 ? Math.floor(fit) : fit
  const outWidth = Math.max(1, Math.round(width * scale))
  const outHeight = Math.max(1, Math.round(height * scale))

  const source = new Uint32Array(rgba, 0, image.width * image.height)
  const output = new Uint32Array(outWidth * outHeight)
  for (let y = 0; y < outHeight; y++) {
    const row = Math.floor((y * height) / outHeight) * width
    for (let x = 0; x < outWidth; x++) {
      output[y * outWidth + x] =
        source[row + Math.floor((x * width) / outWidth)]
    }
  }

  const encoded = UPNG.encode([output.buffer], outWidth, outHeight, 0)
  return `data:image/png;base64,${Buffer.from(encoded).toString('base64')}`
}
