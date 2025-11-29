import {useCallback, useState, useRef, memo} from 'react'
import {LoaderCircleIcon} from 'lucide-react'
import {type GithubRepo, createRawImageUrl, cn, getMcmetaPath} from '@/utils'
import {AnimatedSprite} from './AnimatedSprite'

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

  const handleLoad = useCallback(() => {
    setLoading(false)
  }, [])

  const handleImageRef = useCallback((img: HTMLImageElement | null) => {
    imgRef.current = img
    if (currentPathRef.current !== path) {
      currentPathRef.current = path
      setLoading(true)
    }
    if (img && img.complete) {
      setLoading(false)
    }
  }, [path])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.()
      }
    },
    [onClick],
  )

  const imageUrl = createRawImageUrl(repo, path)

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
            className="size-full flex justify-center items-center opacity-5 ring-muted-foreground ring-1 rounded-md"
            style={{display: loading ? 'block' : 'none'}}
            aria-hidden="true">
            <LoaderCircleIcon className="size-full object-contain text-muted animate-spin duration-[3s]" aria-hidden="true" />
          </div>
          <img
            ref={handleImageRef}
            src={imageUrl}
            alt={`Image from ${path}`}
            className="size-full object-contain peer"
            onLoad={handleLoad}
            style={{display: loading ? 'none' : 'block'}}
          />
        </>
      )}
      <div
        className={cn(
          'absolute inset-0 overflow-hidden',
          'flex flex-wrap justify-start items-end',
          'text-white text-xs break-all',
          'bg-black/50 backdrop-blur-xs backdrop-opacity-60',
          'size-full px-1 py-0.5 cursor-pointer select-none',
          'opacity-0 hover:opacity-100 transition-all',
        )}>
        <span>
          {
            path
              .replace(/\.[^/.]+$/, '')
              .split('/')
              .slice(-2)[0]
          }
        </span>
        <span>/</span>
        <span>
          {
            path
              .replace(/\.[^/.]+$/, '')
              .split('/')
              .slice(-2)[1]
          }
        </span>
      </div>
    </div>
  )
})
export {ImageCell}
