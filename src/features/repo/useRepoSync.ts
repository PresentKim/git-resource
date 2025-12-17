import {useEffect} from 'react'
import {useTargetRepository} from '@/shared/hooks/useTargetRepository'
import {useRepoStore} from '@/shared/stores/repoStore'

/**
 * Hook for synchronizing repository from URL to store
 * Handles repo state synchronization between URL and store
 */
export function useRepoSync() {
  const [repoFromUrl] = useTargetRepository()
  const repo = useRepoStore(state => state.repo)
  const setRepo = useRepoStore(state => state.setRepo)

  useEffect(() => {
    if (
      repoFromUrl.owner !== repo.owner ||
      repoFromUrl.name !== repo.name ||
      repoFromUrl.ref !== repo.ref
    ) {
      setRepo(repoFromUrl)
    }
  }, [repoFromUrl, repo, setRepo])

  return {
    repo,
    repoFromUrl,
  }
}
