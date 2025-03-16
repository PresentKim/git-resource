import {type GithubRepo, createGithubRepo} from '@/utils'
import {useCallback, useMemo} from 'react'
import {useParams, useNavigate} from 'react-router-dom'

interface Params extends Record<string, string | undefined> {
  owner: string | undefined
  repo: string | undefined
  '*': string | undefined
}

export function useTargetRepository() {
  const {owner, repo, '*': ref} = useParams<Params>()
  const navigate = useNavigate()

  const targetRepository: GithubRepo = useMemo(
    () => createGithubRepo(owner ?? '', repo ?? '', ref ?? ''),
    [owner, repo, ref],
  )

  const setTargetRepository = useCallback(
    (owner: string, name: string, ref: string | null | undefined) => {
      navigate(`/${owner}/${name}${ref ? `/${ref}` : ''}`)
    },
    [navigate],
  )

  return [targetRepository, setTargetRepository] as const
}
