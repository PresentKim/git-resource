import {useCallback, useEffect, useState, memo} from 'react'
import {cn} from '@/shared/utils'
import type {GithubRepo} from '@/shared/utils'
import {ImageMedia} from './ImageMedia'
import {useImageUrl} from '@/features/repo/image-cell/useImageUrl'
import {useImageLoading} from '@/features/repo/image-cell/useImageLoading'
import {useImageAnimation} from '@/features/repo/image-cell/useImageAnimation'
import {useKeyboardAccessibility} from '@/shared/hooks/accessibility/useKeyboardAccessibility'
import {useImageRef} from '@/features/repo/image-cell/useImageRef'
import {parseImagePath} from '@/shared/utils/imageCell'
import {
  hasLoaded,
  isScrollingFast,
  rememberLoaded,
  whenScrollSettles,
} from '@/features/repo/image-cell/imageLoadGate'

/**
 * Overlay component showing image path information
 * Improved UX: Tooltip-style display at bottom with better readability
 */
function ImagePathOverlay({path}: {path: string}) {
  const {directory, filename} = parseImagePath(path)

  if (!directory && !filename) {
    return null
  }

  return (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0',
        'bg-linear-to-t from-black/90 via-black/80 to-transparent',
        'dark:from-black/95 dark:via-black/85',
        'px-2 py-1.5',
        'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
        'transition-[opacity,transform] duration-200 ease-out',
        'transform translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0',
        'pointer-events-none',
      )}
      aria-hidden="true">
      <div className="flex flex-col gap-0.5 min-w-0">
        {directory && (
          <div className="text-[10px] text-white/80 dark:text-white/70 truncate font-medium">
            {directory}
          </div>
        )}
        <div className="text-xs text-white dark:text-white font-semibold line-clamp-2 break-all leading-tight">
          {filename}
        </div>
      </div>
    </div>
  )
}

interface ImageCellProps {
  path: string
  index: number
  repo: GithubRepo
  mcmetaPaths: Set<string>
  animationEnabled: boolean
  /** Must be referentially stable so memoized cells are not re-rendered */
  onSelect: (index: number) => void
}

/**
 * Cells receive everything as props instead of subscribing to stores:
 * thousands of per-cell store subscriptions are costly, and a stable-props
 * memo lets the grid skip cells whose inputs did not change.
 */
const ImageCell = memo(function ImageCell({
  path,
  index,
  repo,
  mcmetaPaths,
  animationEnabled,
  onSelect,
}: ImageCellProps) {
  const onClick = useCallback(() => onSelect(index), [onSelect, index])

  // Image URL
  const {imageUrl} = useImageUrl({repo, imagePath: path})

  // Cells that appear while the page is flying past wait for the scroll to
  // slow down before loading; otherwise they load right away
  const [imageRequested, setImageRequested] = useState(
    () => hasLoaded(imageUrl) || !isScrollingFast(),
  )
  useEffect(() => {
    if (imageRequested) return
    return whenScrollSettles(() => setImageRequested(true))
  }, [imageRequested])

  // Image loading
  const {
    loading,
    handleLoad,
    handleError,
    handleImageRef: handleImageRefFromHook,
  } = useImageLoading({
    onLoad: () => {},
    onError: () => {},
  })

  // Image animation
  const {shouldAnimate} = useImageAnimation({
    imagePath: path,
    mcmetaPaths,
    animationEnabled,
  })

  // Image ref
  const {handleImageRef: handleImageRefFromRefHook} = useImageRef({
    currentPath: path,
  })

  // Combine image ref handlers
  const handleImageRef = useCallback(
    (img: HTMLImageElement | null) => {
      handleImageRefFromHook(img)
      handleImageRefFromRefHook(img)
      if (img && img.complete) {
        handleLoad()
      }
    },
    [handleImageRefFromHook, handleImageRefFromRefHook, handleLoad],
  )

  // Keyboard accessibility
  const {handleKeyDown} = useKeyboardAccessibility({
    onActivate: onClick,
  })

  return (
    <div
      role="button"
      tabIndex={0}
      className="group relative aspect-square size-full ring-foreground transition-transform duration-200 ease-out active:ring-2 active:rounded-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`View image: ${path}`}
      title={path}>
      <>
        {loading && (
          <div
            className="size-full rounded-md bg-muted/40 ring-1 ring-muted-foreground/10"
            aria-hidden="true"
          />
        )}
        {imageRequested && (
          <ImageMedia
            src={imageUrl}
            alt={
              shouldAnimate
                ? `Animated image from ${path}`
                : `Image from ${path}`
            }
            className={cn('size-full object-contain peer', loading && 'hidden')}
            shouldAnimate={shouldAnimate}
            pixelated={false}
            imgRef={handleImageRef}
            onLoad={() => {
              rememberLoaded(imageUrl)
              handleLoad()
            }}
            onError={handleError}
          />
        )}
      </>
      <ImagePathOverlay path={path} />
    </div>
  )
})
export {ImageCell}
