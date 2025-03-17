import {useCallback, useEffect, useMemo, useState} from 'react'

import {Loader as LoaderIcon} from 'lucide-react'
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
  const [filter] = useFilterQuery()
  const [repo, setTargetRepository] = useTargetRepository()
  const [isLoadRef, getDefaultBranch] = usePromise(useGithubDefaultBranch())
  const [isLoadImagePaths, getImagePaths] = usePromise(useGithubImageFileTree())
  const [imageFiles, setImageFiles] = useState<GithubImageFileTree | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const filters = useMemo(() => filter.split(' ').filter(Boolean), [filter])

  const columnCount = useMemo(() => {
    const ASPECT_ITEM_SIZE = 64
    const calculatedColumns = Math.floor(window.innerWidth / ASPECT_ITEM_SIZE)
    return Math.max(2, Math.min(calculatedColumns, 15))
  }, [])

  useEffect(() => {
    if (!repo.ref) {
      getDefaultBranch(repo)
        .then(defaultBranch =>
          setTargetRepository(repo.owner, repo.name, defaultBranch),
        )
        .catch(setError)
    } else {
      getImagePaths(repo)
        .then(imageFileTree => setImageFiles(imageFileTree))
        .catch(setError)
    }
  }, [repo.owner, repo.name, repo.ref])

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
      <ImageCell key={index} repo={repo} path={item} />
    ),
    [repo.owner, repo.name, repo.ref],
  )

  if (error) {
    return (
      <div className="flex h-full items-center justify-center gap-2 mt-8 text-lg">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">오류가 발생했습니다.</h1>
            <p className="text-xl mb-4">{error.message}</p>
            <a href="/" className="text-blue-500 hover:text-blue-700 underline">
              Return to Home
            </a>
          </div>
        </div>
      </div>
    )
  }

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
