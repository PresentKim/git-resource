import {useCallback, useEffect, useRef} from 'react'
import {useGithubDefaultBranch} from '@/api/github/hooks/useGithubDefaultBranch'
import {useGithubImageFileTree} from '@/api/github/hooks/useGithubImageFileTree'
import {useTargetRepository} from '@/hooks/useTargetRepository'
import {useFilterQuery} from '@/hooks/useFilterQuery'
import {usePromise} from '@/hooks/usePromise'
import {useRepoStore} from '@/stores/repoStore'

export function useRepoView() {
  const [filter] = useFilterQuery()
  const [repoFromUrl, setTargetRepository] = useTargetRepository()
  const isLoadRef = usePromise(useGithubDefaultBranch())[0]
  const getDefaultBranch = usePromise(useGithubDefaultBranch())[1]
  const isLoadImagePaths = usePromise(useGithubImageFileTree())[0]
  const getImagePaths = usePromise(useGithubImageFileTree())[1]

  // Get state from repoStore
  const repo = useRepoStore(state => state.repo)
  const imageFiles = useRepoStore(state => state.imageFiles)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const error = useRepoStore(state => state.error)
  const viewerState = useRepoStore(state => state.viewerState)
  const isFiltering = useRepoStore(state => state.isFiltering)
  const setRepo = useRepoStore(state => state.setRepo)
  const setImageFiles = useRepoStore(state => state.setImageFiles)
  const setError = useRepoStore(state => state.setError)
  const setViewerState = useRepoStore(state => state.setViewerState)
  const updateFilteredImages = useRepoStore(state => state.updateFilteredImages)

  // Sync repo from URL to store
  useEffect(() => {
    if (
      repoFromUrl.owner !== repo.owner ||
      repoFromUrl.name !== repo.name ||
      repoFromUrl.ref !== repo.ref
    ) {
      setRepo(repoFromUrl)
    }
  }, [repoFromUrl, repo, setRepo])

  // Update filtered images when filter changes
  useEffect(() => {
    updateFilteredImages(filter)
  }, [filter, updateFilteredImages])

  // Load default branch or image files
  useEffect(() => {
    // Only proceed if we have owner and name
    if (!repo.owner || !repo.name) {
      return
    }

    // Check if ref is provided in URL first (most reliable source)
    // This prevents unnecessary defaultBranch lookup when branch is already in URL
    const refFromUrl = repoFromUrl.ref?.trim()
    const refFromStore = repo.ref?.trim()

    if (refFromUrl) {
      // Ref is provided in URL, directly fetch image files
      // Ensure store is synced with URL
      if (refFromUrl !== refFromStore) {
        setRepo({...repo, ref: refFromUrl})
      }
      getImagePaths({...repo, ref: refFromUrl})
        .then(imageFileTree => {
          setError(null)
          setImageFiles(imageFileTree)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    } else if (refFromStore) {
      // Ref is in store but not in URL, use store ref
      getImagePaths(repo)
        .then(imageFileTree => {
          setError(null)
          setImageFiles(imageFileTree)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    } else {
      // No ref provided, need to fetch default branch
      getDefaultBranch(repo)
        .then(defaultBranch => {
          setError(null)
          setTargetRepository(repo.owner, repo.name, defaultBranch)
        })
        .catch(err => {
          setError(err instanceof Error ? err : new Error(String(err)))
        })
    }
  }, [
    repo,
    repoFromUrl,
    getDefaultBranch,
    getImagePaths,
    setTargetRepository,
    setError,
    setImageFiles,
    setRepo,
  ])

  const handleImageClick = useCallback(
    (index: number) => {
      setViewerState({open: true, currentIndex: index})
    },
    [setViewerState],
  )

  // Create stable click handlers map to avoid recreating functions
  const clickHandlersRef = useRef<Map<number, () => void>>(new Map())

  const getClickHandler = useCallback(
    (index: number) => {
      if (!clickHandlersRef.current.has(index)) {
        clickHandlersRef.current.set(index, () => handleImageClick(index))
      }
      return clickHandlersRef.current.get(index)!
    },
    [handleImageClick],
  )

  return {
    // Loading states
    isLoadRef,
    isLoadImagePaths,
    isFiltering,

    // Data
    imageFiles,
    filteredImageFiles,
    error,
    viewerState,

    // Handlers
    handleImageClick,
    getClickHandler,
    setViewerState,
  }
}
