import {useMemo} from 'react'
import {getMcmetaPath} from '@/shared/utils'

interface UseImageAnimationProps {
  imagePath: string | undefined
  mcmetaPaths: Set<string> | null | undefined
  animationEnabled: boolean
}

/**
 * Hook for checking if image should be animated
 * Determines animation state based on mcmeta file presence and settings
 */
export function useImageAnimation({
  imagePath,
  mcmetaPaths,
  animationEnabled,
}: UseImageAnimationProps) {
  const shouldAnimate = useMemo(() => {
    if (!imagePath || !animationEnabled) return false
    const mcmetaPath = getMcmetaPath(imagePath)
    return (mcmetaPaths?.has(mcmetaPath) ?? false) && animationEnabled
  }, [imagePath, mcmetaPaths, animationEnabled])

  return {
    shouldAnimate,
  }
}
