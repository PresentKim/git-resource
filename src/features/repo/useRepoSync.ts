import {useEffect} from 'react'
import {useRepoPath} from '@/features/repo/useRepoPath'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for synchronizing repository from URL to store
 * Handles repo state synchronization between URL and store
 */
export function useRepoSync() {
  const [repoPath] = useRepoPath()
  const repo = useRepoStore(state => state.repo)
  const setRepo = useRepoStore(state => state.setRepo)

  useEffect(() => {
    if (
      repoPath.owner !== repo.owner ||
      repoPath.name !== repo.name ||
      repoPath.ref !== repo.ref
    ) {
      setRepo(repoPath)
    }
  }, [repoPath, repo, setRepo])

  return {
    repo,
    repoFromUrl: repoPath,
  }
}
