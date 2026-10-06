import {useRef, useEffect, useState, useCallback} from 'react'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Link2,
  LoaderCircleIcon,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogPortal,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {Button, buttonVariants} from '@/shared/components/ui/button'
import {
  cn,
  createGithubBlobUrl,
  createRawImageUrl,
  getCachedObjectUrl,
  preloadImage,
} from '@/shared/utils'
import {useScrollLock} from '@/shared/hooks/useScrollLock'
import {ImageMedia} from '../image-cell/ImageMedia'
import {formatFileSize} from '@/shared/utils/imageViewer'
import {useDisplaySettings, useSettingStore} from '@/shared/stores/settingStore'
import {ViewerDisplayControls} from '@/features/repo/viewer/ViewerDisplayControls'
import {useRepoStore} from '@/shared/stores/repoStore'
import {useImageMetadata} from '@/features/repo/viewer/useImageMetadata'
import {useImageLoading} from '@/features/repo/image-cell/useImageLoading'
import {useImageNavigation} from '@/features/repo/viewer/useImageNavigation'
import {useImageZoom} from '@/features/repo/viewer/useImageZoom'
import {useImageDrag} from '@/features/repo/viewer/useImageDrag'
import {useImageTouch} from '@/features/repo/viewer/useImageTouch'
import {useImageWheel} from '@/features/repo/viewer/useImageWheel'
import {useImageKeyboard} from '@/features/repo/viewer/useImageKeyboard'
import {useImageDownload} from '@/features/repo/viewer/useImageDownload'
import {useImageAnimation} from '@/features/repo/image-cell/useImageAnimation'
import {useImagePath} from '@/features/repo/viewer/useImagePath'

interface ImageViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: string[]
  currentIndex: number
  onIndexChange?: (index: number) => void
}

const MIN_ZOOM_SCALE = 0.02

/**
 * The transparency checkerboard (behind the picture) and pixel grid lines
 * (over it). They live inside the zoomed element, so they move and scale with
 * the picture on every frame; sizes are in unzoomed pixels, and the line
 * width is divided by the zoom to stay one screen pixel thick.
 */
function PictureOverlays({
  picture,
  screenPixel,
  scale,
  checker,
  grid,
}: {
  picture: {width: number; height: number; pixel: number} | null
  /** Screen pixels per image pixel */
  screenPixel: number
  scale: number
  checker: boolean
  grid: boolean
}) {
  if (!picture) return null

  const frame: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: picture.width,
    height: picture.height,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  }
  // Squares are whole image pixels, enough of them to stay clearly visible
  const squarePixels = Math.max(1, Math.ceil(8 / screenPixel))
  const line = 1 / scale

  return (
    <>
      {checker && (
        <div
          aria-hidden="true"
          className="image-checker z-0"
          style={{
            ...frame,
            backgroundSize: `${squarePixels * picture.pixel * 2}px ${squarePixels * picture.pixel * 2}px`,
          }}
        />
      )}
      {grid && screenPixel >= 2 && (
        <div
          aria-hidden="true"
          className="z-20 opacity-30"
          style={{
            ...frame,
            backgroundImage: [
              `repeating-linear-gradient(90deg, currentColor 0 ${line}px, transparent ${line}px ${picture.pixel}px)`,
              `repeating-linear-gradient(0deg, currentColor 0 ${line}px, transparent ${line}px ${picture.pixel}px)`,
            ].join(','),
          }}
        />
      )}
    </>
  )
}

export function ImageViewer({
  open,
  onOpenChange,
  images,
  currentIndex,
  onIndexChange,
}: ImageViewerProps) {
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const repo = useRepoStore(state => state.repo)
  const mcmetaPaths = useRepoStore(state => state.mcmetaPaths)
  const {pixelated, animationEnabled} = useDisplaySettings()
  const viewerChecker = useSettingStore(state => state.viewerChecker)
  const viewerPixelGrid = useSettingStore(state => state.viewerPixelGrid)

  const currentImage = images[currentIndex]
  const positionLabel = `${(currentIndex + 1).toLocaleString()} of ${images.length.toLocaleString()}`
  const rawSrc = currentImage ? createRawImageUrl(repo, currentImage) : ''
  const [resolvedSrc, setResolvedSrc] = useState<{forSrc: string; url: string}>(
    () => ({forSrc: rawSrc, url: rawSrc}),
  )

  // Size of the media's box at zoom 1, before any transform. The checkerboard
  // and pixel grid are drawn inside the zoomed element, so they follow every
  // zoom and pan step with the image; this is only re-measured on resizes.
  const mediaFrameRef = useRef<HTMLDivElement>(null)
  const [mediaBox, setMediaBox] = useState<{
    width: number
    height: number
  } | null>(null)

  // Image metadata
  const {metadata, updateMetadata, clearMetadata} = useImageMetadata()

  // Image animation
  const {shouldAnimate} = useImageAnimation({
    imagePath: currentImage,
    mcmetaPaths,
    animationEnabled,
  })

  // Image loading
  const handleViewerLoad = useCallback(
    (
      originalDimensions?: {width: number; height: number},
      animatedDimensions?: {width: number; height: number},
      interpolate?: boolean,
    ) => {
      const format = currentImage?.split('.').pop()?.toUpperCase() || 'UNKNOWN'
      // For animated sprites: originalDimensions is sprite sheet size, animatedDimensions is frame size
      // For static images: originalDimensions is image size
      const dimensions = shouldAnimate
        ? originalDimensions
        : originalDimensions || animatedDimensions
      const animatedSize = shouldAnimate ? animatedDimensions : undefined
      updateMetadata(
        dimensions,
        format,
        animatedSize,
        shouldAnimate ? interpolate : undefined,
      )
    },
    [currentImage, updateMetadata, shouldAnimate],
  )
  const handleViewerError = useCallback(() => {
    clearMetadata()
  }, [clearMetadata])

  const {
    loading,
    error: imageError,
    imgRef,
    handleLoad,
    handleError,
    handleImageRef,
  } = useImageLoading({
    onLoad: handleViewerLoad,
    onError: handleViewerError,
  })

  // Image navigation
  const {hasPrevious, hasNext, handlePrevious, handleNext} = useImageNavigation(
    {
      currentIndex,
      totalImages: images.length,
      onIndexChange,
    },
  )

  // Preload adjacent images to speed up navigation
  useEffect(() => {
    const targets: string[] = []
    const nextPath = hasNext ? images[currentIndex + 1] : undefined
    const prevPath = hasPrevious ? images[currentIndex - 1] : undefined

    if (nextPath) targets.push(createRawImageUrl(repo, nextPath))
    if (prevPath) targets.push(createRawImageUrl(repo, prevPath))

    targets.forEach(src => {
      preloadImage(src)?.catch(() => {})
    })
  }, [repo, images, currentIndex, hasNext, hasPrevious])

  // Image zoom
  const handleZoomImageChange = useCallback(() => {
    clearMetadata()
  }, [clearMetadata])

  const {
    scale,
    translateX,
    translateY,
    containerRef: zoomContainerRef,
    minScale,
    maxScale,
    handleZoom,
    setZoom,
    handleResetZoom,
    resetZoom,
    setTranslate,
  } = useImageZoom({
    // Low enough to reach 1:1 on pixel art that is shown many times larger
    minScale: MIN_ZOOM_SCALE,
    onImageChange: handleZoomImageChange,
  })

  // Image drag
  const {isDragging, handleMouseDown} = useImageDrag({
    scale,
    translateX,
    translateY,
    onTranslateChange: setTranslate,
  })

  // Image touch gestures
  const imageContainerRef = zoomContainerRef
  useImageTouch({
    containerRef: imageContainerRef,
    onZoom: handleZoom,
    enabled: open,
  })

  // Image wheel events
  useImageWheel({
    containerRef: dialogContentRef,
    onZoom: handleZoom,
    onNavigate: (direction: 'next' | 'previous') => {
      if (direction === 'next') handleNext()
      else handlePrevious()
    },
    enabled: open,
  })

  // Image keyboard events
  useImageKeyboard({
    onPrevious: handlePrevious,
    onNext: handleNext,
    onClose: () => onOpenChange(false),
    enabled: open,
  })

  // Copy a link to the open image (the address bar holds ?image=<path>)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }, [])
  useEffect(() => {
    if (copyState === 'idle') return
    const timer = setTimeout(() => setCopyState('idle'), 1500)
    return () => clearTimeout(timer)
  }, [copyState])
  const copyLabel =
    copyState === 'copied'
      ? 'Link copied'
      : copyState === 'failed'
        ? 'Could not copy link'
        : 'Copy link to this image'

  // Image download
  const {fileName} = useImagePath({imagePath: currentImage})
  const {handleDownload: handleDownloadCurrent} = useImageDownload({
    repo,
    imagePath: currentImage || '',
    fileName: fileName || 'image.png',
  })

  // Image path parsing
  const {filePath} = useImagePath({imagePath: currentImage})

  // Resolve cached object URL to avoid redundant fetch/decoding for high-res images
  useEffect(() => {
    let cancelled = false
    if (!rawSrc) {
      queueMicrotask(() => {
        if (!cancelled) setResolvedSrc({forSrc: '', url: ''})
      })
      return () => {
        cancelled = true
      }
    }

    getCachedObjectUrl(rawSrc)
      .then(url => {
        if (!cancelled) setResolvedSrc({forSrc: rawSrc, url: url || rawSrc})
      })
      .catch(() => {
        if (!cancelled) setResolvedSrc({forSrc: rawSrc, url: rawSrc})
      })

    return () => {
      cancelled = true
    }
  }, [rawSrc])

  const displayStaticSrc =
    resolvedSrc.forSrc === rawSrc ? resolvedSrc.url : rawSrc

  // Reset zoom when image changes
  useEffect(() => {
    if (currentImage) {
      resetZoom()
    }
  }, [currentImage, resetZoom])

  useScrollLock(open)

  useEffect(() => {
    const frame = mediaFrameRef.current
    if (!open || !frame) return

    // The observer reports once when it starts watching, then on each resize
    const measure = () => {
      const media = frame.firstElementChild
      const width = media instanceof HTMLElement ? media.offsetWidth : 0
      const height = media instanceof HTMLElement ? media.offsetHeight : 0
      setMediaBox(prev =>
        prev && prev.width === width && prev.height === height
          ? prev
          : {width, height},
      )
    }
    const ro = new ResizeObserver(measure)
    ro.observe(frame)
    if (frame.firstElementChild) ro.observe(frame.firstElementChild)
    return () => ro.disconnect()
  }, [open, currentImage, shouldAnimate, loading, imageError])

  // Where the picture's pixels are inside the media box (object-contain
  // letterboxes it), and how big one image pixel is at zoom 1
  const pictureSize =
    shouldAnimate && metadata?.animatedSize
      ? metadata.animatedSize
      : metadata?.width && metadata.height
        ? {width: metadata.width, height: metadata.height}
        : null
  const picture =
    !loading && !imageError && pictureSize && mediaBox && mediaBox.width > 0
      ? (() => {
          const pixel = Math.min(
            mediaBox.width / pictureSize.width,
            mediaBox.height / pictureSize.height,
          )
          return {
            width: pictureSize.width * pixel,
            height: pictureSize.height * pixel,
            pixel,
          }
        })()
      : null
  // Screen pixels per image pixel
  const screenPixel = picture ? picture.pixel * scale : 0

  const githubUrl = currentImage ? createGithubBlobUrl(repo, currentImage) : ''

  // Real size on screen (1:1 = one image pixel per screen pixel); falls back to
  // the zoom relative to the fitted size when the image cannot be measured
  const displayScale = !shouldAnimate && picture ? screenPixel : null
  const zoomLabel =
    displayScale !== null
      ? `${Math.round(displayScale * 100).toLocaleString()}%`
      : `${Math.round(scale * 100)}%`
  const isActualSize =
    displayScale !== null && Math.abs(displayScale - 1) < 0.005
  const handleActualSize = () => {
    if (displayScale) setZoom(scale / displayScale)
  }
  // Scale 1 is the largest size at which the whole image still fits
  const isFit = scale === 1 && translateX === 0 && translateY === 0

  if (!currentImage) return null

  const imageTitleId = 'image-viewer-title'

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPortal>
        <DialogContent
          aria-labelledby={imageTitleId}
          showCloseButton={false}
          className={cn(
            // Override DialogContent's centered, max-w-sm defaults to cover the viewport
            'fixed inset-0 z-50 translate-x-0 translate-y-0',
            'w-screen h-dvh max-w-none sm:max-w-none',
            'p-0 border-0 rounded-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'bg-background font-bold',
            'text-foreground',
          )}>
          <div
            ref={dialogContentRef}
            className="relative flex flex-col w-full h-full max-h-dvh">
            <DialogTitle className="sr-only">
              {fileName} - Image {positionLabel}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-60 overlay-button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}>
              <X className="size-6" />
            </Button>

            <div className="absolute top-4 left-0 right-0 flex justify-center z-50 px-4">
              <div className="px-4 py-3 rounded-md max-w-10/9 wrap-break-word text-center">
                <div
                  id={imageTitleId}
                  className="text-base sm:text-lg font-semibold mb-1">
                  {fileName}
                </div>
                {filePath && (
                  <div className="text-xs sm:text-sm opacity-80">
                    {filePath}
                  </div>
                )}
              </div>
            </div>

            <div
              id="image-viewer-content"
              ref={imageContainerRef}
              className={cn(
                'relative flex items-center justify-center w-full flex-1 min-h-0 pt-24 pb-56 px-8 sm:pb-28 overflow-hidden',
                'bg-background',
                isDragging && 'cursor-grabbing',
                scale > 1 && 'cursor-grab',
              )}
              onDoubleClick={() => {
                if (scale === 1) {
                  handleZoom(1, 0, 0)
                } else {
                  handleResetZoom()
                }
              }}
              onMouseDown={handleMouseDown}>
              {loading && (
                <div
                  className="absolute inset-0 flex items-center justify-center z-10"
                  aria-live="polite"
                  aria-label="Loading image">
                  <div
                    className="size-full flex justify-center items-center opacity-5 ring-muted-foreground ring-1 rounded-md"
                    aria-hidden="true">
                    <LoaderCircleIcon
                      className="size-full object-contain text-muted animate-spin duration-3000"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )}
              {imageError ? (
                <div
                  className="flex flex-col items-center justify-center"
                  role="alert">
                  <p className="text-lg mb-2">Failed to load image</p>
                  <p className="text-sm opacity-70">{currentImage}</p>
                </div>
              ) : shouldAnimate ? (
                <div
                  ref={mediaFrameRef}
                  className="relative w-full h-full flex items-center justify-center"
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  }}>
                  <ImageMedia
                    // For animated sprites, always use the original raw URL.
                    // AnimatedSprite will handle caching and mcmeta loading based on this.
                    src={rawSrc}
                    alt={`${fileName} (${positionLabel})`}
                    className={cn(
                      'relative z-10 w-full h-full max-w-[80vw] max-h-[60vh] object-contain',
                      loading && 'opacity-0',
                    )}
                    pixelated={pixelated}
                    shouldAnimate={true}
                    onLoad={(
                      originalDimensions,
                      animatedDimensions,
                      interpolate,
                    ) => {
                      handleViewerLoad(
                        originalDimensions,
                        animatedDimensions,
                        interpolate,
                      )
                      const dimensions =
                        animatedDimensions ?? originalDimensions
                      if (dimensions) {
                        handleLoad(dimensions)
                      }
                    }}
                    onError={handleError}
                  />
                  <PictureOverlays
                    picture={picture}
                    screenPixel={screenPixel}
                    scale={scale}
                    checker={viewerChecker}
                    grid={viewerPixelGrid}
                  />
                </div>
              ) : (
                <div
                  ref={mediaFrameRef}
                  className="relative w-full h-full flex items-center justify-center"
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  }}>
                  <ImageMedia
                    src={displayStaticSrc}
                    alt={`${fileName} (${positionLabel})`}
                    className={cn(
                      'relative z-10 w-full h-full max-w-[80vw] max-h-[60vh] object-contain',
                      loading && 'opacity-0',
                    )}
                    pixelated={pixelated}
                    shouldAnimate={false}
                    imgRef={handleImageRef}
                    onLoad={dimensions => {
                      const width =
                        dimensions?.width ?? imgRef.current?.naturalWidth ?? 0
                      const height =
                        dimensions?.height ?? imgRef.current?.naturalHeight ?? 0
                      void handleLoad({width, height})
                    }}
                    onError={handleError}
                  />
                  <PictureOverlays
                    picture={picture}
                    screenPixel={screenPixel}
                    scale={scale}
                    checker={viewerChecker}
                    grid={viewerPixelGrid}
                  />
                </div>
              )}
            </div>

            {hasPrevious && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 hidden sm:flex overlay-button"
                onClick={handlePrevious}
                aria-label="Previous image">
                <ChevronLeft className="size-8" />
              </Button>
            )}

            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 hidden sm:flex overlay-button"
                onClick={handleNext}
                aria-label="Next image">
                <ChevronRight className="size-8" />
              </Button>
            )}

            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-50 px-4">
              <div className="flex flex-col items-start text-sm min-h-6 opacity-80">
                {metadata ? (
                  <>
                    <span>
                      {metadata.animatedSize && <>ORIGINAL: </>}
                      <>
                        {metadata.width} × {metadata.height}px
                      </>
                      {metadata.fileSize && (
                        <> · {formatFileSize(metadata.fileSize)}</>
                      )}
                      {metadata.format && <> · {metadata.format}</>}
                    </span>
                  </>
                ) : (
                  <span className="invisible opacity-0">0 × 0px</span>
                )}
                {metadata?.animatedSize && (
                  <span>
                    ANIMATED: {metadata.animatedSize.width} ×{' '}
                    {metadata.animatedSize.height}px
                    {metadata.fileSize && (
                      <> · {formatFileSize(metadata.fileSize)}</>
                    )}
                    {metadata.interpolate === true && <> · INTERPOLATE</>}
                  </span>
                )}
              </div>
              <div
                className="hidden items-center gap-3 rounded-md px-4 py-2 text-xs sm:flex"
                aria-live="polite"
                aria-atomic="true">
                <span>Image {positionLabel}</span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2 py-1 text-sm font-semibold"
                    onClick={() => handleZoom(-0.2)}
                    aria-label="Zoom out"
                    disabled={scale <= minScale}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 text-sm min-w-12 text-center">
                    {zoomLabel}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2 py-1 text-sm font-semibold"
                    onClick={() => handleZoom(0.2)}
                    aria-label="Zoom in"
                    disabled={scale >= maxScale}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2 py-1 text-sm font-semibold"
                    onClick={handleActualSize}
                    aria-label="Actual size (1:1)"
                    title="Actual size (1:1)"
                    disabled={displayScale === null || isActualSize}>
                    1:1
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2 py-1 text-sm font-semibold"
                    onClick={handleResetZoom}
                    aria-label="Largest size that fits the screen"
                    title="Largest size that fits the screen"
                    disabled={isFit}>
                    <Maximize className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ViewerDisplayControls />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="px-2 py-1 text-sm font-semibold"
                  onClick={handleDownloadCurrent}
                  aria-label="Download current image">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  DOWNLOAD
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="px-2 py-1"
                  onClick={handleCopyLink}
                  aria-label={copyLabel}
                  title={copyLabel}>
                  {copyState === 'copied' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Link2 className="h-3.5 w-3.5" />
                  )}
                </Button>
                <a
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    buttonVariants({size: 'sm', variant: 'outline'}),
                    'px-2 py-1',
                  )}
                  aria-label="Open on GitHub"
                  title="Open on GitHub">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="flex flex-col items-center gap-2 sm:hidden w-full">
                <div className="flex items-center gap-4 w-full">
                  {hasPrevious && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-14 min-w-14 shrink-0"
                      onClick={handlePrevious}
                      aria-label="Previous image">
                      <ChevronLeft className="size-10" />
                    </Button>
                  )}
                  <div
                    className="flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs min-w-0"
                    aria-live="polite"
                    aria-atomic="true">
                    <span className="whitespace-nowrap">
                      Image {positionLabel}
                    </span>
                  </div>
                  {hasNext && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-14 min-w-14 shrink-0"
                      onClick={handleNext}
                      aria-label="Next image">
                      <ChevronRight className="size-10" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 px-2 w-full">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-11"
                    onClick={() => handleZoom(-0.2)}
                    aria-label="Zoom out"
                    disabled={scale <= minScale}>
                    <ZoomOut className="size-5" />
                  </Button>
                  <span className="px-1 text-sm min-w-14 text-center">
                    {zoomLabel}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-11"
                    onClick={() => handleZoom(0.2)}
                    aria-label="Zoom in"
                    disabled={scale >= maxScale}>
                    <ZoomIn className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 min-w-11 px-2 text-sm font-semibold"
                    onClick={handleActualSize}
                    aria-label="Actual size (1:1)"
                    title="Actual size (1:1)"
                    disabled={displayScale === null || isActualSize}>
                    1:1
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-11"
                    onClick={handleResetZoom}
                    aria-label="Largest size that fits the screen"
                    title="Largest size that fits the screen"
                    disabled={isFit}>
                    <Maximize className="size-5" />
                  </Button>
                </div>
                <ViewerDisplayControls
                  large
                  className="justify-center px-2 w-full"
                />
                <div className="flex items-center justify-center gap-2 px-2 w-full">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-11"
                    onClick={handleDownloadCurrent}
                    aria-label="Download current image">
                    <Download className="size-5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-11"
                    onClick={handleCopyLink}
                    aria-label={copyLabel}
                    title={copyLabel}>
                    {copyState === 'copied' ? (
                      <Check className="size-5" />
                    ) : (
                      <Link2 className="size-5" />
                    )}
                  </Button>
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({size: 'icon', variant: 'outline'}),
                      'size-11',
                    )}
                    aria-label="Open on GitHub"
                    title="Open on GitHub">
                    <ExternalLink className="size-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
