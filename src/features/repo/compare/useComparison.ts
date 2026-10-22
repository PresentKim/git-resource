import {useEffect, useMemo} from 'react'
import {useGithubImageFileTree} from '@/shared/api/github/hooks/useGithubImageFileTree'
import {useCompareQuery} from '@/features/repo/filter/useGalleryQuery'
import {
  useGithubRepo,
  useRepoStore,
  type ActiveComparison,
  type CompareStatus,
} from '@/shared/stores/repoStore'
import {compareListings} from '@/shared/utils/compareListings'

function describeError(error: Error, baseRef: string): string {
  return error.message.includes('404')
    ? `No branch, tag or commit named "${baseRef}" was found in this repository.`
    : error.message
}

/**
 * Compares the open ref with the one in the URL (?compare=), loading its
 * file list like the open one's, and puts the result in the repo store
 */
export function useComparison() {
  const repo = useGithubRepo()
  const {compareRef} = useCompareQuery()
  const setComparison = useRepoStore(state => state.setComparison)

  const baseRef = compareRef?.trim() || null
  const owner = repo?.owner ?? ''
  const name = repo?.name ?? ''
  const ref = repo?.ref ?? ''
  const active = Boolean(owner && name && ref && baseRef)

  // The same queries as the open ref's, so its list is not fetched twice
  const current = useGithubImageFileTree({owner, name, ref}, active)
  const base = useGithubImageFileTree({owner, name, ref: baseRef ?? ''}, active)

  const result = useMemo((): {
    comparison: ActiveComparison | null
    status: CompareStatus | null
  } => {
    if (!active || !baseRef) return {comparison: null, status: null}
    const error = base.error ?? current.error
    if (error) {
      return {
        comparison: null,
        status: {baseRef, loading: false, error: describeError(error, baseRef)},
      }
    }
    if (!current.data || !base.data) {
      return {comparison: null, status: {baseRef, loading: true, error: null}}
    }
    try {
      return {
        comparison: {...compareListings(current.data, base.data), baseRef},
        status: null,
      }
    } catch (compareError) {
      return {
        comparison: null,
        status: {
          baseRef,
          loading: false,
          error:
            compareError instanceof Error
              ? compareError.message
              : String(compareError),
        },
      }
    }
  }, [active, baseRef, current.data, current.error, base.data, base.error])

  useEffect(() => {
    setComparison(result.comparison, result.status)
  }, [result, setComparison])
}
