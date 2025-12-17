import {useCallback} from 'react'
import {useTargetRepository} from '@/shared/hooks/useTargetRepository'
import type {GithubRepo} from '@/shared/utils'

/**
 * Hook for setting repository
 * Handles repository setting logic
 */
export function useRepoSetting() {
  const [, setTargetRepository] = useTargetRepository()

  const setRepo = useCallback(
    (repo: GithubRepo | null) => {
      if (!repo) return
      setTargetRepository(repo.owner, repo.name, repo.ref)
    },
    [setTargetRepository],
  )

  return {
    setRepo,
  }
}
