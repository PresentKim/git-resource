import {useQuery} from '@tanstack/react-query'

import {callGithubWorker} from '../callGithubWorker'
import type {GithubImageFileTree, ImageFileTreeRequest} from '../types'
import workerUrl from '../workers/imageFileTreeWorker.ts?worker&url'

export function useGithubImageFileTree(
  {owner, name, ref}: ImageFileTreeRequest,
  enabled = true,
) {
  return useQuery({
    queryKey: ['github', 'image-file-tree', owner, name, ref],
    queryFn: ({signal}) =>
      callGithubWorker<ImageFileTreeRequest, GithubImageFileTree>(
        workerUrl,
        {owner, name, ref},
        signal,
      ),
    enabled,
  })
}
