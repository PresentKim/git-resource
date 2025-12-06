import {useRef, useMemo} from 'react'
import {useVisibleHeight} from '@/hooks/useVisibleHeight'
import {useScrollOffset} from '@/hooks/useScrollOffset'
import {useVirtualGrid} from '@/hooks/useVirtualGrid'
import {useAdaptiveOverscan} from '@/hooks/useAdaptiveOverscan'
import {cn} from '@/utils'
import {useItemSize} from '@/hooks/useItemSize'
import {useSettingStore} from '@/stores/settingStore'

export type RenderData<T> = {index: number; item: T}

interface VirtualizedFlexGridProps<T> {
  items: T[]
  render: (data: RenderData<T>) => React.ReactNode
  columnCount: number
  gap?: number
  className?: string
  overscan?: number // Manual override for overscan (in rows). If not provided, uses adaptive overscan
}

const DEFAULT_GAP = 10

/**
 * Virtualized flex grid component for efficient rendering of large lists
 */
function VirtualizedFlexGrid<T>({
  items,
  columnCount,
  overscan: manualOverscan,
  gap = DEFAULT_GAP,
  render,
  className,
}: VirtualizedFlexGridProps<T>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const visibleHeight = useVisibleHeight(wrapperRef)
  const scrollOffset = useScrollOffset(wrapperRef)
  const itemSize = useItemSize(containerRef, columnCount, gap)
  const manualOverscanFromStore = useSettingStore(state => state.overscan)

  // Use manual overscan from props, then store, then adaptive
  const effectiveManualOverscan =
    manualOverscan ?? manualOverscanFromStore ?? null

  // Calculate adaptive overscan based on visible height and item size
  // This ensures consistent rendering regardless of columnCount
  const overscan = useAdaptiveOverscan(
    effectiveManualOverscan,
    visibleHeight,
    itemSize + gap, // actualItemSize
    columnCount,
  )

  const {totalHeight, offsetTop, visibleIndexs} = useVirtualGrid(
    items.length,
    columnCount,
    visibleHeight,
    itemSize,
    gap,
    scrollOffset,
    overscan,
  )

  const containerStyle = useMemo(
    () => ({
      paddingTop: offsetTop,
      height: totalHeight,
    }),
    [offsetTop, totalHeight],
  )

  const flexBasisStyle = useMemo(
    () => `calc(100% / ${columnCount} - ${gap}px)`,
    [columnCount, gap],
  )

  // Memoize gap style object to avoid recreation
  const gapStyle = useMemo(() => ({gap}), [gap])

  return (
    <div
      ref={wrapperRef}
      className={cn('relative w-full', className)}
      style={containerStyle}>
      <div
        ref={containerRef}
        className="flex flex-wrap items-start"
        style={gapStyle}>
        {visibleIndexs.map(originalIndex => {
          const item = items[originalIndex]
          if (item === undefined) {
            return null
          }

          return (
            <div
              key={originalIndex}
              style={{
                flexBasis: flexBasisStyle,
              }}>
              {render({index: originalIndex, item})}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export {VirtualizedFlexGrid}
