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
  overscan?: number // Manual override for overscan (in rows). Defaults to 5 rows
}

const DEFAULT_GAP = 10
const DEFAULT_OVERSCAN = 5 // Simple fixed overscan for unidirectional expansion

/**
 * Virtualized flex grid component for efficient rendering of large lists
 * Uses unidirectional expansion: loaded items are never removed
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

  // Use simple fixed overscan for unidirectional expansion
  // Adaptive overscan is not needed since loaded items are never removed
  const overscan = manualOverscan ?? DEFAULT_OVERSCAN

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
