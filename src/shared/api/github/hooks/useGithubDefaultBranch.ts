import {useQuery} from '@tanstack/react-query'

import {callGithubWorker} from '../callGithubWorker'
import type {DefaultBranchRequest, GithubDefaultBranch} from '../types'
import workerUrl from '../workers/defaultBranchWorker.ts?worker&url'

export function useGithubDefaultBranch(
  {owner, name}: DefaultBranchRequest,
  enabled = true,
) {
  return useQuery({
    queryKey: ['github', 'default-branch', owner, name],
    queryFn: ({signal}) =>
      callGithubWorker<DefaultBranchRequest, GithubDefaultBranch>(
        workerUrl,
        {owner, name},
        signal,
      ),
    enabled,
  })
}
