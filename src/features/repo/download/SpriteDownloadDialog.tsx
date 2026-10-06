import {useState, useEffectEvent} from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {Button} from '@/shared/components/ui/button'
import {Input} from '@/shared/components/ui/input'
import {Label} from '@/shared/components/ui/label'
import {Slider} from '@/shared/components/ui/slider'
import {Switch} from '@/shared/components/ui/switch'
import {useSpriteDownload} from '@/features/repo/download/useSpriteDownload'
import {useRepoStore} from '@/shared/stores/repoStore'
import {useDisplaySettings, useSettingStore} from '@/shared/stores/settingStore'
import {Loader as LoaderIcon} from 'lucide-react'
import {cn} from '@/shared/utils'
import type {SpriteOptions} from '@/features/repo/download/utils/createSpriteImage'
import {
  estimateSpriteSize,
  type SpriteSizeEstimate,
} from '@/features/repo/download/utils/estimateSpriteSize'
import {useEffect} from 'react'

interface SpriteDownloadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PRESET_COLORS = [
  {label: 'Transparent', value: 'transparent'},
  {label: 'White', value: '#ffffff'},
  {label: 'Black', value: '#000000'},
  {label: 'Gray', value: '#808080'},
] as const

export function SpriteDownloadDialog({
  open,
  onOpenChange,
}: SpriteDownloadDialogProps) {
  const repo = useRepoStore(state => state.repo)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const mcmetaPaths = useRepoStore(state => state.mcmetaPaths)
  const {columnCount: displayColumnCount, animationEnabled} =
    useDisplaySettings()
  const {spriteSettings, setSpriteSettings} = useSettingStore()
  const githubToken = useSettingStore(state => state.githubToken)
  const {isDownloading, downloadProgress, handleDownload} = useSpriteDownload({
    repo,
    imagePaths: filteredImageFiles || [],
    mcmetaPaths,
    animationEnabled,
    githubToken,
  })

  const actualColumnCount = spriteSettings.columns ?? displayColumnCount

  const [error, setError] = useState<string | null>(null)
  const [sizeEstimate, setSizeEstimate] = useState<SpriteSizeEstimate | null>(
    null,
  )

  const onImageEmpty = useEffectEvent(() => setSizeEstimate(null))

  useEffect(() => {
    if (!filteredImageFiles || filteredImageFiles.length === 0) {
      onImageEmpty()
      return
    }

    let cancelled = false

    estimateSpriteSize(repo, filteredImageFiles, {
      ...spriteSettings,
      columns: actualColumnCount,
      mcmetaPaths,
      animationEnabled,
      githubToken,
    }).then(estimate => {
      if (!cancelled) {
        setSizeEstimate(estimate)
      }
    })

    return () => {
      cancelled = true
    }
  }, [
    repo,
    filteredImageFiles,
    actualColumnCount,
    mcmetaPaths,
    animationEnabled,
    githubToken,
    spriteSettings,
  ])

  const handleDownloadClick = async () => {
    const options: SpriteOptions = {
      ...spriteSettings,
      backgroundColor: spriteSettings.useCustomColor
        ? spriteSettings.customColor
        : spriteSettings.backgroundColor,
      columns: actualColumnCount,
    }
    setError(null)
    try {
      await handleDownload(options)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  const handleColorPresetClick = (value: string) => {
    setSpriteSettings({
      ...spriteSettings,
      useCustomColor: false,
      backgroundColor: value,
    })
  }

  const imageCount = filteredImageFiles?.length || 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Screenshot</DialogTitle>
          <DialogDescription>
            Combine {imageCount.toLocaleString()} currently displayed images
            into a single image.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Column count setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="columns-input">Column Count</Label>
              <span className="text-xs text-muted-foreground">
                {actualColumnCount} cols
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="columns-input"
                type="number"
                min={1}
                max={100}
                value={
                  spriteSettings.columns === null ? '' : spriteSettings.columns
                }
                onChange={e => {
                  const value = e.target.value
                  if (value === '') {
                    setSpriteSettings({
                      ...spriteSettings,
                      columns: null,
                    })
                  } else {
                    const num = parseInt(value, 10)
                    if (!isNaN(num) && num > 0) {
                      setSpriteSettings({
                        ...spriteSettings,
                        columns: num,
                      })
                    }
                  }
                }}
                placeholder={`Current: ${displayColumnCount} cols`}
                disabled={isDownloading}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSpriteSettings({
                    ...spriteSettings,
                    columns: null,
                  })
                }
                disabled={isDownloading || spriteSettings.columns === null}
                className="text-xs">
                Use Current Grid
              </Button>
            </div>
          </div>

          {/* Gap setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="gap-slider">Image Gap</Label>
              <span className="text-sm text-muted-foreground">
                {spriteSettings.gap}px
              </span>
            </div>
            <Slider
              id="gap-slider"
              min={0}
              max={50}
              step={1}
              value={[spriteSettings.gap]}
              onValueChange={value =>
                setSpriteSettings({...spriteSettings, gap: value as number})
              }
              disabled={isDownloading}
            />
            <div className="flex gap-2">
              {[0, 2, 4, 8, 16].map(value => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSpriteSettings({
                      ...spriteSettings,
                      gap: value,
                    })
                  }
                  disabled={isDownloading}
                  className={cn(
                    'text-xs',
                    spriteSettings.gap === value &&
                      'bg-accent text-accent-foreground',
                  )}>
                  {value}px
                </Button>
              ))}
            </div>
          </div>

          {/* Scale setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="scale-slider">Scale Factor</Label>
              <span className="text-sm text-muted-foreground">
                {spriteSettings.scale}x
              </span>
            </div>
            <Slider
              id="scale-slider"
              min={0.5}
              max={10}
              step={0.5}
              value={[spriteSettings.scale]}
              onValueChange={value =>
                setSpriteSettings({
                  ...spriteSettings,
                  scale: value as number,
                })
              }
              disabled={isDownloading}
            />
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 8, 10].map(value => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSpriteSettings({
                      ...spriteSettings,
                      scale: value,
                    })
                  }
                  disabled={isDownloading}
                  className={cn(
                    'text-xs',
                    spriteSettings.scale === value &&
                      'bg-accent text-accent-foreground',
                  )}>
                  {value}x
                </Button>
              ))}
            </div>
            {/* Image interpolation setting (only shown when scale > 1) */}
            {spriteSettings.scale > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex flex-col gap-1">
                  <Label
                    id="image-smoothing-label"
                    htmlFor="image-smoothing"
                    className="text-sm">
                    Image Interpolation
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {spriteSettings.imageSmoothing
                      ? 'Smooth interpolation (for regular images)'
                      : 'Pixel preservation (for pixel art)'}
                  </span>
                </div>
                {/* The id lands on the hidden checkbox, so the switch itself
                    is named through aria-labelledby */}
                <Switch
                  id="image-smoothing"
                  aria-labelledby="image-smoothing-label"
                  checked={spriteSettings.imageSmoothing}
                  onCheckedChange={e =>
                    setSpriteSettings({
                      ...spriteSettings,
                      imageSmoothing: e,
                    })
                  }
                  disabled={isDownloading}
                />
              </div>
            )}
          </div>

          {/* Estimated size display */}
          {sizeEstimate?.canCalculate && (
            <div className="rounded-md border border-border/60 bg-card/40 p-3 space-y-1">
              <div className="text-xs font-semibold text-foreground">
                Estimated Result Image
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>
                  Size: {sizeEstimate.width.toLocaleString()} ×{' '}
                  {sizeEstimate.height.toLocaleString()}px
                </div>
                <div>
                  Layout: {sizeEstimate.columns} cols × {sizeEstimate.rows} rows
                </div>
                <div>
                  Estimated file size: ~
                  {sizeEstimate.estimatedFileSizeMB.toFixed(2)} MB
                </div>
              </div>
            </div>
          )}

          {/* Background color setting */}
          <div className="space-y-3">
            <Label>Background Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map(({label, value}) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleColorPresetClick(value)}
                  disabled={isDownloading}
                  className={cn(
                    'rounded-md border-2 p-2 text-xs transition-colors',
                    spriteSettings.backgroundColor === value &&
                      !spriteSettings.useCustomColor
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:bg-muted',
                    isDownloading && 'opacity-50 cursor-not-allowed',
                  )}>
                  <div
                    className={cn(
                      'mx-auto mb-1 h-6 w-full rounded',
                      value === 'transparent' && 'bg-transparent-grid',
                      value !== 'transparent' && 'border border-border',
                    )}
                    style={
                      value !== 'transparent'
                        ? {backgroundColor: value}
                        : undefined
                    }
                  />
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="custom-color"
                checked={spriteSettings.useCustomColor}
                onChange={e =>
                  setSpriteSettings({
                    ...spriteSettings,
                    useCustomColor: e.target.checked,
                  })
                }
                disabled={isDownloading}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="custom-color" className="text-sm">
                Custom Color
              </Label>
            </div>
            {spriteSettings.useCustomColor && (
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={spriteSettings.customColor}
                  onChange={e =>
                    setSpriteSettings({
                      ...spriteSettings,
                      customColor: e.target.value,
                    })
                  }
                  disabled={isDownloading}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={spriteSettings.customColor}
                  onChange={e =>
                    setSpriteSettings({
                      ...spriteSettings,
                      customColor: e.target.value,
                    })
                  }
                  disabled={isDownloading}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            Could not create the screenshot: {error}
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDownloading}>
            Cancel
          </Button>
          <Button
            onClick={handleDownloadClick}
            disabled={isDownloading || imageCount === 0}
            className="min-w-[120px]">
            {isDownloading ? (
              <div className="flex items-center gap-2">
                <LoaderIcon className="size-4 animate-spin" />
                <span>
                  {downloadProgress !== null
                    ? `Creating ${downloadProgress}%`
                    : 'Creating...'}
                </span>
              </div>
            ) : (
              'Save screenshot'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
