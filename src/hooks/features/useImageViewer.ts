import {useCallback, useEffect, useRef, useState} from 'react'
import {useDisplaySettings} from '@/stores/settingStore'
import {useRepoStore} from '@/stores/repoStore'
import {createRawImageUrl, getMcmetaPath} from '@/utils'
import {saveAs} from 'file-saver'
import {parseImagePath} from '@/utils/features/imageViewer'

interface UseImageViewerProps {
  open: boolean
  images: string[]
  currentIndex: number
  onIndexChange?: (index: number) => void
}

interface ImageMetadata {
  width: number
  height: number
  fileSize: number | null
  format: string
}

export function useImageViewer({
  open,
  images,
  currentIndex,
  onIndexChange,
}: UseImageViewerProps) {
  // Get state from stores
  const repo = useRepoStore(state => state.repo)
  const mcmetaPaths = useRepoStore(state => state.mcmetaPaths)
  const {pixelated, animationEnabled, gridBackground} = useDisplaySettings()

  const [loading, setLoading] = useState(true)
  const [imageError, setImageError] = useState(false)
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const currentImageRef = useRef<string | undefined>(undefined)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const isClosingViaPopStateRef = useRef(false)

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

  const {fileName, filePath} = parseImagePath(currentImage || '')

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

  const handleImageLoad = useCallback(
    (dimensions?: {width: number; height: number}) => {
      setLoading(false)

      const width = dimensions?.width ?? 0
      const height = dimensions?.height ?? 0
      const format = currentImage.split('.').pop()?.toUpperCase() || 'UNKNOWN'

      setImageMetadata({
        width,
        height,
        fileSize: null,
        format,
      })
    },
    [currentImage],
  )

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
        // When the image is already cached, use its natural size directly
        const width = img.naturalWidth
        const height = img.naturalHeight
        void handleImageLoad({width, height})
      }
    },
    [currentImage, handleImageLoad],
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
    if (!open) {
      // Reset flag when viewer is closed
      isClosingViaPopStateRef.current = false
      return
    }

    // Push state when viewer opens
    const state = {viewer: true, index: currentIndex}
    window.history.pushState(state, '', window.location.href)

    // Handle popstate (back button)
    const handlePopState = () => {
      // Mark that we're closing via popstate
      isClosingViaPopStateRef.current = true
      // Close the viewer when back button is pressed
      // This will be handled by the component's onOpenChange
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [open, currentIndex])

  // Handle keyboard and wheel events
  const handleClose = useCallback((onOpenChange: (open: boolean) => void) => {
    // Only remove history if we're not closing via popstate
    if (!isClosingViaPopStateRef.current && window.history.state?.viewer) {
      window.history.back()
    } else {
      onOpenChange(false)
    }
  }, [])

  const handleOpenAutoFocus = useCallback(
    (dialogContentRef: React.RefObject<HTMLDivElement | null>) =>
      (e: Event) => {
        e.preventDefault()
        if (dialogContentRef.current) {
          const firstFocusable = dialogContentRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ) as HTMLElement | null
          if (firstFocusable) {
            firstFocusable.focus({preventScroll: true})
          }
        }
      },
    [],
  )

  // Keyboard and wheel event handlers
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    const handleWheel = (e: WheelEvent) => {
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
  }, [open, handlePrevious, handleNext, handleWheelZoom])

  return {
    // State
    loading,
    imageError,
    imageMetadata,
    scale,
    translateX,
    translateY,
    isDragging,
    hasPrevious,
    hasNext,
    shouldAnimate,
    fileName,
    filePath,
    currentImage,
    pixelated,
    gridBackground,
    repo,

    // Refs
    imgRef,
    imageContainerRef,

    // Handlers
    handleDownloadCurrent,
    handlePrevious,
    handleNext,
    handleImageLoad,
    handleImageError,
    handleImageRef,
    handleResetZoom,
    handleZoom,
    handleWheelZoom,
    handleDoubleClick,
    handleMouseDown,
    handleClose,
    handleOpenAutoFocus,
    isClosingViaPopStateRef,
  }
}
