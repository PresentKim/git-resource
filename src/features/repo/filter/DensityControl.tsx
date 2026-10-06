import {memo} from 'react'
import {Columns3 as ColumnsIcon} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {Label} from '@/shared/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {Slider} from '@/shared/components/ui/slider'
import {Switch} from '@/shared/components/ui/switch'
import {useSettingStore} from '@/shared/stores/settingStore'

const MIN_COLUMNS = 1
const MAX_COLUMNS = 30

/**
 * Toolbar control for the grid density, so the number of columns can be
 * changed while looking at the images instead of through the settings dialog.
 * Uses the same stored setting; 0 columns means "fit the screen width".
 */
export const DensityControl = memo(function DensityControl() {
  const columnCount = useSettingStore(state => state.columnCount)
  const shownColumns = useSettingStore(state => state.filledColumnCount)
  const setColumnCount = useSettingStore(state => state.setColumnCount)
  const isAuto = columnCount === 0
  // A very wide screen can fit more than the usual maximum; keep that value
  // on the slider instead of clamping it when Auto is switched off
  const maxColumns = Math.max(MAX_COLUMNS, shownColumns)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="Grid density"
            title="Grid density"
            size="sm"
            variant="outline"
            className="text-xs font-semibold">
            <ColumnsIcon className="size-4" />
            <span>{shownColumns}</span>
          </Button>
        }
      />
      <PopoverContent side="bottom" align="end" className="w-64">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <Label htmlFor="density-slider" className="text-xs font-semibold">
                Columns
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {shownColumns}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Label
                id="density-auto-label"
                htmlFor="density-auto"
                className="text-xs font-semibold">
                Auto
              </Label>
              {/* Switching Auto off keeps the number of columns on screen */}
              {/* The id lands on the hidden checkbox, so the switch itself is
                  named through aria-labelledby */}
              <Switch
                id="density-auto"
                aria-labelledby="density-auto-label"
                size="sm"
                checked={isAuto}
                onCheckedChange={checked =>
                  setColumnCount(checked ? 0 : shownColumns)
                }
              />
            </div>
          </div>
          <Slider
            id="density-slider"
            min={MIN_COLUMNS}
            max={maxColumns}
            step={1}
            disabled={isAuto}
            value={[shownColumns]}
            onValueChange={value =>
              setColumnCount(Array.isArray(value) ? value[0] : value)
            }
          />
          <p className="text-xs text-muted-foreground">
            {isAuto
              ? 'Fits as many columns as the screen width allows.'
              : 'Fewer columns, larger images.'}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
})
