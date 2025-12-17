import {useState, useEffect, useRef} from 'react'
import {observerResize} from '@/shared/utils'

export function useItemSize(
  targetRef: React.RefObject<HTMLElement | null>,
  columnCount: number,
  gap: number,
) {
  const [itemSize, setItemSize] = useState(0)
  const lastItemSizeRef = useRef<number>(0)

  // Calculate item size using ResizeObserver
  useEffect(() => {
    return observerResize(targetRef.current, entry => {
      const {width} = entry.contentRect
      const itemWidth = (width - gap * (columnCount - 1)) / columnCount
      // Only update if size changed significantly (threshold: 1px)
      // This reduces unnecessary re-renders during resize
      if (Math.abs(itemWidth - lastItemSizeRef.current) >= 1) {
        lastItemSizeRef.current = itemWidth
        setItemSize(itemWidth)
      }
    })
  }, [targetRef, columnCount, gap])

  return itemSize
}
