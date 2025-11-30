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
import {downloadImagesAsZip, isMcmetaFile, cn} from '@/utils'
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
  const animationEnabled = useSettingStore(state => state.animationEnabled)
  const gridBackground = useSettingStore(state => state.gridBackground)

  const filters = useMemo(() => filter.split(' ').filter(Boolean), [filter])

  // Separate image files and mcmeta files
  const {imageOnlyFiles, mcmetaPaths} = useMemo(() => {
    if (!imageFiles) {
      return {imageOnlyFiles: null, mcmetaPaths: new Set<string>()}
    }
    const mcmeta = new Set<string>()
    const images: string[] = []

    for (const path of imageFiles) {
      if (isMcmetaFile(path)) {
        mcmeta.add(path)
      } else {
        images.push(path)
      }
    }

    return {imageOnlyFiles: images, mcmetaPaths: mcmeta}
  }, [imageFiles])

  const totalCount = imageOnlyFiles?.length ?? 0

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
    const result = imageOnlyFiles?.filter(path => {
      return filters.reduce((acc, filter) => {
        if (!acc || !filter) return acc
        if (filter.startsWith('-')) {
          return !path.includes(filter.slice(1))
        }

        return path.includes(filter)
      }, true)
    })
    return result
  }, [imageOnlyFiles, filters])

  const handleImageClick = useCallback((index: number) => {
    setViewerIndex(index)
    setViewerOpen(true)
  }, [])

  const itemRenderer = useCallback(
    ({index, item}: RenderData<string>) => (
      <ImageCell
        key={index}
        repo={repo}
        path={item}
        onClick={() => handleImageClick(index)}
        mcmetaPaths={mcmetaPaths}
        animationEnabled={animationEnabled}
      />
    ),
    [repo, handleImageClick, mcmetaPaths, animationEnabled],
  )
  const [isDownloading, downloadAll] = usePromise(
    downloadImagesAsZip.bind(null, repo, imageOnlyFiles || []),
  )

  return (
    <section
      aria-label="Repository image viewer"
      className={cn(
        'flex w-full flex-col gap-3 sm:gap-4 px-1 py-2 sm:px-2',
        gridBackground === 'auto' && 'bg-background',
        gridBackground === 'white' && 'bg-white',
        gridBackground === 'black' && 'bg-black',
        gridBackground === 'transparent' && 'bg-transparent-grid',
      )}>
      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:gap-3">
        <div className="flex-1 sm:order-2">
          <FilterInput />
        </div>

        <div className="mt-1 flex items-center justify-between gap-2 text-[0.7rem] text-muted-foreground sm:order-1 sm:mt-0 sm:flex-1 sm:justify-start sm:text-xs">
          <span className="rounded-full bg-background/70 px-2 py-1">
            Showing{' '}
            <span className="font-semibold text-accent">
              {filteredImageFiles?.length ?? 0}
            </span>
            {' of '}
            {totalCount.toLocaleString()} images
          </span>
          <Button
            aria-label="Download all currently visible images as ZIP"
            disabled={isDownloading || !filteredImageFiles?.length}
            onClick={downloadAll}
            size="sm"
            variant="outline"
            className="text-[0.7rem] font-semibold sm:text-xs">
            {isDownloading ? (
              <>
                <LoaderIcon className="size-4 animate-spin" />
                <span>DOWNLOADING VISIBLE...</span>
              </>
            ) : (
              <>
                <DownloadIcon className="size-4" />
                <span>DOWNLOAD VISIBLE</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive-foreground">
          <p className="text-base font-semibold">
            Something went wrong while loading images.
          </p>
          <p className="max-w-xl text-xs text-muted-foreground">
            {error.message}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>· Check that the repository URL is valid and public.</span>
            <span>· You may have hit the GitHub API rate limit.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
            className="mt-1">
            Try again
          </Button>
        </div>
      )}

      {isLoadRef || isLoadImagePaths ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border/60 bg-card/40 p-6 sm:p-8">
          <RandomMessageLoader
            provider={
              isLoadRef ? generateBranchFetchMessage : generateImageFetchMessage
            }>
            <div
              className="flex flex-col items-center gap-3 text-center"
              aria-live="polite">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderIcon className="size-4 animate-spin" />
                <span>
                  {isLoadRef
                    ? 'Fetching default branch...'
                    : 'Fetching image list...'}
                </span>
              </div>
            </div>
          </RandomMessageLoader>
        </div>
      ) : !filteredImageFiles || !filteredImageFiles.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 bg-card/40 p-6 text-center">
          <RandomMessageLoader provider={generateNoImagesMessage} />
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>No images were found for this repository and filter.</p>
            <ul className="space-y-1 text-left">
              <li>· Make sure the repo contains PNG/JPEG/GIF/SVG images.</li>
              <li>· Check that the filter does not exclude everything.</li>
            </ul>
          </div>
        </div>
      ) : (
        <>
          <div role="region" aria-label="Image gallery" aria-live="polite">
            <VirtualizedFlexGrid
              items={filteredImageFiles}
              columnCount={columnCount}
              overscan={5}
              gap={8}
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
              mcmetaPaths={mcmetaPaths}
            />
          )}
        </>
      )}
    </section>
  )
}
