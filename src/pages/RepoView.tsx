import {useCallback, useEffect, useMemo, useState} from 'react'

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
import {generateNoImagesMessage} from '@/utils/randomMessages'
import {RandomMessageLoader} from '@/components/RandomMessageLoader'
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
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null)

  // Optimize filter parsing: separate include and exclude filters
  const {includeFilters, excludeFilters} = useMemo(() => {
    const rawFilters = filter.split(' ').filter(Boolean)
    const include: string[] = []
    const exclude: string[] = []

    for (const f of rawFilters) {
      if (f.startsWith('-')) {
        const excludeTerm = f.slice(1)
        if (excludeTerm) {
          exclude.push(excludeTerm)
        }
      } else {
        include.push(f)
      }
    }

    return {includeFilters: include, excludeFilters: exclude}
  }, [filter])

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

  // Optimized filtering algorithm
  const filteredImageFiles = useMemo(() => {
    if (!imageOnlyFiles) return null

    // Early return if no filters
    if (includeFilters.length === 0 && excludeFilters.length === 0) {
      return imageOnlyFiles
    }

    return imageOnlyFiles.filter(path => {
      const lowerPath = path.toLowerCase()
      
      // All include filters must match (AND logic)
      if (includeFilters.length > 0) {
        const allIncludeMatch = includeFilters.every(term =>
          lowerPath.includes(term.toLowerCase()),
        )
        if (!allIncludeMatch) {
          return false
        }
      }

      // Path must not match any exclude filter
      if (excludeFilters.length > 0) {
        const matchesExclude = excludeFilters.some(term =>
          lowerPath.includes(term.toLowerCase()),
        )
        if (matchesExclude) {
          return false
        }
      }

      return true
    })
  }, [imageOnlyFiles, includeFilters, excludeFilters])

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
  const downloadVisibleImages = useCallback(async () => {
    const paths = filteredImageFiles || []
    if (!paths.length) return

    setDownloadProgress(0)
    try {
      await downloadImagesAsZip(repo, paths, (completed, total) => {
        const percent = Math.round((completed / total) * 100)
        setDownloadProgress(percent)
      })
    } finally {
      setDownloadProgress(100)
      // Briefly show 100%, then reset
      setTimeout(() => setDownloadProgress(null), 500)
    }
  }, [repo, filteredImageFiles])
  const [isDownloading, downloadAll] = usePromise(downloadVisibleImages)

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

        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground sm:order-1 sm:mt-0 sm:flex-1 sm:justify-start">
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
            className="text-xs font-semibold flex flex-col items-center gap-0.5 min-w-[190px]">
            {isDownloading ? (
              <>
                <div className="flex items-center gap-1">
                  <LoaderIcon className="size-4 animate-spin" />
                  <span>
                    {downloadProgress !== null
                      ? `DOWNLOADING ${downloadProgress}%`
                      : 'DOWNLOADING VISIBLE...'}
                  </span>
                </div>
                {downloadProgress !== null && (
                  <div
                    className="mt-0.5 h-1 w-full rounded-full bg-muted overflow-hidden"
                    aria-hidden="true">
                    <div
                      className="h-full bg-accent transition-[width] duration-150 ease-out"
                      style={{width: `${downloadProgress}%`}}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1">
                <DownloadIcon className="size-4" />
                <span>DOWNLOAD VISIBLE</span>
              </div>
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
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border/60 bg-card/40 p-8 sm:p-12">
          <div
            className="flex flex-col items-center gap-4 text-center max-w-md"
            aria-live="polite">
            <div className="flex flex-col items-center gap-3">
              <LoaderIcon className="size-8 animate-spin text-accent" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground">
                  {isLoadRef
                    ? 'Fetching default branch'
                    : 'Fetching image list'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isLoadRef
                    ? 'Detecting the default branch for this repository...'
                    : 'Loading all image files from the repository...'}
                </p>
              </div>
            </div>
            <div className="w-full max-w-xs">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden relative">
                <div className="absolute h-full w-[30%] bg-accent animate-[loading_1.5s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
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
