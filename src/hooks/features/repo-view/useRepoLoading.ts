import {useEffect} from 'react'
import {useGithubDefaultBranch} from '@/api/github/hooks/useGithubDefaultBranch'
import {useGithubImageFileTree} from '@/api/github/hooks/useGithubImageFileTree'
import {useTargetRepository} from '@/hooks/useTargetRepository'
import {usePromise} from '@/hooks/usePromise'
import {useRepoStore} from '@/stores/repoStore'

/**
 * Hook for managing repository loading logic
 * Handles default branch fetching and image file tree loading
 */
export function useRepoLoading() {
  const [, setTargetRepository] = useTargetRepository()
  const isLoadRef = usePromise(useGithubDefaultBranch())[0]
  const getDefaultBranch = usePromise(useGithubDefaultBranch())[1]
  const isLoadImagePaths = usePromise(useGithubImageFileTree())[0]
  const getImagePaths = usePromise(useGithubImageFileTree())[1]
  const targetRepository = useTargetRepository()[0]
  const setRepo = useRepoStore(state => state.setRepo)
  const setImageFiles = useRepoStore(state => state.setImageFiles)
  const setError = useRepoStore(state => state.setError)

  useEffect(() => {
    const ref = targetRepository.ref?.trim()

    // Get image files if ref is provided in URL
    if (ref) {
      setRepo(targetRepository)
      getImagePaths(targetRepository)
        .then(imageFileTree => {
          setError(null)
          setImageFiles(imageFileTree)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
      return
    } else {
      // No ref provided, need to fetch default branch
      getDefaultBranch(targetRepository)
        .then(defaultBranch => {
          setError(null)
          setTargetRepository(
            targetRepository.owner,
            targetRepository.name,
            defaultBranch,
          )
          setRepo({...targetRepository, ref: defaultBranch})
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    }
  }, [
    targetRepository,
    getDefaultBranch,
    getImagePaths,
    setTargetRepository,
    setError,
    setImageFiles,
    setRepo,
  ])

  return {
    isLoadRef,
    isLoadImagePaths,
  }
}
