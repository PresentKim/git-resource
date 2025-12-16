import {useRef, useEffect, useState, useCallback} from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircleIcon,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react'
import {Dialog, DialogPortal} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {Button} from '@/components/ui/button'
import {cn, createRawImageUrl, getCachedObjectUrl, preloadImage} from '@/utils'
import {useScrollLock} from '@/hooks/useScrollLock'
import {ImageMedia} from './ImageMedia'
import {formatFileSize} from '@/utils/features/imageViewer'
import {useDisplaySettings} from '@/stores/settingStore'
import {useRepoStore} from '@/stores/repoStore'
import {useImageMetadata} from '@/hooks/features/image-viewer/useImageMetadata'
import {useImageLoading} from '@/hooks/features/image-viewer/useImageLoading'
import {useImageNavigation} from '@/hooks/features/image-viewer/useImageNavigation'
import {useImageZoom} from '@/hooks/features/image-viewer/useImageZoom'
import {useImageDrag} from '@/hooks/features/image-viewer/useImageDrag'
import {useImageTouch} from '@/hooks/features/image-viewer/useImageTouch'
import {useImageWheel} from '@/hooks/features/image-viewer/useImageWheel'
import {useImageKeyboard} from '@/hooks/features/image-viewer/useImageKeyboard'
import {useImageDownload} from '@/hooks/features/image-viewer/useImageDownload'
import {useImageAnimation} from '@/hooks/features/image-viewer/useImageAnimation'
import {useImagePath} from '@/hooks/features/image-viewer/useImagePath'
import {useImageHistory} from '@/hooks/features/image-viewer/useImageHistory'

interface ImageViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: string[]
  currentIndex: number
  onIndexChange?: (index: number) => void
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
  const {pixelated, animationEnabled, gridBackground} = useDisplaySettings()

  const currentImage = images[currentIndex]
  const rawSrc = currentImage ? createRawImageUrl(repo, currentImage) : ''
  const [resolvedSrc, setResolvedSrc] = useState<{forSrc: string; url: string}>(
    () => ({forSrc: rawSrc, url: rawSrc}),
  )

  // Image metadata
  const {metadata, updateMetadata, clearMetadata} = useImageMetadata()

  // Image loading
  const handleViewerLoad = useCallback(
    (dimensions?: {width: number; height: number}) => {
      const format = currentImage?.split('.').pop()?.toUpperCase() || 'UNKNOWN'
      updateMetadata(dimensions, format)
    },
    [currentImage, updateMetadata],
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
    handleZoom,
    handleResetZoom,
    resetZoom,
    setTranslate,
  } = useImageZoom({
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
    onNavigate: direction => {
      if (direction === 'next') handleNext()
      else handlePrevious()
    },
    enabled: open,
  })

  // Image history (needs handleClose before useImageKeyboard)
  const {handleClose} = useImageHistory({
    open,
    currentIndex,
    onOpenChange,
  })

  // Image keyboard events
  useImageKeyboard({
    onPrevious: handlePrevious,
    onNext: handleNext,
    onClose: handleClose,
    enabled: open,
  })

  // Image download
  const {fileName} = useImagePath({imagePath: currentImage})
  const {handleDownload: handleDownloadCurrent} = useImageDownload({
    repo,
    imagePath: currentImage || '',
    fileName: fileName || 'image.png',
  })

  // Image animation
  const {shouldAnimate} = useImageAnimation({
    imagePath: currentImage,
    mcmetaPaths,
    animationEnabled,
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

  // Handle Escape key is handled by useImageKeyboard

  const handleDialogOpenAutoFocus = useCallback((e: Event) => {
    e.preventDefault()
    const content = dialogContentRef.current
    if (content) {
      const firstFocusable = content.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as HTMLElement | null
      if (firstFocusable) {
        firstFocusable.focus({preventScroll: true})
      }
    }
  }, [])

  if (!currentImage) return null

  const imageTitleId = 'image-viewer-title'

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPortal>
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50',
            'w-screen h-dvh',
            'p-0 border-0 rounded-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'bg-background font-bold',
            'text-foreground',
            gridBackground === 'white' && 'text-black',
            gridBackground === 'black' && 'text-white',
          )}
          aria-labelledby={imageTitleId}
          aria-describedby={undefined}
          onOpenAutoFocus={handleDialogOpenAutoFocus}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => {
            e.preventDefault()
            handleClose()
          }}>
          <div
            ref={dialogContentRef}
            className="relative flex flex-col w-full h-full max-h-dvh">
            <DialogPrimitive.Title className="sr-only">
              {fileName} - Image {currentIndex + 1} of {images.length}
            </DialogPrimitive.Title>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-60 overlay-button"
              aria-label="Close"
              onClick={handleClose}>
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
                'relative flex items-center justify-center w-full flex-1 min-h-0 pt-24 pb-28 px-8 overflow-hidden',
                gridBackground === 'auto' && 'bg-background',
                gridBackground === 'white' && 'bg-white',
                gridBackground === 'black' && 'bg-black',
                gridBackground === 'transparent' && 'bg-transparent-grid',
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
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  }}>
                  <ImageMedia
                    // For animated sprites, always use the original raw URL.
                    // AnimatedSprite will handle caching and mcmeta loading based on this.
                    src={rawSrc}
                    alt={`${fileName} (${currentIndex + 1} of ${images.length})`}
                    className={cn(
                      'w-full h-full max-w-[80vw] max-h-[60vh] object-contain',
                      loading && 'opacity-0',
                    )}
                    pixelated={pixelated}
                    shouldAnimate={true}
                    onLoad={dimensions => {
                      void handleLoad(dimensions)
                    }}
                    onError={handleError}
                  />
                </div>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                  }}>
                  <ImageMedia
                    src={displayStaticSrc}
                    alt={`${fileName} (${currentIndex + 1} of ${images.length})`}
                    className={cn(
                      'w-full h-full max-w-[80vw] max-h-[60vh] object-contain',
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
              <div className="hidden sm:flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm min-h-6">
                {metadata ? (
                  <>
                    <span className="opacity-80">
                      {metadata.width} × {metadata.height}px
                    </span>
                    {metadata.fileSize && (
                      <span className="opacity-80">
                        · {formatFileSize(metadata.fileSize)}
                      </span>
                    )}
                    {metadata.format && (
                      <span className="opacity-80">· {metadata.format}</span>
                    )}
                  </>
                ) : (
                  <span className="invisible opacity-0">0 × 0px</span>
                )}
              </div>
              <div
                className="hidden items-center gap-3 rounded-md px-4 py-2 text-xs sm:flex"
                aria-live="polite"
                aria-atomic="true">
                <span>
                  Image {currentIndex + 1} of {images.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2 py-1 text-sm font-semibold"
                    onClick={() => handleZoom(-0.2)}
                    aria-label="Zoom out"
                    disabled={scale <= 0.5}>
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <span className="px-2 text-sm min-w-12 text-center">
                    {Math.round(scale * 100)}%
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="px-2 py-1 text-sm font-semibold"
                    onClick={() => handleZoom(0.2)}
                    aria-label="Zoom in"
                    disabled={scale >= 5}>
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  {scale !== 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="px-2 py-1 text-sm font-semibold"
                      onClick={handleResetZoom}
                      aria-label="Reset zoom">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
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
              </div>
              <div className="flex flex-col items-center gap-2 sm:hidden w-full">
                <div className="flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-base min-h-7 w-full">
                  {metadata ? (
                    <>
                      <span className="opacity-80">
                        {metadata.width}×{metadata.height}px
                      </span>
                      {metadata.fileSize && (
                        <span className="opacity-80">
                          · {formatFileSize(metadata.fileSize)}
                        </span>
                      )}
                      {metadata.format && (
                        <span className="opacity-80">· {metadata.format}</span>
                      )}
                    </>
                  ) : (
                    <span className="invisible opacity-0">0×0px</span>
                  )}
                </div>
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
                      Image {currentIndex + 1} of {images.length}
                    </span>
                  </div>
                  {hasNext && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-14 min-w-14 overlay-button shrink-0"
                      onClick={handleNext}
                      aria-label="Next image">
                      <ChevronRight className="size-10" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 px-2 w-full">
                  <div className="flex-1 flex items-center justify-center gap-1 rounded-md px-3 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 py-1 text-sm font-semibold"
                      onClick={() => handleZoom(-0.2)}
                      aria-label="Zoom out"
                      disabled={scale <= 0.5}>
                      <ZoomOut className="size-4" />
                    </Button>
                    <span className="px-1 text-sm min-w-10 text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 py-1 text-sm font-semibold"
                      onClick={() => handleZoom(0.2)}
                      aria-label="Zoom in"
                      disabled={scale >= 5}>
                      <ZoomIn className="size-4" />
                    </Button>
                    {scale !== 1 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 py-1 text-sm font-semibold"
                        onClick={handleResetZoom}
                        aria-label="Reset zoom">
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 py-1 text-sm font-semibold shrink-0"
                    onClick={handleDownloadCurrent}
                    aria-label="Download current image">
                    <Download className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
