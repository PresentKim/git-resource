import {useState} from 'react'

interface VirtualGridResult {
  totalHeight: number
  offsetTop: number
  /** The first mounted item, always the first of a row */
  startIndex: number
  /** One past the last mounted item */
  endIndex: number
}

interface RowRange {
  start: number
  end: number
}

/**
 * Calculate virtual grid properties for efficient rendering
 * Only the rows around the viewport (plus overscan) are rendered, so the DOM
 * size stays constant no matter how far the user has scrolled
 *
 * The mounted range is sticky: it stays put while the viewport moves inside
 * it, and only shifts, by `shiftRows` at a time, once fewer than
 * `overscan - shiftRows` rows are left beyond the viewport. A large overscan
 * then costs one re-render per shift instead of one per row crossed.
 *
 * @param itemCount Total number of items
 * @param columnCount Number of columns in the grid
 * @param visibleHeight Height of the visible viewport
 * @param itemSize Size of each item (excluding gap)
 * @param gap Gap between items
 * @param scrollOffset Current scroll offset
 * @param overscan Number of additional rows to render beyond visible area
 * @param shiftRows How far the range moves at once; at most overscan / 2
 * @returns Virtual grid calculation results
 */
function useVirtualGrid(
  itemCount: number,
  columnCount: number,
  visibleHeight: number,
  itemSize: number,
  gap: number,
  scrollOffset: number,
  overscan: number,
  shiftRows = 1,
): VirtualGridResult {
  const actualItemSize = itemSize + gap
  const rowCount = Math.ceil(itemCount / columnCount)
  const totalHeight = Math.max(0, rowCount * actualItemSize - gap)

  // Rows are 0px tall until the container is measured; without a guard the
  // viewport would appear to span thousands of rows and mount them all.
  const rowHeight =
    itemSize > 0
      ? actualItemSize
      : Math.max(1, window.innerWidth / columnCount + gap)
  // visibleHeight is 0 until the first intersection callback fires
  const effectiveVisibleHeight =
    visibleHeight > 0 ? visibleHeight : window.innerHeight
  const viewportRows = Math.ceil(effectiveVisibleHeight / rowHeight) + 1

  const firstVisibleRow = Math.floor(scrollOffset / rowHeight)
  const lastVisibleRow = firstVisibleRow + viewportRows
  const shift = Math.max(0, Math.min(shiftRows, Math.floor(overscan / 2)))
  // The full range around the viewport. Near the top or bottom the margin
  // that has no rows on one side goes to the other, so the range still spans
  // the viewport plus twice the overscan
  const spanRows = viewportRows + 2 * overscan
  const fullStart = Math.max(
    0,
    Math.min(firstVisibleRow - overscan, rowCount - spanRows),
  )
  const fullEnd = Math.min(rowCount, fullStart + spanRows)
  // The margin that must stay mounted beyond the viewport
  const neededStart = Math.max(0, firstVisibleRow - overscan + shift)
  const neededEnd = Math.min(rowCount, lastVisibleRow + overscan - shift)

  // Kept from the previous render; replaced (during render, so nothing stale
  // is ever committed) once it no longer covers the margin or has drifted
  // more than a shift away from the full range
  const [range, setRange] = useState<RowRange>({start: 0, end: 0})
  const rangeFits =
    range.start <= neededStart &&
    range.start >= fullStart - shift &&
    range.end >= neededEnd &&
    range.end <= fullEnd + shift
  const {start: startRow, end: endRow} = rangeFits
    ? range
    : {start: fullStart, end: fullEnd}
  if (!rangeFits) setRange({start: fullStart, end: fullEnd})

  const startIndex = startRow * columnCount
  const endIndex = Math.min(itemCount, endRow * columnCount)

  const offsetTop = startRow * rowHeight

  return {
    totalHeight,
    offsetTop,
    startIndex,
    endIndex,
  }
}

export {useVirtualGrid}
