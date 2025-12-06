import {useCallback, useState, useRef, memo, useMemo} from 'react'
import {LoaderCircleIcon} from 'lucide-react'
import {type GithubRepo, createRawImageUrl, cn, getMcmetaPath} from '@/utils'
import {AnimatedSprite} from './AnimatedSprite'

// Cache regex to avoid recompilation
const FILE_EXTENSION_REGEX = /\.[^/.]+$/

/**
 * Parse image path to extract directory and filename parts
 * Optimized: Use cached regex and efficient string operations
 */
function parseImagePath(path: string): {directory: string; filename: string} {
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

/**
 * Overlay component showing image path information
 */
function ImagePathOverlay({path}: {path: string}) {
  const {directory, filename} = parseImagePath(path)

  if (!directory && !filename) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden',
        'flex flex-wrap justify-start items-end',
        'text-xs break-all',
        'backdrop-blur-xs backdrop-opacity-60',
        'size-full px-1 py-0.5 cursor-pointer select-none',
        'opacity-0 hover:opacity-100 transition-all',
        'overlay-bg',
      )}>
      {directory && (
        <>
          <span>{directory}</span>
          <span>/</span>
        </>
      )}
      <span>{filename}</span>
    </div>
  )
}

interface ImageCellProps {
  repo: GithubRepo
  path: string
  onClick?: () => void
  /** Set of mcmeta file paths for checking if this image has animation */
  mcmetaPaths?: Set<string>
  /** Whether animation is enabled */
  animationEnabled?: boolean
}

const ImageCell = memo(function ImageCell({
  repo,
  path,
  onClick,
  mcmetaPaths,
  animationEnabled = true,
}: ImageCellProps) {
  const [loading, setLoading] = useState(true)
  const imgRef = useRef<HTMLImageElement>(null)
  const currentPathRef = useRef<string>(path)

  // Check if this image has an associated mcmeta file
  const mcmetaPath = getMcmetaPath(path)
  const hasAnimation = mcmetaPaths?.has(mcmetaPath) ?? false
  const shouldAnimate = hasAnimation && animationEnabled

  // Memoize image URL to avoid recalculation
  const imageUrl = useMemo(
    () => createRawImageUrl(repo, path),
    [repo.owner, repo.name, repo.ref, path],
  )

  const handleLoad = useCallback(() => {
    setLoading(false)
  }, [])

  const handleImageRef = useCallback(
    (img: HTMLImageElement | null) => {
      imgRef.current = img
      if (currentPathRef.current !== path) {
        currentPathRef.current = path
        setLoading(true)
      }
      if (img && img.complete) {
        setLoading(false)
      }
    },
    [path],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.()
      }
    },
    [onClick],
  )

  return (
    <div
      role="button"
      tabIndex={0}
      className="relative aspect-square size-full ring-foreground transition-all duration-200 ease-out active:ring-2 active:rounded-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`View image: ${path}`}
      aria-pressed={false}>
      {shouldAnimate ? (
        <AnimatedSprite
          src={imageUrl}
          alt={`Animated image from ${path}`}
          className="size-full"
          onLoad={handleLoad}
        />
      ) : (
        <>
          <div
            className={cn(
              'size-full flex justify-center items-center opacity-5 ring-muted-foreground ring-1 rounded-md',
              loading ? 'block' : 'hidden',
            )}
            aria-hidden="true">
            <LoaderCircleIcon
              className="size-full object-contain text-muted animate-spin duration-[3s]"
              aria-hidden="true"
            />
          </div>
          <img
            ref={handleImageRef}
            src={imageUrl}
            alt={`Image from ${path}`}
            className={cn(
              'size-full object-contain peer',
              loading ? 'hidden' : 'block',
            )}
            decoding="async"
            onLoad={handleLoad}
          />
        </>
      )}
      <ImagePathOverlay path={path} />
    </div>
  )
})
export {ImageCell}
