import {useCallback, useEffect, useRef, useState} from 'react'
import {ChevronLeft, ChevronRight, X, LoaderCircleIcon} from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {Button} from '@/components/ui/button'
import {cn, createRawImageUrl} from '@/utils'
import type {GithubRepo} from '@/utils'
import {useSettingStore} from '@/stores/settingStore'

interface ImageViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: string[]
  currentIndex: number
  repo: GithubRepo
  onIndexChange?: (index: number) => void
}

export function ImageViewer({
  open,
  onOpenChange,
  images,
  currentIndex,
  repo,
  onIndexChange,
}: ImageViewerProps) {
  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const pixelated = useSettingStore(state => state.pixelated)
  const dialogContentRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const currentImageRef = useRef<string | undefined>(undefined)

  const currentImage = images[currentIndex]
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < images.length - 1

  const fileName = currentImage?.split('/').pop() || currentImage
  const filePath = currentImage?.includes('/')
    ? currentImage.substring(0, currentImage.lastIndexOf('/'))
    : null

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

  useEffect(() => {
    if (open && dialogContentRef.current) {
      const firstFocusable = dialogContentRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) as HTMLElement | null
      if (firstFocusable) {
        firstFocusable.focus()
      }
    }
  }, [open])

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

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, handlePrevious, handleNext, onOpenChange])

  if (!currentImage) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/95" />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50',
            'w-screen h-screen',
            'p-0 border-0 bg-transparent rounded-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => {
            e.preventDefault()
            onOpenChange(false)
          }}>
        <div ref={dialogContentRef} className="relative flex flex-col w-full h-full">
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
              <div className="text-base sm:text-lg font-semibold mb-1">
                {fileName}
              </div>
              {filePath && (
                <div className="text-xs sm:text-sm text-gray-300 opacity-80">
                  {filePath}
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center justify-center w-full h-full pt-24 pb-28 px-8">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="size-full flex justify-center items-center opacity-5 ring-muted-foreground ring-1 rounded-md">
                  <LoaderCircleIcon className="size-full object-contain text-muted animate-spin duration-[3s]" />
                </div>
              </div>
            )}
            {imageError ? (
              <div className="flex flex-col items-center justify-center text-white">
                <p className="text-lg mb-2">Failed to load image</p>
                <p className="text-sm text-gray-400">{currentImage}</p>
              </div>
            ) : (
              <img
                ref={handleImageRef}
                src={createRawImageUrl(repo, currentImage)}
                alt={currentImage}
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
            <div className="bg-black/50 px-4 py-2 rounded-md text-white text-sm hidden sm:block">
              {currentIndex + 1} / {images.length}
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
              <div className="bg-black/50 px-4 py-2 rounded-md text-white text-sm">
                {currentIndex + 1} / {images.length}
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

