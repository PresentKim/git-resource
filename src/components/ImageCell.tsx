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
 * Improved UX: Tooltip-style display at bottom with better readability
 */
function ImagePathOverlay({path}: {path: string}) {
  const {directory, filename} = parseImagePath(path)

  if (!directory && !filename) {
    return null
  }

  // Get full path for tooltip/title
  const fullPath = path

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0',
        'bg-linear-to-t from-black/90 via-black/80 to-transparent',
        'dark:from-black/95 dark:via-black/85',
        'px-2 py-1.5',
        'opacity-0 group-hover:opacity-100',
        'transition-all duration-200 ease-out',
        'transform translate-y-1 group-hover:translate-y-0',
        'pointer-events-none',
      )}
      title={fullPath}>
      <div className="flex flex-col gap-0.5 min-w-0">
        {directory && (
          <div
            className="text-[10px] text-white/80 dark:text-white/70 truncate font-medium"
            title={directory}>
            {directory}
          </div>
        )}
        <div
          className="text-xs text-white dark:text-white font-semibold truncate leading-tight"
          title={filename}>
          {filename}
        </div>
      </div>
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
  const imageUrl = useMemo(() => createRawImageUrl(repo, path), [repo, path])

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
      className="group relative aspect-square size-full ring-foreground transition-all duration-200 ease-out active:ring-2 active:rounded-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
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
