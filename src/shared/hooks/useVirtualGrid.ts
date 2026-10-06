import {useMemo} from 'react'

interface VirtualGridResult {
  totalHeight: number
  offsetTop: number
  visibleIndexs: number[]
}

/**
 * Calculate virtual grid properties for efficient rendering
 * Only the rows around the viewport (plus overscan) are rendered, so the DOM
 * size stays constant no matter how far the user has scrolled
 *
 * @param itemCount Total number of items
 * @param columnCount Number of columns in the grid
 * @param visibleHeight Height of the visible viewport
 * @param itemSize Size of each item (excluding gap)
 * @param gap Gap between items
 * @param scrollOffset Current scroll offset
 * @param overscan Number of additional rows to render beyond visible area
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

  const startRow = Math.max(0, Math.floor(scrollOffset / rowHeight) - overscan)
  const endRow = Math.min(
    rowCount,
    Math.floor(scrollOffset / rowHeight) +
      Math.ceil(effectiveVisibleHeight / rowHeight) +
      1 +
      overscan,
  )
  const startIndex = startRow * columnCount
  const endIndex = Math.min(itemCount, endRow * columnCount)

  const offsetTop = startRow * rowHeight

  const visibleIndexs = useMemo(() => {
    const indices: number[] = []
    for (let i = startIndex; i < endIndex; i++) {
      indices.push(i)
    }
    return indices
  }, [startIndex, endIndex])

  return {
    totalHeight,
    offsetTop,
    visibleIndexs,
  }
}

export {useVirtualGrid}
