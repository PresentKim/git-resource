import {useMemo} from 'react'
import {useParams, useNavigate} from 'react-router-dom'

import {createGithubRepo, type GithubRepo, parseGithubUrl} from '@/shared/utils'
import {useRepoStore} from '@/shared/stores/repoStore'

export function useRepoPath() {
  const {'*': path} = useParams<'*'>()
  const navigate = useNavigate()
  const setRepo = useRepoStore(state => state.setRepo)

  const repoPath: GithubRepo = useMemo(() => {
    const currentRepo = path
      ? (parseGithubUrl(path) ?? createGithubRepo('', '', ''))
      : createGithubRepo('', '', '')
    setRepo(currentRepo)
    return currentRepo
  }, [path, setRepo])

  const setRepoPath = (
    owner: string,
    name: string,
    ref: string | null | undefined,
  ) => navigate(`/${owner}/${name}${ref ? `/${ref}` : ''}`)

  return [repoPath, setRepoPath] as const
}
