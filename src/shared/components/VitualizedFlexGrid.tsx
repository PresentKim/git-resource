import {memo, useEffect, useRef, useMemo} from 'react'
import {useVisibleHeight} from '@/shared/hooks/useVisibleHeight'
import {useScrollOffset} from '@/shared/hooks/useScrollOffset'
import {useVirtualGrid} from '@/shared/hooks/useVirtualGrid'
import {useAdaptiveCellBudget} from '@/shared/hooks/useAdaptiveCellBudget'
import {cn} from '@/shared/utils'
import {useItemSize} from '@/shared/hooks/useItemSize'

export type RenderData<T> = {index: number; item: T}

interface VirtualizedFlexGridProps<T> {
  items: T[]
  render: (data: RenderData<T>) => React.ReactNode
  columnCount: number
  gap?: number
  className?: string
  /**
   * Manual override for overscan (in rows). By default the overscan follows
   * an adaptive cell budget: at least 5 rows, more while the browser keeps up
   */
  overscan?: number
  /** Called with the index of the first item in the top visible row */
  onFirstVisibleIndexChange?: (index: number) => void
}

interface GridRowProps<T> {
  items: T[]
  start: number
  end: number
  render: (data: RenderData<T>) => React.ReactNode
  flexBasis: string
  rowStyle: React.CSSProperties
}

/**
 * One row of cells. Each row is its own flex container with layout
 * containment, so a change in one cell (an image appearing) lays out that
 * row only, not every mounted cell; with thousands mounted that layout would
 * otherwise run on every scroll event. Memoized, so when the mounted range
 * shifts only the rows that come and go render.
 */
const GridRow = memo(function GridRow<T>({
  items,
  start,
  end,
  render,
  flexBasis,
  rowStyle,
}: GridRowProps<T>) {
  const cells = []
  for (let index = start; index < end; index++) {
    const item = items[index]
    if (item === undefined) continue
    cells.push(
      <div key={index} style={{flexBasis}}>
        {render({index, item})}
      </div>,
    )
  }
  return (
    <div className="flex items-start" style={rowStyle}>
      {cells}
    </div>
  )
}) as <T>(props: GridRowProps<T>) => React.ReactNode

const DEFAULT_GAP = 10
const DEFAULT_OVERSCAN = 5
/** The mounted range shifts by about this many cells at a time */
const SHIFT_CELLS = 32

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

  // Rows the viewport spans; the same estimate useVirtualGrid makes
  const rowHeight = itemSize > 0 ? itemSize + gap : 0
  const viewportRows =
    rowHeight > 0
      ? Math.ceil((visibleHeight || window.innerHeight) / rowHeight) + 1
      : 0
  const cellBudget = useAdaptiveCellBudget(
    (viewportRows + 2 * DEFAULT_OVERSCAN) * columnCount,
    items.length,
  )
  const overscan =
    manualOverscan ??
    Math.max(
      DEFAULT_OVERSCAN,
      Math.floor((cellBudget / columnCount - viewportRows) / 2),
    )
  const shiftRows = Math.max(1, Math.ceil(SHIFT_CELLS / columnCount))

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

  const {totalHeight, offsetTop, startIndex, endIndex} = useVirtualGrid(
    items.length,
    columnCount,
    visibleHeight,
    itemSize,
    gap,
    scrollOffset,
    overscan,
    shiftRows,
  )

  const containerStyle = useMemo(
    () => ({
      paddingTop: offsetTop,
      height: totalHeight,
    }),
    [offsetTop, totalHeight],
  )

  // Exactly itemSize wide (the width useItemSize measures), so rows are as
  // tall as the virtualization math assumes
  const flexBasisStyle = useMemo(
    () => `calc((100% - ${(columnCount - 1) * gap}px) / ${columnCount})`,
    [columnCount, gap],
  )

  // Memoize gap style objects to avoid recreation
  const gapStyle = useMemo(() => ({gap}), [gap])
  const rowStyle = useMemo(
    (): React.CSSProperties => ({gap, contain: 'layout style'}),
    [gap],
  )

  // startIndex is always at a row boundary
  const rows = []
  for (
    let rowStart = startIndex;
    rowStart < endIndex;
    rowStart += columnCount
  ) {
    rows.push(
      <GridRow
        key={rowStart / columnCount}
        items={items}
        start={rowStart}
        end={Math.min(endIndex, rowStart + columnCount)}
        render={render}
        flexBasis={flexBasisStyle}
        rowStyle={rowStyle}
      />,
    )
  }

  return (
    <div
      ref={wrapperRef}
      className={cn('relative w-full', className)}
      style={containerStyle}>
      <div ref={containerRef} className="flex flex-col" style={gapStyle}>
        {rows}
      </div>
    </div>
  )
}

export {VirtualizedFlexGrid}
