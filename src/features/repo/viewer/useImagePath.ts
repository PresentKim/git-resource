import {useMemo} from 'react'
import {parseImagePath} from '@/shared/utils/imageViewer'

interface UseImagePathProps {
  imagePath: string | undefined
}

/**
 * Hook for parsing image path to extract filename and directory
 * Returns parsed path information
 */
export function useImagePath({imagePath}: UseImagePathProps) {
  const {fileName, filePath} = useMemo(() => {
    return parseImagePath(imagePath || '')
  }, [imagePath])

  return {
    fileName,
    filePath,
  }
}
