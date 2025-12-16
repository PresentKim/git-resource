import {useCallback, memo} from 'react'
import {LoaderCircleIcon} from 'lucide-react'
import {cn} from '@/utils'
import {ImageMedia} from './ImageMedia'
import {useRepoStore} from '@/stores/repoStore'
import {useDisplaySettings} from '@/stores/settingStore'
import {useImageUrl} from '@/hooks/features/image/useImageUrl'
import {useImageLoading} from '@/hooks/features/image-viewer/useImageLoading'
import {useImageAnimation} from '@/hooks/features/image-viewer/useImageAnimation'
import {useKeyboardAccessibility} from '@/hooks/features/accessibility/useKeyboardAccessibility'
import {useImageRef} from '@/hooks/features/image/useImageRef'
import {parseImagePath} from '@/utils/features/imageCell'

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
  path: string
  onClick?: () => void
}

const ImageCell = memo(function ImageCell({path, onClick}: ImageCellProps) {
  // Get state from stores
  const repo = useRepoStore(state => state.repo)
  const mcmetaPaths = useRepoStore(state => state.mcmetaPaths)
  const {animationEnabled} = useDisplaySettings()

  // Image URL
  const {imageUrl} = useImageUrl({repo, imagePath: path})

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
      className="group relative aspect-square size-full ring-foreground transition-all duration-200 ease-out active:ring-2 active:rounded-xs focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={`View image: ${path}`}
      aria-pressed={false}>
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
        <ImageMedia
          src={imageUrl}
          alt={
            shouldAnimate ? `Animated image from ${path}` : `Image from ${path}`
          }
          className={cn('size-full object-contain peer', loading && 'hidden')}
          shouldAnimate={shouldAnimate}
          pixelated={false}
          imgRef={handleImageRef}
          onLoad={() => handleLoad()}
          onError={handleError}
        />
      </>
      <ImagePathOverlay path={path} />
    </div>
  )
})
export {ImageCell}
