import {Grid3x3} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {
  useSettingStore,
  type ViewerBackground,
} from '@/shared/stores/settingStore'
import {cn} from '@/shared/utils'

const BACKGROUNDS: {
  value: ViewerBackground
  label: string
  swatch: string
}[] = [
  {value: 'auto', label: 'Theme color', swatch: 'bg-background'},
  {
    value: 'checker',
    label: 'Transparency checkerboard',
    swatch: 'bg-transparent-grid',
  },
  {value: 'light', label: 'Light', swatch: 'bg-white'},
  {value: 'dark', label: 'Dark', swatch: 'bg-black'},
]

/**
 * What the viewer shows behind the image, and the pixel grid on top of it.
 * They are separate choices: the grid lines work on any background.
 */
export function ViewerDisplayControls({
  large = false,
  className,
}: {
  /** Bigger touch targets for the phone layout */
  large?: boolean
  className?: string
}) {
  const background = useSettingStore(state => state.viewerBackground)
  const setBackground = useSettingStore(state => state.setViewerBackground)
  const pixelGrid = useSettingStore(state => state.viewerPixelGrid)
  const setPixelGrid = useSettingStore(state => state.setViewerPixelGrid)

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div
        role="group"
        aria-label="Viewer background"
        className="flex items-center gap-1">
        {BACKGROUNDS.map(({value, label, swatch}) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            size={large ? 'icon' : 'sm'}
            className={cn(
              large ? 'size-11' : 'px-2 py-1',
              background === value && 'border-primary ring-1 ring-primary',
            )}
            aria-label={label}
            aria-pressed={background === value}
            title={label}
            onClick={() => setBackground(value)}>
            <span
              aria-hidden="true"
              className={cn(
                'rounded-sm border border-border',
                large ? 'size-5' : 'size-3.5',
                swatch,
              )}
            />
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant={pixelGrid ? 'secondary' : 'outline'}
        size={large ? 'icon' : 'sm'}
        className={cn(
          large ? 'size-11' : 'px-2 py-1',
          pixelGrid && 'border-primary ring-1 ring-primary',
        )}
        aria-label="Pixel grid"
        aria-pressed={pixelGrid}
        title="Pixel grid (shown when zoomed in)"
        onClick={() => setPixelGrid(!pixelGrid)}>
        <Grid3x3 className={large ? 'size-5' : 'size-3.5'} />
      </Button>
    </div>
  )
}
