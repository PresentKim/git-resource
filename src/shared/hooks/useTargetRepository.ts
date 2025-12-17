import {useCallback, useMemo} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
import {createGithubRepo, type GithubRepo, parseGithubUrl} from '@/shared/utils'

export function useTargetRepository() {
  const {'*': path} = useParams<'*'>()
  const navigate = useNavigate()

  const targetRepository: GithubRepo = useMemo(() => {
    // If the path is valid, return the parsed repository
    if (path) {
      const parsedRepo = parseGithubUrl(path)
      if (parsedRepo) {
        return parsedRepo
      }
    }

    // If the path is invalid, return an empty repository
    return createGithubRepo('', '', '')
  }, [path])

  const setTargetRepository = useCallback(
    (owner: string, name: string, ref: string | null | undefined) => {
      navigate(`/${owner}/${name}${ref ? `/${ref}` : ''}`)
    },
    [navigate],
  )

  return [targetRepository, setTargetRepository] as const
}
