import {useCallback, useEffect, useRef, useState} from 'react'
import {ChevronLeft, ChevronRight, Download, LoaderCircleIcon, X} from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogPortal,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {Button} from '@/components/ui/button'
import {cn, createRawImageUrl, getMcmetaPath} from '@/utils'
import {saveAs} from 'file-saver'
import type {GithubRepo} from '@/utils'
import {useSettingStore} from '@/stores/settingStore'
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
  const pixelated = useSettingStore(state => state.pixelated)
  const animationEnabled = useSettingStore(state => state.animationEnabled)
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const currentImageRef = useRef<string | undefined>(undefined)

  const currentImage = images[currentIndex]
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  // Check if current image has animation
  const mcmetaPath = currentImage ? getMcmetaPath(currentImage) : ''
  const shouldAnimate = (mcmetaPaths?.has(mcmetaPath) ?? false) && animationEnabled

  const fileName = currentImage?.split('/').pop() || currentImage
  const filePath = currentImage?.includes('/')
    ? currentImage.substring(0, currentImage.lastIndexOf('/'))
    : null

  const handleDownloadCurrent = useCallback(async () => {
    try {
      const url = createRawImageUrl(repo, currentImage)
      const response = await fetch(url)
      const blob = await response.blob()
      saveAs(blob, fileName || 'image.png')
    } catch (err) {
      // eslint-disable-next-line no-console
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

  const handleImageLoad = useCallback(() => {
    setLoading(false)
  }, [])

  const handleImageError = useCallback(() => {
    setLoading(false)
    setImageError(true)
  }, [])

  const handleImageRef = useCallback((img: HTMLImageElement | null) => {
    imgRef.current = img
    if (currentImageRef.current !== currentImage) {
      currentImageRef.current = currentImage
      setLoading(true)
      setImageError(false)
    }
    if (img && img.complete) {
      setLoading(false)
    }
  }, [currentImage])

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
    window.addEventListener('wheel', handleWheel, {passive: false, capture: true})
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('wheel', handleWheel, {capture: true})
    }
  }, [open, handlePrevious, handleNext, onOpenChange])

  if (!currentImage) return null

  const imageTitleId = 'image-viewer-title'

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPortal>
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50',
            'w-screen h-dvh',
            'p-0 border-0 bg-black/95 rounded-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
          aria-labelledby={imageTitleId}
          aria-describedby={undefined}
          onOpenAutoFocus={handleOpenAutoFocus}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => {
            e.preventDefault()
            onOpenChange(false)
          }}>
        <div ref={dialogContentRef} className="relative flex flex-col w-full h-full max-h-dvh">
          <DialogPrimitive.Title className="sr-only">
            {fileName} - Image {currentIndex + 1} of {images.length}
          </DialogPrimitive.Title>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-60 bg-black/50 hover:bg-black/70 text-white"
              aria-label="Close">
              <X className="size-6" />
            </Button>
          </DialogClose>

          <div className="absolute top-4 left-0 right-0 flex justify-center z-50 px-4">
            <div className="bg-black/50 px-4 py-3 rounded-md text-white max-w-[90%] wrap-break-word text-center">
              <div id={imageTitleId} className="text-base sm:text-lg font-semibold mb-1">
                {fileName}
              </div>
              {filePath && (
                <div className="text-xs sm:text-sm text-gray-300 opacity-80">
                  {filePath}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center justify-center w-full flex-1 min-h-0 pt-24 pb-28 px-8">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10" aria-live="polite" aria-label="Loading image">
                <div className="size-full flex justify-center items-center opacity-5 ring-muted-foreground ring-1 rounded-md" aria-hidden="true">
                  <LoaderCircleIcon className="size-full object-contain text-muted animate-spin duration-[3s]" aria-hidden="true" />
                </div>
              </div>
            )}
            {imageError ? (
              <div className="flex flex-col items-center justify-center text-white" role="alert">
                <p className="text-lg mb-2">Failed to load image</p>
                <p className="text-sm text-gray-400">{currentImage}</p>
              </div>
            ) : shouldAnimate ? (
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
            ) : (
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
              />
            )}
          </div>

          {hasPrevious && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white',
                'hidden sm:flex',
              )}
              onClick={handlePrevious}
              aria-label="Previous image">
              <ChevronLeft className="size-8" />
            </Button>
          )}

          {hasNext && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white',
                'hidden sm:flex',
              )}
              onClick={handleNext}
              aria-label="Next image">
              <ChevronRight className="size-8" />
            </Button>
          )}

          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 z-50">
            <div className="hidden items-center gap-3 rounded-md bg-black/50 px-4 py-2 text-xs text-white sm:flex" aria-live="polite" aria-atomic="true">
              <span>
                Image {currentIndex + 1} of {images.length}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-white/30 bg-black/40 px-2 py-1 text-[0.7rem] font-semibold text-white hover:bg-white/10"
                onClick={handleDownloadCurrent}
                aria-label="Download current image">
                <Download className="mr-1 h-3.5 w-3.5" />
                DOWNLOAD
              </Button>
            </div>
            <div className="flex items-center gap-4 sm:hidden">
              {hasPrevious && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70 text-white size-14 min-w-14"
                  onClick={handlePrevious}
                  aria-label="Previous image">
                  <ChevronLeft className="size-10" />
                </Button>
              )}
              <div className="flex items-center gap-2 rounded-md bg-black/50 px-4 py-2 text-xs text-white" aria-live="polite" aria-atomic="true">
                <span>
                  Image {currentIndex + 1} of {images.length}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 border-white/30 bg-black/40 px-2 py-1 text-[0.65rem] font-semibold text-white hover:bg-white/10"
                  onClick={handleDownloadCurrent}
                  aria-label="Download current image">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
              {hasNext && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="bg-black/50 hover:bg-black/70 text-white size-14 min-w-14"
                  onClick={handleNext}
                  aria-label="Next image">
                  <ChevronRight className="size-10" />
                </Button>
              )}
            </div>
          </div>
        </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

