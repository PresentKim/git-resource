import {useCallback, useEffect, useRef, useState, memo} from 'react'
import {LoaderCircleIcon} from 'lucide-react'
import {
  type ParsedMcmetaAnimation,
  type McmetaData,
  parseMcmeta,
  fetchMcmetaData,
} from '@/utils/mcmeta'
import {cn, getCachedObjectUrl, setCachedImageMetadata} from '@/utils'
import {useSettingStore} from '@/stores/settingStore'

interface AnimatedSpriteProps {
  /** Source URL of the sprite sheet image */
  src: string
  /** URL of the .mcmeta file (optional - will be auto-generated if not provided) */
  mcmetaSrc?: string
  /** Pre-loaded mcmeta data (optional - skips fetching if provided) */
  mcmetaData?: McmetaData
  /** Alt text for accessibility */
  alt?: string
  /** Additional CSS classes */
  className?: string
  /** Whether to apply pixelated rendering */
  pixelated?: boolean
  /** Whether the animation is paused */
  paused?: boolean
  /** Callback when image loads (provides sprite frame dimensions) */
  onLoad?: (dimensions: {width: number; height: number}) => void
  /** Callback when image fails to load */
  onError?: () => void
}

interface AnimationState {
  animation: ParsedMcmetaAnimation
  currentFrameIndex: number
  timeOnFrame: number // Ticks elapsed on current frame (0-based, increments each tick)
  frameWidthPx: number
  frameHeightPx: number
  originalImageData?: ImageData // For interpolation
}

const AnimatedSprite = memo(function AnimatedSprite({
  src,
  mcmetaSrc,
  mcmetaData: preloadedMcmetaData,
  alt = 'Animated sprite',
  className,
  pixelated = true,
  paused = false,
  onLoad,
  onError,
}: AnimatedSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const animationStateRef = useRef<AnimationState | null>(null)
  const intervalRef = useRef<number | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const githubToken = useSettingStore(state => state.githubToken)
  const onLoadRef = useRef(onLoad)
  const onErrorRef = useRef(onError)
  const pausedRef = useRef(paused)
  const isVisibleRef = useRef(isVisible)

  // Update refs when values change
  useEffect(() => {
    onLoadRef.current = onLoad
    onErrorRef.current = onError
    pausedRef.current = paused
    isVisibleRef.current = isVisible
  }, [onLoad, onError, paused, isVisible])

  const mcmetaUrl = mcmetaSrc ?? `${src}.mcmeta`

  const lerp = (delta: number, from: number, to: number): number =>
    delta * (to - from) + from

  // Draw a specific frame on the canvas
  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      image: HTMLImageElement,
      frameIndex: number,
      frameWidthPx: number,
      frameHeightPx: number,
      interpolate: boolean,
      timeOnFrame: number,
      frameTime: number,
      originalImageData?: ImageData,
    ) => {
      const canvas = ctx.canvas

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // For vertical sprite sheets
      const sourceY = frameIndex * frameHeightPx

      // Draw the current frame
      ctx.drawImage(
        image,
        0,
        sourceY,
        frameWidthPx,
        frameHeightPx,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      // Apply interpolation if enabled
      if (
        interpolate &&
        originalImageData &&
        frameTime > 1 &&
        animationStateRef.current
      ) {
        const delta = timeOnFrame / frameTime
        const state = animationStateRef.current
        const nextFrameIndex =
          (state.currentFrameIndex + 1) % state.animation.frames.length
        const nextFrame = state.animation.frames[nextFrameIndex]

        if (nextFrame) {
          const frameDataSize = frameWidthPx * frameHeightPx * 4
          const nextFrameDataOffset = frameDataSize * nextFrame.index
          const frameImageData = ctx.getImageData(
            0,
            0,
            frameWidthPx,
            frameHeightPx,
          )

          for (let i = 0; i < frameImageData.data.length; i++) {
            frameImageData.data[i] = lerp(
              delta,
              frameImageData.data[i],
              originalImageData.data[nextFrameDataOffset + i],
            )
          }
          ctx.putImageData(frameImageData, 0, 0)
        }
      }
    },
    [],
  )

  const handleAnimationTick = useCallback(() => {
    const state = animationStateRef.current
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!state || !image || !canvas) return

    const ctx = canvas.getContext('2d', {willReadFrequently: true})
    if (!ctx) return

    if (paused || !isVisible || state.animation.frames.length <= 1) {
      const frame = state.animation.frames[state.currentFrameIndex]
      if (frame) {
        drawFrame(
          ctx,
          image,
          frame.index,
          state.frameWidthPx,
          state.frameHeightPx,
          state.animation.interpolate,
          0,
          frame.time,
          state.originalImageData,
        )
      }
      return
    }

    const currentFrame = state.animation.frames[state.currentFrameIndex]
    if (!currentFrame) {
      state.currentFrameIndex = 0
      state.timeOnFrame = 0
      return
    }

    if (state.timeOnFrame++ >= currentFrame.time) {
      state.timeOnFrame = 0
      state.currentFrameIndex =
        (state.currentFrameIndex + 1) % state.animation.frames.length
    }

    const frame =
      state.animation.frames[state.currentFrameIndex] ?? currentFrame
    drawFrame(
      ctx,
      image,
      frame.index,
      state.frameWidthPx,
      state.frameHeightPx,
      state.animation.interpolate,
      state.timeOnFrame,
      frame.time,
      state.originalImageData,
    )
  }, [paused, isVisible, drawFrame])

  // Initialize animation
  const initAnimation = useCallback(
    async (image: HTMLImageElement) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Fetch or use preloaded mcmeta data
      let mcmetaData: McmetaData | undefined = preloadedMcmetaData
      if (!mcmetaData) {
        const fetched = await fetchMcmetaData(mcmetaUrl, githubToken)
        mcmetaData = fetched ?? undefined
      }

      const frameWidthRatio = mcmetaData?.animation?.width
      const frameSize = frameWidthRatio
        ? Math.floor(image.width / frameWidthRatio)
        : image.width
      const frameWidthPx = frameSize
      const frameHeightPx = frameSize

      canvas.width = frameWidthPx
      canvas.height = frameHeightPx

      const parsedAnimation = mcmetaData
        ? parseMcmeta(mcmetaData, image.width, image.height)
        : null

      let originalImageData: ImageData | undefined
      if (parsedAnimation?.interpolate) {
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = image.width
        tempCanvas.height = image.height
        const tempCtx = tempCanvas.getContext('2d', {willReadFrequently: true})
        if (tempCtx) {
          tempCtx.imageSmoothingEnabled = false
          tempCtx.drawImage(image, 0, 0)
          originalImageData = tempCtx.getImageData(
            0,
            0,
            image.width,
            image.height,
          )
        }
      }

      if (!parsedAnimation || parsedAnimation.frames.length <= 1) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          drawFrame(
            ctx,
            image,
            0,
            frameWidthPx,
            frameHeightPx,
            false,
            0,
            1,
            undefined,
          )
        }
        return
      }

      animationStateRef.current = {
        animation: parsedAnimation,
        currentFrameIndex: 0,
        timeOnFrame: 0,
        frameWidthPx,
        frameHeightPx,
        originalImageData,
      }

      // Draw initial frame
      const ctx = canvas.getContext('2d', {willReadFrequently: true})
      if (ctx) {
        const frame = parsedAnimation.frames[0]
        if (frame) {
          drawFrame(
            ctx,
            image,
            frame.index,
            frameWidthPx,
            frameHeightPx,
            parsedAnimation.interpolate,
            0,
            frame.time,
            originalImageData,
          )
        }
      }

      // Don't start interval here - let useEffect handle it based on paused/isVisible
      // This prevents re-initialization when paused/isVisible changes
    },
    [mcmetaUrl, preloadedMcmetaData, githubToken, drawFrame],
  )

  // Load image
  useEffect(() => {
    let cancelled = false
    const image = new Image()
    image.crossOrigin = 'anonymous'

    image.onload = async () => {
      if (cancelled) return
      imageRef.current = image
      setLoading(false)
      setCachedImageMetadata(src, {
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
      await initAnimation(image)
      // Start interval after animation is initialized
      // Check current paused/visible state using refs
      const shouldStart = !pausedRef.current && isVisibleRef.current
      if (shouldStart && animationStateRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        intervalRef.current = window.setInterval(handleAnimationTick, 50)
      }
      onLoadRef.current?.({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
    }

    image.onerror = () => {
      if (cancelled) return
      setLoading(false)
      setError(true)
      onErrorRef.current?.()
    }

    getCachedObjectUrl(src)
      .then(url => {
        if (!cancelled) image.src = url
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false)
          setError(true)
          onErrorRef.current?.()
        }
      })

    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      image.onload = null
      image.onerror = null
      imageRef.current = null
      animationStateRef.current = null
    }
  }, [src, initAnimation, handleAnimationTick])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      entries => setIsVisible(entries[0].isIntersecting),
      {threshold: 0, rootMargin: '50px'},
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Manage animation interval when paused/visible state changes
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Restart interval if conditions are met
    if (animationStateRef.current && !paused && isVisible) {
      intervalRef.current = window.setInterval(handleAnimationTick, 50)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [paused, isVisible, handleAnimationTick])

  if (error) {
    return (
      <div
        className={cn('flex items-center justify-center bg-muted', className)}>
        <span className="text-muted-foreground text-xs">Failed to load</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={cn(
          'w-full h-full object-contain',
          pixelated && 'pixelated',
          loading && 'invisible',
        )}
        aria-label={alt}
        role="img"
      />
    </div>
  )
})

export {AnimatedSprite}
export type {AnimatedSpriteProps}
