import {useEffect} from 'react'
import {useGithubDefaultBranch} from '@/shared/api/github/hooks/useGithubDefaultBranch'
import {useGithubImageFileTree} from '@/shared/api/github/hooks/useGithubImageFileTree'
import {useRepoPath} from '@/features/repo/useRepoPath'
import {usePromise} from '@/shared/hooks/usePromise'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for managing repository loading logic
 * Handles default branch fetching and image file tree loading
 */
export function useRepoLoading() {
  const [repoPath, setRepoPath] = useRepoPath()
  const isLoadRef = usePromise(useGithubDefaultBranch())[0]
  const getDefaultBranch = usePromise(useGithubDefaultBranch())[1]
  const isLoadImagePaths = usePromise(useGithubImageFileTree())[0]
  const getImagePaths = usePromise(useGithubImageFileTree())[1]
  const setRepo = useRepoStore(state => state.setRepo)
  const setImageFiles = useRepoStore(state => state.setImageFiles)
  const setError = useRepoStore(state => state.setError)

  useEffect(() => {
    const ref = repoPath.ref?.trim()

    // Get image files if ref is provided in URL
    if (ref) {
      setRepo(repoPath)
      getImagePaths(repoPath)
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
      getDefaultBranch(repoPath)
        .then(defaultBranch => {
          setError(null)
          setRepoPath(repoPath.owner, repoPath.name, defaultBranch)
          setRepo({...repoPath, ref: defaultBranch})
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    }
  }, [
    repoPath,
    getDefaultBranch,
    getImagePaths,
    setRepoPath,
    setError,
    setImageFiles,
    setRepo,
  ])

  return {
    isLoadRef,
    isLoadImagePaths,
  }
}
