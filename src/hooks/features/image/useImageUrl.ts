import {useMemo} from 'react'
import {createRawImageUrl} from '@/utils'
import type {GithubRepo} from '@/utils'

interface UseImageUrlProps {
  repo: GithubRepo
  imagePath: string
}

/**
 * Hook for generating image URL from repository and path
 * Memoizes URL to avoid recalculation
 */
export function useImageUrl({repo, imagePath}: UseImageUrlProps) {
  const imageUrl = useMemo(
    () => createRawImageUrl(repo, imagePath),
    [repo, imagePath],
  )

  return {
    imageUrl,
  }
}
