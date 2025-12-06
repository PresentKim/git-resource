import {useRef, useMemo} from 'react'
import {useVisibleHeight} from '@/hooks/useVisibleHeight'
import {useScrollOffset} from '@/hooks/useScrollOffset'
import {useVirtualGrid} from '@/hooks/useVirtualGrid'
import {cn} from '@/utils'
import {useItemSize} from '@/hooks/useItemSize'

export type RenderData<T> = {index: number; item: T}

interface VirtualizedFlexGridProps<T> {
  items: T[]
  render: (data: RenderData<T>) => React.ReactNode
  columnCount: number
  gap?: number
  className?: string
  overscan?: number // Additional rows to render beyond the visible area
}

const DEFAULT_GAP = 10
const DEFAULT_OVERSCAN = 0

/**
 * Virtualized flex grid component for efficient rendering of large lists
 */
function VirtualizedFlexGrid<T>({
  items,
  columnCount,
  overscan = DEFAULT_OVERSCAN,
  gap = DEFAULT_GAP,
  render,
  className,
}: VirtualizedFlexGridProps<T>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const visibleHeight = useVisibleHeight(wrapperRef)
  const scrollOffset = useScrollOffset(wrapperRef)
  const itemSize = useItemSize(containerRef, columnCount, gap)

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

  return (
    <div
      ref={wrapperRef}
      className={cn('relative w-full', className)}
      style={containerStyle}>
      <div
        ref={containerRef}
        className="flex flex-wrap items-start"
        style={{gap}}>
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
