interface VirtualGridResult {
  totalHeight: number
  offsetTop: number
  visibleIndexs: number[]
}

/**
 * Calculate virtual grid properties for efficient rendering
 *
 * @param itemCount Total number of items
 * @param columnCount Number of columns in the grid
 * @param visibleHeight Height of the visible viewport
 * @param itemSize Size of each item (including gap)
 * @param gap Gap between items
 * @param scrollOffset Current scroll offset
 * @param overscan Number of additional rows to render beyond visible area
 * @returns Virtual grid calculation results
 */
import {useMemo} from 'react'

function useVirtualGrid(
  itemCount: number,
  columnCount: number,
  visibleHeight: number,
  itemSize: number,
  gap: number,
  scrollOffset: number,
  overscan: number,
): VirtualGridResult {
  return useMemo(() => {
    const actualItemSize = itemSize + gap
    const rowCount = Math.ceil(itemCount / columnCount)

    // Determine which row is first visible based on scrollTop
    const visibleStartRow = Math.floor(scrollOffset / actualItemSize)
    const visibleRowCount = Math.ceil(visibleHeight / actualItemSize) + 1

    const totalHeight = rowCount * actualItemSize - gap

    // Apply overscan to extend the render range
    const renderStartRow = Math.max(0, visibleStartRow - overscan)
    const renderEndRow = Math.min(
      rowCount,
      visibleStartRow + visibleRowCount + overscan,
    )

    // Compute the actual items to render based on calculated rows
    const startIndex = renderStartRow * columnCount
    const endIndex = Math.min(itemCount, renderEndRow * columnCount)
    
    // Use for loop instead of Array.from for better performance
    const visibleIndexs: number[] = []
    for (let i = startIndex; i < endIndex; i++) {
      visibleIndexs.push(i)
    }

    return {
      totalHeight,
      offsetTop: renderStartRow * actualItemSize,
      visibleIndexs,
    }
  }, [itemCount, columnCount, visibleHeight, itemSize, gap, scrollOffset, overscan])
}

export {useVirtualGrid}
