import {useCallback, useEffect, useRef, useState} from 'react'
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
import {Dialog, DialogClose, DialogPortal} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {Button} from '@/components/ui/button'
import {cn, createRawImageUrl, getMcmetaPath} from '@/utils'
import {saveAs} from 'file-saver'
import type {GithubRepo} from '@/utils'
import {useSettingStore} from '@/stores/settingStore'
import {useScrollLock} from '@/hooks/useScrollLock'

// Format file size to human-readable format
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
import {AnimatedSprite} from './AnimatedSprite'

interface ImageViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: string[]
  currentIndex: number
  repo: GithubRepo
  onIndexChange?: (index: number) => void
  /** Set of mcmeta file paths for checking if images have animation */
  mcmetaPaths?: Set<string>
}

export function ImageViewer({
  open,
  onOpenChange,
  images,
  currentIndex,
  repo,
  onIndexChange,
  mcmetaPaths,
}: ImageViewerProps) {
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [imageMetadata, setImageMetadata] = useState<{
    width: number
    height: number
    fileSize: number | null
    format: string
  } | null>(null)
  const pixelated = useSettingStore(state => state.pixelated)
  const animationEnabled = useSettingStore(state => state.animationEnabled)
  const gridBackground = useSettingStore(state => state.gridBackground)
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const currentImageRef = useRef<string | undefined>(undefined)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // Zoom state
  const [scale, setScale] = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({x: 0, y: 0, translateX: 0, translateY: 0})
  const lastDistanceRef = useRef<number | null>(null)

  const currentImage = images[currentIndex]
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  // Check if current image has animation
  const mcmetaPath = currentImage ? getMcmetaPath(currentImage) : ''
  const shouldAnimate =
    (mcmetaPaths?.has(mcmetaPath) ?? false) && animationEnabled

  const fileName = currentImage?.split('/').pop() || currentImage
  const filePath = currentImage?.includes('/')
    ? currentImage.substring(0, currentImage.lastIndexOf('/'))
    : null

  useScrollLock(open)

  const handleDownloadCurrent = useCallback(async () => {
    try {
      const url = createRawImageUrl(repo, currentImage)
      const response = await fetch(url)
      const blob = await response.blob()
      saveAs(blob, fileName || 'image.png')
    } catch (err) {
      console.error('Failed to download image', err)
    }
  }, [currentImage, fileName, repo])

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      const newIndex = currentIndex - 1
      onIndexChange?.(newIndex)
      setLoading(true)
      setImageError(false)
    }
  }, [currentIndex, hasPrevious, onIndexChange])

  const handleNext = useCallback(() => {
    if (hasNext) {
      const newIndex = currentIndex + 1
      onIndexChange?.(newIndex)
      setLoading(true)
      setImageError(false)
    }
  }, [currentIndex, hasNext, onIndexChange])

  const handleImageLoad = useCallback(async () => {
    setLoading(false)

    // Get image metadata
    const url = createRawImageUrl(repo, currentImage)
    let width = 0
    let height = 0

    if (imgRef.current) {
      width = imgRef.current.naturalWidth
      height = imgRef.current.naturalHeight
    }

    // Get file size and format
    try {
      const response = await fetch(url, {method: 'HEAD'})
      const contentLength = response.headers.get('Content-Length')
      const contentType = response.headers.get('Content-Type') || ''

      const fileSize = contentLength ? parseInt(contentLength, 10) : null
      const format =
        contentType.split('/')[1]?.toUpperCase() ||
        currentImage.split('.').pop()?.toUpperCase() ||
        'UNKNOWN'

      // If width/height not available from img element, load image to get dimensions
      if (width === 0 || height === 0) {
        const img = new Image()
        img.src = url
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000)
          img.onload = () => {
            clearTimeout(timeout)
            width = img.naturalWidth
            height = img.naturalHeight
            resolve()
          }
          img.onerror = () => {
            clearTimeout(timeout)
            reject(new Error('Failed to load'))
          }
        })
      }

      setImageMetadata({
        width,
        height,
        fileSize,
        format,
      })
    } catch {
      // Fallback: try to get format from extension
      const format = currentImage.split('.').pop()?.toUpperCase() || 'UNKNOWN'

      // Try to get dimensions from image if not already available
      if (width === 0 || height === 0) {
        try {
          const img = new Image()
          img.src = url
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Timeout')), 5000)
            img.onload = () => {
              clearTimeout(timeout)
              width = img.naturalWidth
              height = img.naturalHeight
              resolve()
            }
            img.onerror = () => {
              clearTimeout(timeout)
              reject(new Error('Failed to load'))
            }
          })
        } catch {
          // Ignore errors, use 0 dimensions
        }
      }

      setImageMetadata({
        width,
        height,
        fileSize: null,
        format,
      })
    }
  }, [currentImage, repo])

  const handleImageError = useCallback(() => {
    setLoading(false)
    setImageError(true)
    setImageMetadata(null)
  }, [])

  const handleImageRef = useCallback(
    (img: HTMLImageElement | null) => {
      imgRef.current = img
      if (currentImageRef.current !== currentImage) {
        currentImageRef.current = currentImage
        setLoading(true)
        setImageError(false)
        setImageMetadata(null)
        // Reset zoom when image changes
        setScale(1)
        setTranslateX(0)
        setTranslateY(0)
      }
      if (img && img.complete) {
        setLoading(false)
      }
    },
    [currentImage],
  )

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    setScale(1)
    setTranslateX(0)
    setTranslateY(0)
  }, [])

  // Zoom in/out
  const handleZoom = useCallback(
    (delta: number, centerX?: number, centerY?: number) => {
      setScale(prevScale => {
        const newScale = Math.max(0.5, Math.min(5, prevScale + delta))

        // Zoom towards center point if provided
        if (
          centerX !== undefined &&
          centerY !== undefined &&
          imageContainerRef.current
        ) {
          const scaleChange = newScale / prevScale
          const newTranslateX = centerX - (centerX - translateX) * scaleChange
          const newTranslateY = centerY - (centerY - translateY) * scaleChange

          setTranslateX(newTranslateX)
          setTranslateY(newTranslateY)
        }

        return newScale
      })
    },
    [translateX, translateY],
  )

  // Handle mouse wheel zoom (Ctrl/Cmd + wheel)
  const handleWheelZoom = useCallback(
    (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return

      e.preventDefault()
      const container = imageContainerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const centerX = e.clientX - rect.left - rect.width / 2
      const centerY = e.clientY - rect.top - rect.height / 2

      const delta = -e.deltaY * 0.001
      handleZoom(delta, centerX, centerY)
    },
    [handleZoom],
  )

  // Handle double click to toggle fit/original
  const handleDoubleClick = useCallback(() => {
    if (scale === 1) {
      // Zoom to 2x at center
      handleZoom(1, 0, 0)
    } else {
      // Reset to fit
      handleResetZoom()
    }
  }, [scale, handleZoom, handleResetZoom])

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        translateX,
        translateY,
      }
    },
    [scale, translateX, translateY],
  )

  // Handle drag
  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x
      const deltaY = e.clientY - dragStartRef.current.y
      setTranslateX(dragStartRef.current.translateX + deltaX)
      setTranslateY(dragStartRef.current.translateY + deltaY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Handle pinch zoom (touch)
  useEffect(() => {
    if (!open || !imageContainerRef.current) return

    const container = imageContainerRef.current
    let touches: Touch[] = []

    const handleTouchStart = (e: TouchEvent) => {
      touches = Array.from(e.touches)
      if (touches.length === 2) {
        const distance = Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY,
        )
        lastDistanceRef.current = distance
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || lastDistanceRef.current === null) return

      e.preventDefault()
      const newTouches = Array.from(e.touches)
      const newDistance = Math.hypot(
        newTouches[0].clientX - newTouches[1].clientX,
        newTouches[0].clientY - newTouches[1].clientY,
      )

      const rect = container.getBoundingClientRect()
      const centerX =
        (newTouches[0].clientX + newTouches[1].clientX) / 2 -
        rect.left -
        rect.width / 2
      const centerY =
        (newTouches[0].clientY + newTouches[1].clientY) / 2 -
        rect.top -
        rect.height / 2

      const scaleChange = newDistance / lastDistanceRef.current
      const delta = (scaleChange - 1) * 0.5
      handleZoom(delta, centerX, centerY)

      lastDistanceRef.current = newDistance
    }

    const handleTouchEnd = () => {
      touches = []
      lastDistanceRef.current = null
    }

    container.addEventListener('touchstart', handleTouchStart, {passive: false})
    container.addEventListener('touchmove', handleTouchMove, {passive: false})
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [open, handleZoom])

  // Handle browser back button to close viewer
  useEffect(() => {
    if (!open) return

    // Push state when viewer opens
    const state = {viewer: true, index: currentIndex}
    window.history.pushState(state, '', window.location.href)

    // Handle popstate (back button)
    const handlePopState = () => {
      // Close the viewer when back button is pressed
      onOpenChange(false)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open, currentIndex, onOpenChange])

  const handleOpenAutoFocus = useCallback((e: Event) => {
    e.preventDefault()
    if (dialogContentRef.current) {
      const firstFocusable = dialogContentRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as HTMLElement | null
      if (firstFocusable) {
        firstFocusable.focus({preventScroll: true})
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      } else if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    const handleWheel = (e: WheelEvent) => {
      const container = dialogContentRef.current
      if (!container || !container.contains(e.target as Node)) {
        return
      }

      // If Ctrl/Cmd is pressed, handle zoom instead
      if (e.ctrlKey || e.metaKey) {
        handleWheelZoom(e)
        return
      }

      e.preventDefault()
      e.stopPropagation()
      if (Math.abs(e.deltaY) > 10) {
        if (e.deltaY > 0) {
          handleNext()
        } else if (e.deltaY < 0) {
          handlePrevious()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('wheel', handleWheel, {
      passive: false,
      capture: true,
    })
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel, {capture: true})
    }
  }, [open, handlePrevious, handleNext, onOpenChange, handleWheelZoom])

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
          onOpenAutoFocus={handleOpenAutoFocus}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => {
            e.preventDefault()
            onOpenChange(false)
          }}>
          <div
            ref={dialogContentRef}
            className="relative flex flex-col w-full h-full max-h-dvh">
            <DialogPrimitive.Title className="sr-only">
              {fileName} - Image {currentIndex + 1} of {images.length}
            </DialogPrimitive.Title>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 z-60 overlay-button"
                aria-label="Close">
                <X className="size-6" />
              </Button>
            </DialogClose>

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
              onDoubleClick={handleDoubleClick}
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
                  <AnimatedSprite
                    src={createRawImageUrl(repo, currentImage)}
                    alt={`${fileName} (${currentIndex + 1} of ${images.length})`}
                    className={cn(
                      'w-full h-full max-w-[80vw] max-h-[60vh]',
                      loading && 'opacity-0',
                    )}
                    pixelated={pixelated}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
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
                  <img
                    ref={handleImageRef}
                    src={createRawImageUrl(repo, currentImage)}
                    alt={`${fileName} (${currentIndex + 1} of ${images.length})`}
                    className={cn(
                      'w-full h-full object-contain',
                      pixelated && 'pixelated',
                      loading && 'opacity-0',
                    )}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    draggable={false}
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
                {imageMetadata ? (
                  <>
                    <span className="opacity-80">
                      {imageMetadata.width} × {imageMetadata.height}px
                    </span>
                    {imageMetadata.fileSize && (
                      <span className="opacity-80">
                        · {formatFileSize(imageMetadata.fileSize)}
                      </span>
                    )}
                    {imageMetadata.format && (
                      <span className="opacity-80">
                        · {imageMetadata.format}
                      </span>
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
                  {imageMetadata ? (
                    <>
                      <span className="opacity-80">
                        {imageMetadata.width}×{imageMetadata.height}px
                      </span>
                      {imageMetadata.fileSize && (
                        <span className="opacity-80">
                          · {formatFileSize(imageMetadata.fileSize)}
                        </span>
                      )}
                      {imageMetadata.format && (
                        <span className="opacity-80">
                          · {imageMetadata.format}
                        </span>
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
