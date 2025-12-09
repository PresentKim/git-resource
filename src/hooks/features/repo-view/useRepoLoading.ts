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

  const repo = useRepoStore(state => state.repo)
  const repoFromUrl = useTargetRepository()[0]
  const setRepo = useRepoStore(state => state.setRepo)
  const setImageFiles = useRepoStore(state => state.setImageFiles)
  const setError = useRepoStore(state => state.setError)

  useEffect(() => {
    // Only proceed if we have owner and name
    if (!repo.owner || !repo.name) {
      return
    }

    // Check if ref is provided in URL first (most reliable source)
    // This prevents unnecessary defaultBranch lookup when branch is already in URL
    const refFromUrl = repoFromUrl.ref?.trim()
    const refFromStore = repo.ref?.trim()

    if (refFromUrl) {
      // Ref is provided in URL, directly fetch image files
      // Ensure store is synced with URL
      if (refFromUrl !== refFromStore) {
        setRepo({...repo, ref: refFromUrl})
      }
      getImagePaths({...repo, ref: refFromUrl})
        .then(imageFileTree => {
          setError(null)
          setImageFiles(imageFileTree)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    } else if (refFromStore) {
      // Ref is in store but not in URL, use store ref
      getImagePaths(repo)
        .then(imageFileTree => {
          setError(null)
          setImageFiles(imageFileTree)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    } else {
      // No ref provided, need to fetch default branch
      getDefaultBranch(repo)
        .then(defaultBranch => {
          setError(null)
          setTargetRepository(repo.owner, repo.name, defaultBranch)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    }
  }, [
    repo,
    repoFromUrl,
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
