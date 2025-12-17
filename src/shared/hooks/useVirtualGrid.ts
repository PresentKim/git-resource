import {useMemo, useState, useEffect, useRef} from 'react'

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

function useVirtualGrid(
  itemCount: number,
  columnCount: number,
  visibleHeight: number,
  itemSize: number,
  gap: number,
  scrollOffset: number,
  overscan: number,
): VirtualGridResult {
  // Memoize calculations that depend on itemSize and gap
  const actualItemSize = useMemo(() => itemSize + gap, [itemSize, gap])
  const rowCount = useMemo(
    () => Math.ceil(itemCount / columnCount),
    [itemCount, columnCount],
  )
  const totalHeight = useMemo(
    () => rowCount * actualItemSize - gap,
    [rowCount, actualItemSize, gap],
  )

  // Memoize desired render range to prevent unnecessary recalculations
  const desiredRange = useMemo(() => {
    // Determine which row is first visible based on scrollTop
    const visibleStartRow = Math.floor(scrollOffset / actualItemSize)
    // Use a minimum visible height to ensure initial render shows enough rows
    // This prevents the issue where visibleHeight is 0 on initial mount
    const effectiveVisibleHeight =
      visibleHeight > 0 ? visibleHeight : window.innerHeight * 0.8
    const visibleRowCount =
      Math.ceil(effectiveVisibleHeight / actualItemSize) + 1

    // Calculate desired render range based on current scroll position
    const desiredRenderStartRow = Math.max(0, visibleStartRow - overscan)
    const desiredRenderEndRow = Math.min(
      rowCount,
      visibleStartRow + visibleRowCount + overscan,
    )
    const desiredStartIndex = desiredRenderStartRow * columnCount
    const desiredEndIndex = Math.min(
      itemCount,
      desiredRenderEndRow * columnCount,
    )

    return {desiredStartIndex, desiredEndIndex}
  }, [
    scrollOffset,
    visibleHeight,
    actualItemSize,
    overscan,
    rowCount,
    columnCount,
    itemCount,
  ])

  const {desiredStartIndex, desiredEndIndex} = desiredRange

  // Track the minimum and maximum rendered indices (unidirectional expansion)
  const [minRenderedIndex, setMinRenderedIndex] =
    useState<number>(desiredStartIndex)
  const [maxRenderedIndex, setMaxRenderedIndex] =
    useState<number>(desiredEndIndex)
  const prevScrollOffsetRef = useRef<number>(scrollOffset)
  const prevItemCountRef = useRef<number>(itemCount)
  const prevColumnCountRef = useRef<number>(columnCount)
  const prevVisibleHeightRef = useRef<number>(visibleHeight)
  const isInitialMountRef = useRef<boolean>(true)
  // Use refs to track desired range without triggering effects
  const desiredRangeRef = useRef({desiredStartIndex, desiredEndIndex})

  // Update ref with latest desired range values
  useEffect(() => {
    desiredRangeRef.current = {desiredStartIndex, desiredEndIndex}
  }, [desiredStartIndex, desiredEndIndex])

  // Reset when itemCount or columnCount changes
  useEffect(() => {
    if (
      prevItemCountRef.current !== itemCount ||
      prevColumnCountRef.current !== columnCount
    ) {
      // Defer state updates to avoid synchronous setState in effect
      const timeoutId = setTimeout(() => {
        const {
          desiredStartIndex: currentDesiredStart,
          desiredEndIndex: currentDesiredEnd,
        } = desiredRangeRef.current
        setMinRenderedIndex(currentDesiredStart)
        setMaxRenderedIndex(currentDesiredEnd)
      }, 0)
      prevItemCountRef.current = itemCount
      prevColumnCountRef.current = columnCount
      return () => clearTimeout(timeoutId)
    }
  }, [itemCount, columnCount])

  // Update render range when visibleHeight changes (especially on initial mount)
  useEffect(() => {
    const visibleHeightChanged = prevVisibleHeightRef.current !== visibleHeight
    prevVisibleHeightRef.current = visibleHeight

    // On initial mount or when visibleHeight becomes available, ensure we render enough items
    if (
      isInitialMountRef.current ||
      (visibleHeightChanged && visibleHeight > 0)
    ) {
      isInitialMountRef.current = false
      const timeoutId = setTimeout(() => {
        const {
          desiredStartIndex: currentDesiredStart,
          desiredEndIndex: currentDesiredEnd,
        } = desiredRangeRef.current
        // Ensure we render at least the desired range
        setMinRenderedIndex(prev => Math.min(prev, currentDesiredStart))
        setMaxRenderedIndex(prev => Math.max(prev, currentDesiredEnd))
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [visibleHeight])

  // Expand render range unidirectionally based on scroll direction
  // Only update when scroll actually requires expansion
  // Use threshold to reduce update frequency during fast scrolling
  const rafIdRef = useRef<number | null>(null)
  const lastUpdateScrollOffsetRef = useRef<number>(scrollOffset)
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null)

  useEffect(() => {
    const scrollDelta = Math.abs(
      scrollOffset - lastUpdateScrollOffsetRef.current,
    )
    // Only update if scrolled more than half a row to reduce update frequency
    const updateThreshold = actualItemSize * 0.5

    // Determine scroll direction
    const currentDirection =
      scrollOffset > prevScrollOffsetRef.current ? 'down' : 'up'
    const directionChanged = scrollDirectionRef.current !== currentDirection
    scrollDirectionRef.current = currentDirection
    prevScrollOffsetRef.current = scrollOffset

    // Skip update if scroll delta is too small (unless direction changed)
    if (scrollDelta < updateThreshold && !directionChanged) {
      return
    }

    // Cancel any pending animation frame to batch updates
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
    }

    // Use requestAnimationFrame for smoother scroll performance
    rafIdRef.current = requestAnimationFrame(() => {
      const {
        desiredStartIndex: currentDesiredStart,
        desiredEndIndex: currentDesiredEnd,
      } = desiredRangeRef.current

      if (currentDirection === 'down') {
        // Scrolling down: expand the maximum index only if needed
        setMaxRenderedIndex(prev => {
          if (currentDesiredEnd > prev) {
            lastUpdateScrollOffsetRef.current = scrollOffset
            return currentDesiredEnd
          }
          return prev
        })
      } else {
        // Scrolling up: expand the minimum index only if needed
        setMinRenderedIndex(prev => {
          if (currentDesiredStart < prev) {
            lastUpdateScrollOffsetRef.current = scrollOffset
            return currentDesiredStart
          }
          return prev
        })
      }
      rafIdRef.current = null
    })

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [scrollOffset, actualItemSize])

  // Calculate final render range
  const finalStartIndex = minRenderedIndex
  const finalEndIndex = maxRenderedIndex
  const offsetTop = useMemo(() => {
    const finalStartRow = Math.floor(finalStartIndex / columnCount)
    return finalStartRow * actualItemSize
  }, [finalStartIndex, columnCount, actualItemSize])

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
