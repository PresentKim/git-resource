import {Grid3x3} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {useSettingStore} from '@/shared/stores/settingStore'
import {cn} from '@/shared/utils'

/**
 * Two independent toggles for what is drawn on the image itself: a
 * transparency checkerboard behind it and pixel grid lines over it. Both
 * follow the image's own pixels.
 */
export function ViewerDisplayControls({
  large = false,
  className,
}: {
  /** Bigger touch targets for the phone layout */
  large?: boolean
  className?: string
}) {
  const checker = useSettingStore(state => state.viewerChecker)
  const setChecker = useSettingStore(state => state.setViewerChecker)
  const pixelGrid = useSettingStore(state => state.viewerPixelGrid)
  const setPixelGrid = useSettingStore(state => state.setViewerPixelGrid)

  const toggles = [
    {
      label: 'Transparency checkerboard',
      title: 'Transparency checkerboard',
      pressed: checker,
      onToggle: () => setChecker(!checker),
      icon: (
        <span
          aria-hidden="true"
          className={cn(
            'image-checker rounded-sm border border-border',
            large ? 'size-5' : 'size-3.5',
          )}
          style={{backgroundSize: large ? '10px 10px' : '7px 7px'}}
        />
      ),
    },
    {
      label: 'Pixel grid',
      title: 'Pixel grid (shown when zoomed in)',
      pressed: pixelGrid,
      onToggle: () => setPixelGrid(!pixelGrid),
      icon: <Grid3x3 className={large ? 'size-5' : 'size-3.5'} />,
    },
  ]

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {toggles.map(({label, title, pressed, onToggle, icon}) => (
        <Button
          key={label}
          type="button"
          variant={pressed ? 'secondary' : 'outline'}
          size={large ? 'icon' : 'sm'}
          className={cn(
            large ? 'size-11' : 'px-2 py-1',
            pressed && 'border-primary ring-1 ring-primary',
          )}
          aria-label={label}
          aria-pressed={pressed}
          title={title}
          onClick={onToggle}>
          {icon}
        </Button>
      ))}
    </div>
  )
}
