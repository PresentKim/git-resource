import {useEffect, useRef, useMemo} from 'react'
import {useVisibleHeight} from '@/shared/hooks/useVisibleHeight'
import {useScrollOffset} from '@/shared/hooks/useScrollOffset'
import {useVirtualGrid} from '@/shared/hooks/useVirtualGrid'
import {cn} from '@/shared/utils'
import {useItemSize} from '@/shared/hooks/useItemSize'

export type RenderData<T> = {index: number; item: T}

interface VirtualizedFlexGridProps<T> {
  items: T[]
  render: (data: RenderData<T>) => React.ReactNode
  columnCount: number
  gap?: number
  className?: string
  overscan?: number // Manual override for overscan (in rows). Defaults to 5 rows
  /** Called with the index of the first item in the top visible row */
  onFirstVisibleIndexChange?: (index: number) => void
}

const DEFAULT_GAP = 10
const DEFAULT_OVERSCAN = 5

/**
 * Virtualized flex grid component for efficient rendering of large lists
 * Only rows near the viewport are mounted; the rest are unmounted
 */
function VirtualizedFlexGrid<T>({
  items,
  columnCount,
  overscan: manualOverscan,
  gap = DEFAULT_GAP,
  render,
  className,
  onFirstVisibleIndexChange,
}: VirtualizedFlexGridProps<T>) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const visibleHeight = useVisibleHeight(wrapperRef)
  const itemSize = useItemSize(containerRef, columnCount, gap)
  // Quantize scroll to row boundaries so scrolling within a row re-renders nothing
  const scrollOffset = useScrollOffset(
    wrapperRef,
    itemSize > 0 ? itemSize + gap : 0,
  )

  const overscan = manualOverscan ?? DEFAULT_OVERSCAN

  // scrollOffset only changes when a row boundary is crossed, so this runs
  // once per row rather than on every scroll event. The result can lag the
  // exact position by less than a row.
  const itemCount = items.length
  useEffect(() => {
    if (!onFirstVisibleIndexChange) return
    const wrapper = wrapperRef.current
    if (!wrapper || itemSize <= 0 || itemCount === 0) {
      onFirstVisibleIndexChange(0)
      return
    }
    // Use the live scroll position: scrollOffset is rounded down to a row
    // boundary and would report a row too early
    const gridTop = wrapper.getBoundingClientRect().top + window.scrollY
    const row = Math.max(
      0,
      Math.floor((window.scrollY - gridTop) / (itemSize + gap)),
    )
    onFirstVisibleIndexChange(Math.min(itemCount - 1, row * columnCount))
  }, [
    onFirstVisibleIndexChange,
    scrollOffset,
    itemSize,
    gap,
    columnCount,
    itemCount,
  ])

  // Reset the reported position when the grid goes away (e.g. empty result)
  useEffect(
    () => () => onFirstVisibleIndexChange?.(0),
    [onFirstVisibleIndexChange],
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

  // Memoize rendered items to avoid unnecessary re-renders
  const renderedItems = useMemo(() => {
    return visibleIndexs.map(originalIndex => {
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
    })
  }, [visibleIndexs, items, flexBasisStyle, render])

  return (
    <div
      ref={wrapperRef}
      className={cn('relative w-full', className)}
      style={containerStyle}>
      <div
        ref={containerRef}
        className="flex flex-wrap items-start"
        style={gapStyle}>
        {renderedItems}
      </div>
    </div>
  )
}

export {VirtualizedFlexGrid}
