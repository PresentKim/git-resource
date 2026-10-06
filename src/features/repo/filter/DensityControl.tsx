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
            <Label htmlFor="density-slider" className="text-xs font-semibold">
              Columns
            </Label>
            <span className="text-xs text-muted-foreground">
              {shownColumns}
              {isAuto && ' (auto)'}
            </span>
          </div>
          <Slider
            id="density-slider"
            min={MIN_COLUMNS}
            max={MAX_COLUMNS}
            step={1}
            value={[shownColumns]}
            onValueChange={value =>
              setColumnCount(Array.isArray(value) ? value[0] : value)
            }
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Fewer columns, larger images.
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              disabled={isAuto}
              onClick={() => setColumnCount(0)}>
              Auto
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})
