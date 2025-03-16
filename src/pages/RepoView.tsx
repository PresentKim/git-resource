import {useCallback, useEffect, useMemo, useState} from 'react'
import {RandomMessageLoader} from '@/components/RandomMessageLoader'
import {
  VirtualizedFlexGrid,
  type RenderData,
} from '@/components/VitualizedFlexGrid'
import {ImageCell} from '@/components/ImageCell'
import {FilterInput} from '@/components/FilterInput'
import {useGithubDefaultBranch} from '@/api/github/hooks/useGithubDefaultBranch'
import {useGithubImageFileTree} from '@/api/github/hooks/useGithubImageFileTree'
import type {GithubImageFileTree} from '@/api/github/types'
import {useTargetRepository} from '@/hooks/useTargetRepository'
import {useFilterQuery} from '@/hooks/useFilterQuery'
import {usePromise} from '@/hooks/usePromise'
import {
  generateBranchFetchMessage,
  generateImageFetchMessage,
  generateNoImagesMessage,
} from '@/utils/randomMessages'

export default function RepoView() {
  const [{owner, repo, ref}, setTargetRepository] = useTargetRepository()
  const [isLoadRef, getDefaultBranch] = usePromise(useGithubDefaultBranch())
  const [isLoadImagePaths, getImagePaths] = usePromise(useGithubImageFileTree())
  const [imageFiles, setImageFiles] = useState<GithubImageFileTree | null>(null)

  const [filter] = useFilterQuery()
  const filters = useMemo(() => filter.split(' ').filter(Boolean), [filter])

  const columnCount = useMemo(() => {
    const ASPECT_ITEM_SIZE = 64
    const calculatedColumns = Math.floor(window.innerWidth / ASPECT_ITEM_SIZE)
    return Math.max(2, Math.min(calculatedColumns, 15))
  }, [])

  useEffect(() => {
    if (owner && repo && !ref) {
      getDefaultBranch({owner, repo})
        .then(defaultBranch => setTargetRepository(owner, repo, defaultBranch))
        .catch(console.error)
    } else {
      getImagePaths({owner, repo, ref})
        .then(imageFileTree => setImageFiles(imageFileTree))
        .catch(console.error)
    }
  }, [owner, repo, ref, getDefaultBranch, setTargetRepository, getImagePaths])

  const filteredImageFiles = useMemo(() => {
    const result = imageFiles?.filter(path => {
      return filters.reduce((acc, filter) => {
        if (!acc || !filter) return acc
        if (filter.startsWith('-')) {
          return !path.includes(filter.slice(1))
        }

        return path.includes(filter)
      }, true)
    })
    return result
  }, [imageFiles, filters])

  const itemRenderer = useCallback(
    ({index, item}: RenderData<string>) => (
      <ImageCell key={index} owner={owner} repo={repo} ref={ref} path={item} />
    ),
    [owner, repo, ref],
  )

  if (isLoadRef) {
    return (
      <RandomMessageLoader provider={generateBranchFetchMessage}>
        <div className="flex items-center justify-center gap-2 mt-8 text-lg loading">
          loading default branch...
        </div>
      </RandomMessageLoader>
    )
  } else if (isLoadImagePaths) {
    return (
      <RandomMessageLoader provider={generateImageFetchMessage}>
        <div className="flex items-center justify-center gap-2 mt-8 text-lg loading">
          loading images...
        </div>
      </RandomMessageLoader>
    )
  } else if (!filteredImageFiles || !filteredImageFiles.length) {
    return (
      <>
        <FilterInput />
        <RandomMessageLoader provider={generateNoImagesMessage} />
      </>
    )
  }

  return (
    <>
      <FilterInput />
      <VirtualizedFlexGrid
        items={filteredImageFiles}
        columnCount={columnCount}
        overscan={5}
        gap={10}
        render={itemRenderer}
      />
    </>
  )
}
