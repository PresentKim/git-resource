import {useCallback, useEffect, useRef, useState, memo} from 'react'
import {ImageOff} from 'lucide-react'
import {cn, getMcmetaPath} from '@/shared/utils'
import {getImageUrl, type ImageSource} from '@/shared/utils/imageSource'
import type {CellBadge} from '@/shared/utils/galleryQuery'
import {ImageMedia} from './ImageMedia'
import {useImageUrl} from '@/features/repo/image-cell/useImageUrl'
import {useImageLoading} from '@/features/repo/image-cell/useImageLoading'
import {useImageAnimation} from '@/features/repo/image-cell/useImageAnimation'
import {useKeyboardAccessibility} from '@/shared/hooks/accessibility/useKeyboardAccessibility'
import {useImageRef} from '@/features/repo/image-cell/useImageRef'
import {parseImagePath} from '@/shared/utils/imageCell'
import {
  hasLoaded,
  rememberLoaded,
  whenNearViewport,
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

const BADGE_TONES: Record<CellBadge['tone'], string> = {
  added: 'bg-emerald-600 text-white',
  modified: 'bg-amber-500 text-black',
  removed: 'bg-red-600 text-white',
  'group-even': 'bg-sky-600 text-white',
  'group-odd': 'bg-fuchsia-600 text-white',
}

/** A small mark in the corner of a cell (a change, a duplicate group) */
function ImageBadge({badge}: {badge: CellBadge}) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute top-0.5 left-0.5 z-10 rounded-sm px-1 text-[10px] leading-4 font-bold shadow-sm',
        BADGE_TONES[badge.tone],
      )}
      title={badge.title}
      aria-hidden="true">
      {badge.label}
    </span>
  )
}

interface ImageCellProps {
  path: string
  index: number
  source: ImageSource
  /** A mark in the corner; must be referentially stable like the rest */
  badge?: CellBadge
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
  source,
  badge,
  mcmetaPaths,
  animationEnabled,
  onSelect,
}: ImageCellProps) {
  const onClick = useCallback(() => onSelect(index), [onSelect, index])

  // Image URL
  const {imageUrl} = useImageUrl({source, imagePath: path})

  // An image loaded before is in the browser cache and shows at once. Others
  // wait until the cell is near the viewport (the grid mounts far more cells
  // than are on screen), and, while the page is flying past, until the
  // scroll slows down. The grid reuses a cell for another image when the
  // list changes (filter, sort), so the request belongs to one URL.
  const cellRef = useRef<HTMLDivElement>(null)
  const [requestedUrl, setRequestedUrl] = useState<string | null>(null)
  const imageRequested = requestedUrl === imageUrl || hasLoaded(imageUrl)
  useEffect(() => {
    const cell = cellRef.current
    if (imageRequested || !cell) return
    let cancelSettle = () => {}
    const cancelNear = whenNearViewport(cell, () => {
      cancelSettle = whenScrollSettles(() => setRequestedUrl(imageUrl))
    })
    return () => {
      cancelNear()
      cancelSettle()
    }
  }, [imageRequested, imageUrl])

  // Image loading
  const {
    loading,
    error,
    handleLoad,
    handleError,
    handleImageRef: handleImageRefFromHook,
  } = useImageLoading({
    source: path,
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
      ref={cellRef}
      role="button"
      tabIndex={0}
      className="group relative aspect-square size-full ring-foreground transition-transform duration-200 ease-out active:ring-2 active:rounded-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:ring-foreground hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`View image: ${path}${badge ? ` (${badge.title})` : ''}${
        error ? ' (failed to load)' : ''
      }`}
      title={path}>
      <>
        {error && (
          // Replaces the browser's broken-image icon and alt text, which
          // overflowed small cells; the viewer offers a retry
          <div
            className="flex size-full items-center justify-center rounded-md bg-muted/40 text-muted-foreground ring-1 ring-muted-foreground/10"
            aria-hidden="true">
            <ImageOff className="size-1/4 max-h-8 min-h-4 max-w-8 min-w-4" />
          </div>
        )}
        {loading && (
          <div
            className="size-full rounded-md bg-muted/40 ring-1 ring-muted-foreground/10"
            aria-hidden="true"
          />
        )}
        {imageRequested && !error && (
          <ImageMedia
            src={imageUrl}
            alt={
              shouldAnimate
                ? `Animated image from ${path}`
                : `Image from ${path}`
            }
            className={cn('size-full object-contain peer', loading && 'hidden')}
            shouldAnimate={shouldAnimate}
            mcmetaSrc={
              shouldAnimate
                ? getImageUrl(source, getMcmetaPath(path))
                : undefined
            }
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
      {badge && <ImageBadge badge={badge} />}
      <ImagePathOverlay path={path} />
    </div>
  )
})
export {ImageCell}
