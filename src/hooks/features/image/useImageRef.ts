import {useRef, useCallback, useEffect} from 'react'

interface UseImageRefProps {
  currentPath: string
  onPathChange?: () => void
}

/**
 * Hook for managing image element ref
 * Handles ref assignment and path change detection
 */
export function useImageRef({currentPath, onPathChange}: UseImageRefProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const currentPathRef = useRef<string>(currentPath)

  useEffect(() => {
    if (currentPathRef.current !== currentPath) {
      currentPathRef.current = currentPath
      onPathChange?.()
    }
  }, [currentPath, onPathChange])

  const handleImageRef = useCallback((img: HTMLImageElement | null) => {
    imgRef.current = img
  }, [])

  return {
    imgRef,
    handleImageRef,
  }
}
