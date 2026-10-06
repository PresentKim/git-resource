import {useMemo} from 'react'
import {AlertTriangle, Loader as LoaderIcon} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {LARGE_DOWNLOAD_THRESHOLD} from '@/features/repo/download/utils/downloadImagesAsZip'
import {
  resolveDuplicatePaths,
  transformPath,
  type FlattenMode,
} from '@/shared/utils'
import {cn} from '@/shared/utils'

const FLATTEN_OPTIONS: {
  mode: FlattenMode
  label: string
  description: string
}[] = [
  {
    mode: 'original',
    label: 'Original folders',
    description: "Keeps the repository's folder structure",
  },
  {
    mode: 'last-level',
    label: 'Last folder only',
    description: 'Keeps just the folder each image is in',
  },
  {
    mode: 'flat',
    label: 'No folders',
    description: 'Puts every image at the top level',
  },
]

/** How many files end up with a different name because theirs was taken */
function countRenamed(paths: string[], mode: FlattenMode): number {
  if (mode === 'original') return 0
  let renamed = 0
  for (const [original, final] of resolveDuplicatePaths(paths, mode)) {
    if (final !== transformPath(original, mode)) renamed += 1
  }
  return renamed
}

interface DownloadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The images that will be downloaded */
  imagePaths: string[]
  flattenMode: FlattenMode
  onFlattenModeChange: (mode: FlattenMode) => void
  isDownloading: boolean
  /** 0-100 while downloading, null before it reports progress */
  progress: number | null
  onDownload: () => void
}

/**
 * Asks how the filtered images should be downloaded. Shows what each folder
 * option would do to a real path from the current list, and how many files
 * would have to be renamed because their names collide.
 */
export function DownloadDialog({
  open,
  onOpenChange,
  imagePaths,
  flattenMode,
  onFlattenModeChange,
  isDownloading,
  progress,
  onDownload,
}: DownloadDialogProps) {
  const count = imagePaths.length

  // A path with a few folders shows the difference between the options best
  const samplePath = useMemo(
    () => imagePaths.find(path => path.split('/').length >= 3) ?? imagePaths[0],
    [imagePaths],
  )

  // Only worked out while the dialog is open
  const renamedCounts = useMemo(
    () =>
      open
        ? Object.fromEntries(
            FLATTEN_OPTIONS.map(({mode}) => [
              mode,
              countRenamed(imagePaths, mode),
            ]),
          )
        : null,
    [open, imagePaths],
  )

  const isLarge = count > LARGE_DOWNLOAD_THRESHOLD

  return (
    <Dialog
      open={open}
      // The download keeps running if the dialog is closed, but its progress
      // would be lost, so closing is not offered until it is done
      onOpenChange={nextOpen => {
        if (!nextOpen && isDownloading) return
        onOpenChange(nextOpen)
      }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isDownloading}>
        <DialogHeader>
          <DialogTitle>Download images</DialogTitle>
          <DialogDescription>
            {count.toLocaleString()} {count === 1 ? 'image' : 'images'} will be
            saved as a single ZIP file.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2" disabled={isDownloading}>
          <legend className="mb-2 text-xs font-semibold">
            Folder structure
          </legend>
          {FLATTEN_OPTIONS.map(({mode, label, description}) => {
            const renamed = renamedCounts?.[mode] ?? 0
            return (
              <label
                key={mode}
                className={cn(
                  'block cursor-pointer rounded-lg border border-border/60 p-3 transition-colors',
                  'hover:bg-muted/50 has-checked:border-ring has-checked:bg-accent/40',
                  'has-focus-visible:ring-2 has-focus-visible:ring-ring/50',
                  'has-disabled:cursor-not-allowed has-disabled:opacity-60',
                )}>
                <span className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="download-flatten-mode"
                    value={mode}
                    checked={flattenMode === mode}
                    onChange={() => onFlattenModeChange(mode)}
                    className="mt-0.5 accent-current"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {description}
                    </span>
                    {samplePath && (
                      <span
                        className="mt-1.5 block truncate font-mono text-[11px] text-muted-foreground"
                        title={transformPath(samplePath, mode)}>
                        {transformPath(samplePath, mode)}
                      </span>
                    )}
                    {renamed > 0 && (
                      <span className="mt-1 block text-[11px] text-chart-5">
                        {renamed.toLocaleString()}{' '}
                        {renamed === 1 ? 'file shares' : 'files share'} a name
                        and will be numbered (-1, -2, …)
                      </span>
                    )}
                  </span>
                </span>
              </label>
            )
          })}
        </fieldset>

        {isLarge && !isDownloading && (
          <div
            role="note"
            className="flex items-start gap-2 rounded-lg border border-chart-5/40 bg-chart-5/10 p-3 text-xs">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-chart-5" />
            <p>
              This is a large download. It may take a long time and use a lot of
              memory; the images are fetched in batches.
            </p>
          </div>
        )}

        {isDownloading && (
          <div className="space-y-1.5" aria-live="polite">
            <div className="flex items-center justify-between text-xs">
              <span>Downloading…</span>
              <span>{progress !== null ? `${progress}%` : ''}</span>
            </div>
            <div
              role="progressbar"
              aria-label="Download progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress ?? undefined}
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-accent-foreground transition-[width] duration-150 ease-out"
                style={{width: `${progress ?? 0}%`}}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDownloading}>
            Cancel
          </Button>
          <Button
            onClick={onDownload}
            disabled={isDownloading || count === 0}
            className="min-w-28">
            {isDownloading ? (
              <span className="flex items-center gap-2">
                <LoaderIcon className="size-4 animate-spin" />
                Downloading
              </span>
            ) : (
              'Download'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
