import {useEffect} from 'react'
import {useGithubDefaultBranch} from '@/shared/api/github/hooks/useGithubDefaultBranch'
import {useGithubImageFileTree} from '@/shared/api/github/hooks/useGithubImageFileTree'
import {useRepoPath} from '@/features/repo/useRepoPath'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for managing repository loading logic
 * Handles default branch fetching and image file tree loading
 */
export function useRepoLoading() {
  const [repoPath, setRepoPath] = useRepoPath()
  const setRepo = useRepoStore(state => state.setRepo)
  const setImageFiles = useRepoStore(state => state.setImageFiles)
  const setError = useRepoStore(state => state.setError)

  const ref = repoPath.ref?.trim()

  // No ref provided, need to fetch default branch
  const defaultBranch = useGithubDefaultBranch(repoPath, !ref)
  // Get image files if ref is provided in URL
  const imageFileTree = useGithubImageFileTree(repoPath, !!ref)

  useEffect(() => {
    if (!ref) return

    setRepo(repoPath)
    if (imageFileTree.error) {
      setError(imageFileTree.error)
    } else if (imageFileTree.data) {
      setError(null)
      setImageFiles(imageFileTree.data)
    }
  }, [
    ref,
    repoPath,
    imageFileTree.data,
    imageFileTree.error,
    setRepo,
    setImageFiles,
    setError,
  ])

  useEffect(() => {
    if (ref) return

    if (defaultBranch.error) {
      setError(defaultBranch.error)
    } else if (defaultBranch.data) {
      setError(null)
      setRepoPath(repoPath.owner, repoPath.name, defaultBranch.data)
      setRepo({...repoPath, ref: defaultBranch.data})
    }
    // setRepoPath is recreated every render and only wraps navigate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ref,
    repoPath,
    defaultBranch.data,
    defaultBranch.error,
    setRepo,
    setError,
  ])

  return {
    isLoadRef: defaultBranch.isLoading,
    isLoadImagePaths: imageFileTree.isLoading,
  }
}
