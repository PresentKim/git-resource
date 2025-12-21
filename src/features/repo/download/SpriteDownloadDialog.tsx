import {memo, useState, useCallback} from 'react'
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
import {
  useDisplaySettings,
  useSettingStore,
  type SpriteSettings,
} from '@/shared/stores/settingStore'
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

export const SpriteDownloadDialog = memo(function SpriteDownloadDialog({
  open,
  onOpenChange,
}: SpriteDownloadDialogProps) {
  const repo = useRepoStore(state => state.repo)
  const filteredImageFiles = useRepoStore(state => state.filteredImageFiles)
  const mcmetaPaths = useRepoStore(state => state.mcmetaPaths)
  const {
    columnCount: displayColumnCount,
    pixelated,
    animationEnabled,
  } = useDisplaySettings()
  const {spriteSettings, setSpriteSettings} = useSettingStore()
  const githubToken = useSettingStore(state => state.githubToken)
  const {isDownloading, downloadProgress, handleDownload} = useSpriteDownload({
    repo,
    imagePaths: filteredImageFiles || [],
    mcmetaPaths,
    animationEnabled,
    githubToken,
  })

  // Use saved settings or defaults
  const [gap, setGap] = useState(() => spriteSettings.gap)
  const [backgroundColor, setBackgroundColor] = useState(
    () => spriteSettings.backgroundColor,
  )
  const [customColor, setCustomColor] = useState(
    () => spriteSettings.customColor,
  )
  const [useCustomColor, setUseCustomColor] = useState(
    () => spriteSettings.useCustomColor,
  )
  const [scale, setScale] = useState(() => spriteSettings.scale)
  // Default: opposite of pixelated setting (if pixelated is true, imageSmoothing is false)
  // Use saved value if available, otherwise based on pixelated setting
  const [imageSmoothing, setImageSmoothing] = useState(
    () => spriteSettings.imageSmoothing ?? !pixelated,
  )
  // Column count: use saved value if available, otherwise use current grid column count
  const [spriteColumns, setSpriteColumns] = useState<number | null>(
    () => spriteSettings.columns,
  )

  // Load settings when dialog opens
  useEffect(() => {
    if (open) {
      setGap(spriteSettings.gap)
      setBackgroundColor(spriteSettings.backgroundColor)
      setCustomColor(spriteSettings.customColor)
      setUseCustomColor(spriteSettings.useCustomColor)
      setScale(spriteSettings.scale)
      setImageSmoothing(spriteSettings.imageSmoothing ?? !pixelated)
      setSpriteColumns(spriteSettings.columns)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Save settings when they change
  useEffect(() => {
    if (open) {
      const newSettings: SpriteSettings = {
        gap,
        backgroundColor,
        customColor,
        useCustomColor,
        scale,
        imageSmoothing,
        columns: spriteColumns,
      }
      setSpriteSettings(newSettings)
    }
  }, [
    open,
    gap,
    backgroundColor,
    customColor,
    useCustomColor,
    scale,
    imageSmoothing,
    spriteColumns,
    setSpriteSettings,
  ])

  // Use spriteColumns if set, otherwise use displayColumnCount
  const actualColumnCount = spriteColumns ?? displayColumnCount

  // Calculate estimated sprite size
  const [sizeEstimate, setSizeEstimate] = useState<SpriteSizeEstimate | null>(
    null,
  )

  useEffect(() => {
    if (!filteredImageFiles || filteredImageFiles.length === 0) {
      setSizeEstimate(null)
      return
    }

    let cancelled = false

    estimateSpriteSize(repo, filteredImageFiles, {
      gap,
      backgroundColor: useCustomColor ? customColor : backgroundColor,
      columns: actualColumnCount,
      scale,
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
    gap,
    backgroundColor,
    customColor,
    useCustomColor,
    actualColumnCount,
    scale,
    mcmetaPaths,
    animationEnabled,
    githubToken,
  ])

  const handleDownloadClick = useCallback(async () => {
    try {
      const options: SpriteOptions = {
        gap,
        backgroundColor: useCustomColor ? customColor : backgroundColor,
        columns: actualColumnCount,
        scale,
        imageSmoothing,
      }
      await handleDownload(options)
      onOpenChange(false)
    } catch {
      // Error is already logged in the hook
    }
  }, [
    gap,
    backgroundColor,
    customColor,
    useCustomColor,
    actualColumnCount,
    scale,
    imageSmoothing,
    handleDownload,
    onOpenChange,
  ])

  const handleColorPresetClick = (value: string) => {
    setUseCustomColor(false)
    setBackgroundColor(value)
  }

  const imageCount = filteredImageFiles?.length || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Sprite Image</DialogTitle>
          <DialogDescription>
            Combine {imageCount.toLocaleString()} currently displayed images
            into a single sprite image.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Column count setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="columns-input">Column Count</Label>
              <span className="text-xs text-muted-foreground">
                {spriteColumns === null
                  ? `Current grid (${displayColumnCount} cols)`
                  : `${spriteColumns} cols`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="columns-input"
                type="number"
                min={1}
                max={100}
                value={spriteColumns === null ? '' : spriteColumns}
                onChange={e => {
                  const value = e.target.value
                  if (value === '') {
                    setSpriteColumns(null)
                  } else {
                    const num = parseInt(value, 10)
                    if (!isNaN(num) && num > 0) {
                      setSpriteColumns(num)
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
                onClick={() => setSpriteColumns(null)}
                disabled={isDownloading || spriteColumns === null}
                className="text-xs">
                Use Current Grid
              </Button>
            </div>
          </div>

          {/* Gap setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="gap-slider">Image Gap</Label>
              <span className="text-sm text-muted-foreground">{gap}px</span>
            </div>
            <Slider
              id="gap-slider"
              min={0}
              max={50}
              step={1}
              value={[gap]}
              onValueChange={([value]) => setGap(value)}
              disabled={isDownloading}
            />
            <div className="flex gap-2">
              {[0, 2, 4, 8, 16].map(value => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGap(value)}
                  disabled={isDownloading}
                  className={cn(
                    'text-xs',
                    gap === value && 'bg-accent text-accent-foreground',
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
              <span className="text-sm text-muted-foreground">{scale}x</span>
            </div>
            <Slider
              id="scale-slider"
              min={0.5}
              max={10}
              step={0.5}
              value={[scale]}
              onValueChange={([value]) => setScale(value)}
              disabled={isDownloading}
            />
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 8, 10].map(value => (
                <Button
                  key={value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(value)}
                  disabled={isDownloading}
                  className={cn(
                    'text-xs',
                    scale === value && 'bg-accent text-accent-foreground',
                  )}>
                  {value}x
                </Button>
              ))}
            </div>
            {/* Image interpolation setting (only shown when scale > 1) */}
            {scale > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="image-smoothing" className="text-sm">
                    Image Interpolation
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {imageSmoothing
                      ? 'Smooth interpolation (for regular images)'
                      : 'Pixel preservation (for pixel art)'}
                  </span>
                </div>
                <Switch
                  id="image-smoothing"
                  checked={imageSmoothing}
                  onCheckedChange={setImageSmoothing}
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
                    backgroundColor === value && !useCustomColor
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
                checked={useCustomColor}
                onChange={e => setUseCustomColor(e.target.checked)}
                disabled={isDownloading}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="custom-color" className="text-sm">
                Custom Color
              </Label>
            </div>
            {useCustomColor && (
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  disabled={isDownloading}
                  className="h-10 w-20"
                />
                <Input
                  type="text"
                  value={customColor}
                  onChange={e => setCustomColor(e.target.value)}
                  disabled={isDownloading}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
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
              'Create Sprite'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})
