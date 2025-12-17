import {useState, useEffect} from 'react'
import {observerResize} from '@/shared/utils'

function useHeight(targetRef: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(0)

  // Update height using ResizeObserver
  useEffect(() => {
    return observerResize(targetRef.current, entry => {
      setHeight(entry.contentRect.height)
    })
  }, [targetRef])

  return height
}

export {useHeight}
