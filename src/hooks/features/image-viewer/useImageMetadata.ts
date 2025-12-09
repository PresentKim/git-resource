import {useState, useCallback} from 'react'

export interface ImageMetadata {
  width: number
  height: number
  fileSize: number | null
  format: string
}

/**
 * Hook for managing image metadata (dimensions, format, file size)
 */
export function useImageMetadata() {
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null)

  const updateMetadata = useCallback(
    (dimensions?: {width: number; height: number}, format?: string) => {
      const width = dimensions?.width ?? 0
      const height = dimensions?.height ?? 0
      const imageFormat = format || 'UNKNOWN'

      setMetadata({
        width,
        height,
        fileSize: null,
        format: imageFormat,
      })
    },
    [],
  )

  const clearMetadata = useCallback(() => {
    setMetadata(null)
  }, [])

  return {
    metadata,
    updateMetadata,
    clearMetadata,
  }
}
