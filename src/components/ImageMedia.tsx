import {memo} from 'react'
import {cn} from '@/utils'
import {AnimatedSprite} from './AnimatedSprite'

interface ImageMediaProps {
  /** Image URL (static image, sprite sheet, or Blob URL) */
  src: string
  /** Alternative text for accessibility */
  alt: string
  /** Additional CSS classes */
  className?: string
  /** Whether to render pixels without smoothing */
  pixelated?: boolean
  /** Whether to render as an animated sprite */
  shouldAnimate: boolean
  /**
   * Callback when image loading is completed
   * AnimatedSprite: (originalDimensions, animatedDimensions, interpolate)
   * <img>: (dimensions)
   */
  onLoad?: (
    originalDimensions?: {width: number; height: number},
    animatedDimensions?: {width: number; height: number},
    interpolate?: boolean,
  ) => void
  /** Callback when image fails to load */
  onError?: () => void
  /** Ref function for static <img> (zoom/drag, etc.) */
  imgRef?: (img: HTMLImageElement | null) => void
}

const ImageMedia = memo(function ImageMedia({
  src,
  alt,
  className,
  pixelated,
  shouldAnimate,
  onLoad,
  onError,
  imgRef,
}: ImageMediaProps) {
  if (shouldAnimate) {
    return (
      <AnimatedSprite
        src={src}
        alt={alt}
        className={className}
        pixelated={pixelated}
        onLoad={onLoad}
        onError={onError}
      />
    )
  }

  return (
    <img
      ref={imgRef ?? undefined}
      src={src}
      alt={alt}
      className={cn(className, pixelated && 'pixelated')}
      decoding="async"
      draggable={false}
      onLoad={event => {
        const img = event.currentTarget
        const width = img.naturalWidth
        const height = img.naturalHeight
        onLoad?.({width, height}, undefined, undefined)
      }}
      onError={onError}
    />
  )
})

export {ImageMedia}
export type {ImageMediaProps}
