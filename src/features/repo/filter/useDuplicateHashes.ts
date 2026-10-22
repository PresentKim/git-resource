import {useEffect, useMemo, useState} from 'react'
import {hashLocalFiles} from '@/shared/api/local/openLocalFiles'
import {useDuplicatesQuery} from '@/features/repo/filter/useGalleryQuery'
import type {GalleryLoading} from '@/features/repo/Gallery'
import {useRepoStore} from '@/shared/stores/repoStore'
import {isMcmetaFile} from '@/shared/utils'

/**
 * Local folders are listed without reading their files, so their images get
 * hashes only when the duplicates view needs them. Hashes them in a worker
 * and returns the progress to show meanwhile.
 */
export function useDuplicateHashes(): {
  loading: GalleryLoading | null
  error: string | null
} {
  const {duplicates} = useDuplicatesQuery()
  const source = useRepoStore(state => state.source)
  const imageFiles = useRepoStore(state => state.imageFiles)
  const fileMeta = useRepoStore(state => state.fileMeta)
  const mergeFileMeta = useRepoStore(state => state.mergeFileMeta)

  const missing = useMemo(
    () =>
      duplicates && source.kind === 'local' && imageFiles
        ? imageFiles.filter(
            path =>
              !isMcmetaFile(path) && fileMeta.get(path)?.hash === undefined,
          )
        : [],
    [duplicates, source, imageFiles, fileMeta],
  )

  // Progress and failure belong to the list they were reported for
  const [progress, setProgress] = useState<{
    for: string[]
    done: number
  } | null>(null)
  const [failure, setFailure] = useState<{
    for: string[]
    message: string
  } | null>(null)
  const failed = failure?.for === missing

  useEffect(() => {
    if (!missing.length || source.kind !== 'local' || failed) return
    const controller = new AbortController()
    hashLocalFiles(
      source,
      missing,
      done => setProgress({for: missing, done}),
      controller.signal,
    )
      .then(hashes => mergeFileMeta(hashes, 'git'))
      .catch(error => {
        if (controller.signal.aborted) return
        setFailure({
          for: missing,
          message: error instanceof Error ? error.message : String(error),
        })
      })
    return () => controller.abort()
  }, [missing, source, failed, mergeFileMeta])

  if (!missing.length) return {loading: null, error: null}
  if (failed) return {loading: null, error: failure.message}

  const done = progress?.for === missing ? progress.done : 0
  return {
    loading: {
      title: 'Looking for identical images',
      description: `Comparing file contents: ${done.toLocaleString()} of ${missing.length.toLocaleString()} images`,
      progress: (done / missing.length) * 100,
    },
    error: null,
  }
}
