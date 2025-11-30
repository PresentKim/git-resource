import {useCallback, useEffect, useRef, useState, memo} from 'react'
import {LoaderCircleIcon} from 'lucide-react'
import {
  type ParsedMcmetaAnimation,
  type McmetaData,
  parseMcmeta,
  calculateFrameCount,
  fetchMcmetaData,
  TICK_MS,
} from '@/utils/mcmeta'
import {cn} from '@/utils'

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
  /** Callback when image loads */
  onLoad?: () => void
  /** Callback when image fails to load */
  onError?: () => void
  /** Animation speed multiplier (default: 1) */
  speed?: number
}

interface AnimationState {
  animation: ParsedMcmetaAnimation
  currentFrameIndex: number
  tickAccumulator: number
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
  speed = 1,
}: AnimatedSpriteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const animationStateRef = useRef<AnimationState | null>(null)
  const animationFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const animateRef = useRef<((currentTime: number) => void) | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Calculate mcmeta URL
  const mcmetaUrl = mcmetaSrc ?? `${src}.mcmeta`

  // Draw a specific frame on the canvas
  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      image: HTMLImageElement,
      frameIndex: number,
    ) => {
      const canvas = ctx.canvas
      const frameWidth = image.width
      const frameHeight = image.width // Square frames in Minecraft

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // For vertical sprite sheets
      const sourceY = frameIndex * frameHeight

      // Draw the frame
      ctx.drawImage(
        image,
        0,
        sourceY,
        frameWidth,
        frameHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      )
    },
    [],
  )

  // Animation loop
  const animate = useCallback(
    (currentTime: number) => {
      if (
        !animationStateRef.current ||
        !imageRef.current ||
        !canvasRef.current
      ) {
        return
      }

      const state = animationStateRef.current
      const ctx = canvasRef.current.getContext('2d')
      if (!ctx) return

      // Calculate delta time
      const deltaTime = lastTimeRef.current
        ? currentTime - lastTimeRef.current
        : 0
      lastTimeRef.current = currentTime

      if (!paused && state.animation.frames.length > 1) {
        // Update tick accumulator
        state.tickAccumulator += (deltaTime / TICK_MS) * speed

        const currentFrame = state.animation.frames[state.currentFrameIndex]
        if (!currentFrame) {
          // Invalid frame index, reset to 0
          state.currentFrameIndex = 0
          state.tickAccumulator = 0
          return
        }

        // Ensure minimum frame time to prevent infinite loop (0 or negative values)
        const frameTime = Math.max(currentFrame.time, 0.001)

        // Check if we should advance to the next frame
        // Add safety limit to prevent infinite loops when frameTime is very small
        let loopCount = 0
        const maxLoops = state.animation.frames.length * 10

        while (state.tickAccumulator >= frameTime && loopCount < maxLoops) {
          state.tickAccumulator -= frameTime
          state.currentFrameIndex =
            (state.currentFrameIndex + 1) % state.animation.frames.length
          loopCount++
        }

        // If we hit the safety limit, reset to prevent infinite loop
        if (loopCount >= maxLoops) {
          state.tickAccumulator = 0
          state.currentFrameIndex = 0
        }
      }

      // Draw the current frame
      const frameIndex =
        state.animation.frames[state.currentFrameIndex]?.index ?? 0

      drawFrame(ctx, imageRef.current, frameIndex)

      // Continue animation loop
      if (animateRef.current) {
        animationFrameRef.current = requestAnimationFrame(animateRef.current)
      }
    },
    [paused, speed, drawFrame],
  )

  // Store animate function in ref
  useEffect(() => {
    animateRef.current = animate
  }, [animate])

  // Initialize animation
  const initAnimation = useCallback(
    async (image: HTMLImageElement) => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Determine frame dimensions
      const frameWidth = image.width
      const frameHeight = image.width // Square frames

      // Set canvas size
      canvas.width = frameWidth
      canvas.height = frameHeight

      // Fetch or use preloaded mcmeta data
      let mcmetaData: McmetaData | undefined = preloadedMcmetaData
      if (!mcmetaData) {
        const fetched = await fetchMcmetaData(mcmetaUrl)
        mcmetaData = fetched ?? undefined
      }

      // Calculate frame count
      const calculatedFrameCount = calculateFrameCount(
        image.width,
        image.height,
        mcmetaData?.animation?.width,
        mcmetaData?.animation?.height,
      )

      // Parse animation data
      const parsedAnimation = mcmetaData
        ? parseMcmeta(mcmetaData, calculatedFrameCount)
        : null

      // If no animation data or single frame, just draw the image
      if (!parsedAnimation || parsedAnimation.frames.length <= 1) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(
            image,
            0,
            0,
            frameWidth,
            frameHeight,
            0,
            0,
            frameWidth,
            frameHeight,
          )
        }
        return
      }

      // Set up animation state
      animationStateRef.current = {
        animation: parsedAnimation,
        currentFrameIndex: 0,
        tickAccumulator: 0,
      }

      // Start animation
      lastTimeRef.current = 0
      if (animateRef.current) {
        animationFrameRef.current = requestAnimationFrame(animateRef.current)
      }
    },
    [mcmetaUrl, preloadedMcmetaData],
  )

  // Load image
  useEffect(() => {
    const image = new Image()
    image.crossOrigin = 'anonymous'

    image.onload = () => {
      imageRef.current = image
      setLoading(false)
      initAnimation(image)
      onLoad?.()
    }

    image.onerror = () => {
      setLoading(false)
      setError(true)
      onError?.()
    }

    image.src = src

    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      image.onload = null
      image.onerror = null
    }
  }, [src, initAnimation, onLoad, onError])

  // Handle pause/resume
  useEffect(() => {
    if (!paused && animationStateRef.current && animateRef.current) {
      lastTimeRef.current = 0
      animationFrameRef.current = requestAnimationFrame(animateRef.current)
    } else if (paused && animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [paused])

  if (error) {
    return (
      <div
        className={cn('flex items-center justify-center bg-muted', className)}>
        <span className="text-muted-foreground text-xs">Failed to load</span>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
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
