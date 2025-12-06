interface VirtualGridResult {
  totalHeight: number
  offsetTop: number
  visibleIndexs: number[]
}

/**
 * Calculate virtual grid properties for efficient rendering
 * Uses unidirectional expansion: once items are loaded, they are never removed
 * Only expands in the direction of scroll to prevent flickering
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
import {useMemo, useState, useEffect, useRef} from 'react'

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
  const totalHeight = rowCount * actualItemSize - gap

  // Determine which row is first visible based on scrollTop
  const visibleStartRow = Math.floor(scrollOffset / actualItemSize)
  const visibleRowCount = Math.ceil(visibleHeight / actualItemSize) + 1

  // Calculate desired render range based on current scroll position
  const desiredRenderStartRow = Math.max(0, visibleStartRow - overscan)
  const desiredRenderEndRow = Math.min(
    rowCount,
    visibleStartRow + visibleRowCount + overscan,
  )
  const desiredStartIndex = desiredRenderStartRow * columnCount
  const desiredEndIndex = Math.min(itemCount, desiredRenderEndRow * columnCount)

  // Track the minimum and maximum rendered indices (unidirectional expansion)
  const [minRenderedIndex, setMinRenderedIndex] =
    useState<number>(desiredStartIndex)
  const [maxRenderedIndex, setMaxRenderedIndex] =
    useState<number>(desiredEndIndex)
  const prevScrollOffsetRef = useRef<number>(scrollOffset)
  const prevItemCountRef = useRef<number>(itemCount)
  const prevColumnCountRef = useRef<number>(columnCount)

  // Reset when itemCount or columnCount changes
  useEffect(() => {
    if (
      prevItemCountRef.current !== itemCount ||
      prevColumnCountRef.current !== columnCount
    ) {
      // Defer state updates to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        setMinRenderedIndex(desiredStartIndex)
        setMaxRenderedIndex(desiredEndIndex)
      }, 0)
      prevItemCountRef.current = itemCount
      prevColumnCountRef.current = columnCount
      return () => clearTimeout(timeoutId)
    }
  }, [itemCount, columnCount, desiredStartIndex, desiredEndIndex])

  // Expand render range unidirectionally based on scroll direction
  // Use setTimeout to defer state updates and avoid React Compiler warnings
  useEffect(() => {
    const scrollDirection =
      scrollOffset > prevScrollOffsetRef.current ? 'down' : 'up'
    prevScrollOffsetRef.current = scrollOffset

    // Defer state updates to avoid synchronous setState in effect
    const timeoutId = setTimeout(() => {
      if (scrollDirection === 'down') {
        // Scrolling down: expand the maximum index
        if (desiredEndIndex > maxRenderedIndex) {
          setMaxRenderedIndex(desiredEndIndex)
        }
      } else {
        // Scrolling up: expand the minimum index
        if (desiredStartIndex < minRenderedIndex) {
          setMinRenderedIndex(desiredStartIndex)
        }
      }
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [
    desiredStartIndex,
    desiredEndIndex,
    scrollOffset,
    minRenderedIndex,
    maxRenderedIndex,
  ])

  // Calculate final render range
  const finalStartIndex = minRenderedIndex
  const finalEndIndex = maxRenderedIndex
  const finalStartRow = Math.floor(finalStartIndex / columnCount)
  const offsetTop = finalStartRow * actualItemSize

  // Generate visible indices array
  const visibleIndexs = useMemo(() => {
    const indices: number[] = []
    for (let i = finalStartIndex; i < finalEndIndex; i++) {
      indices.push(i)
    }
    return indices
  }, [finalStartIndex, finalEndIndex])

  return {
    totalHeight,
    offsetTop,
    visibleIndexs,
  }
}

export {useVirtualGrid}
