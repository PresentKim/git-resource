import {useQuery} from '@tanstack/react-query'

import {callGithubWorker} from '../callGithubWorker'
import type {GithubRefs, RefsRequest} from '../types'
import workerUrl from '../workers/refsWorker.ts?worker&url'

export function useGithubRefs({owner, name}: RefsRequest, enabled = true) {
  return useQuery({
    queryKey: ['github', 'refs', owner, name],
    queryFn: ({signal}) =>
      callGithubWorker<RefsRequest, GithubRefs>(
        workerUrl,
        {owner, name},
        signal,
      ),
    enabled,
  })
}
