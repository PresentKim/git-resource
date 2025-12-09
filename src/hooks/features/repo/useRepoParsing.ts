import {useMemo} from 'react'
import {parseGithubUrl} from '@/utils'

/**
 * Hook for parsing GitHub repository URL
 * Returns parsed repository or null if invalid
 */
export function useRepoParsing(url: string) {
  const parsedRepo = useMemo(() => {
    return parseGithubUrl(url)
  }, [url])

  return {
    parsedRepo,
    isValid: parsedRepo !== null,
  }
}
