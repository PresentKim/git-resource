import {useCallback, useEffect, useMemo, useState} from 'react'

import {RandomMessageLoader} from '@/components/RandomMessageLoader'
import {
  VirtualizedFlexGrid,
  type RenderData,
} from '@/components/VitualizedFlexGrid'
import {ImageCell} from '@/components/ImageCell'
import {FilterInput} from '@/components/FilterInput'
import {Button} from '@/components/ui/button'
import {ImageViewer} from '@/components/ImageViewer'

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
import {useSettingStore} from '@/stores/settingStore'
import {downloadImagesAsZip} from '@/utils'
import {Download as DownloadIcon, Loader as LoaderIcon} from 'lucide-react'

export default function RepoView() {
  const [filter] = useFilterQuery()
  const [repo, setTargetRepository] = useTargetRepository()
  const [isLoadRef, getDefaultBranch] = usePromise(useGithubDefaultBranch())
  const [isLoadImagePaths, getImagePaths] = usePromise(useGithubImageFileTree())
  const [imageFiles, setImageFiles] = useState<GithubImageFileTree | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const columnCount = useSettingStore(state => state.filledColumnCount)
  const pixelated = useSettingStore(state => state.pixelated)

  const filters = useMemo(() => filter.split(' ').filter(Boolean), [filter])

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
  }, [repo, getDefaultBranch, getImagePaths, setTargetRepository])

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

  const handleImageClick = useCallback(
    (index: number) => {
      setViewerIndex(index)
      setViewerOpen(true)
    },
    [],
  )

  const itemRenderer = useCallback(
    ({index, item}: RenderData<string>) => (
      <ImageCell
        key={index}
        repo={repo}
        path={item}
        onClick={() => handleImageClick(index)}
      />
    ),
    [repo, handleImageClick],
  )
  const [isDownloading, downloadAll] = usePromise(
    downloadImagesAsZip.bind(null, repo, imageFiles || []),
  )

  if (error) {
    return (
      <div className="flex h-full items-center justify-center gap-2 mt-8 text-lg">
        <div className="flex h-full items-center justify-center">
          <div className="text-center" role="alert">
            <h1 className="text-4xl font-bold mb-4">An error occurred.</h1>
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
        <div className="flex items-center justify-center gap-2 mt-8 text-lg loading" aria-live="polite" aria-label="Loading default branch">
          loading default branch...
        </div>
      </RandomMessageLoader>
    )
  } else if (isLoadImagePaths) {
    return (
      <RandomMessageLoader provider={generateImageFetchMessage}>
        <div className="flex items-center justify-center gap-2 mt-8 text-lg loading" aria-live="polite" aria-label="Loading images">
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
      <div className="flex w-full items-center justify-center gap-2 mt-8 text-lg">
        <FilterInput />
        <Button
          aria-label="Download All Images"
          disabled={isDownloading}
          onClick={downloadAll}
          className="text-xs font-bold">
          {isDownloading ? (
            <>
              <LoaderIcon className="size-4 animate-spin" />
              <p className="hidden sm:block">Downloading...</p>
            </>
          ) : (
            <>
              <DownloadIcon className="size-4" />
              <p className="hidden sm:block">Download All</p>
            </>
          )}
        </Button>
      </div>
      <div role="region" aria-label="Image gallery" aria-live="polite">
        <VirtualizedFlexGrid
          items={filteredImageFiles}
          columnCount={columnCount}
          overscan={5}
          gap={5}
          render={itemRenderer}
          className={pixelated ? 'pixelated' : ''}
        />
      </div>
      {filteredImageFiles && (
        <ImageViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          images={filteredImageFiles}
          currentIndex={viewerIndex}
          repo={repo}
          onIndexChange={setViewerIndex}
        />
      )}
    </>
  )
}
