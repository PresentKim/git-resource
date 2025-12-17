/**
 * Observe element resize events
 *
 * @param target The element to observe
 * @param callback Callback function called when resize occurs
 * @param options ResizeObserver options
 * @returns Cleanup function to disconnect the observer
 */
export function observerResize(
  target: Element | null,
  callback: (entry: ResizeObserverEntry, observer: ResizeObserver) => void,
  options?: ResizeObserverOptions,
): () => void {
  if (!target) {
    return () => {}
  }

  const observer = new ResizeObserver((entries, obs) => {
    const entry = entries[0]
    if (entry) {
      callback(entry, obs)
    }
  })

  try {
    observer.observe(target, options)
  } catch (error) {
    console.error('Failed to observe resize:', error)
    return () => {}
  }

  return () => {
    observer.disconnect()
  }
}

/**
 * Observe element intersection with viewport
 *
 * @param target The element to observe
 * @param callback Callback function called when intersection changes
 * @param options IntersectionObserver options
 * @returns Cleanup function to disconnect the observer
 */
export function observeIntersection(
  target: Element | null,
  callback: (
    entry: IntersectionObserverEntry,
    observer: IntersectionObserver,
  ) => void,
  options?: IntersectionObserverInit,
): () => void {
  if (!target) {
    return () => {}
  }

  const observer = new IntersectionObserver((entries, obs) => {
    const entry = entries[0]
    if (entry) {
      callback(entry, obs)
    }
  }, options)

  try {
    observer.observe(target)
  } catch (error) {
    console.error('Failed to observe intersection:', error)
    return () => {}
  }

  return () => {
    observer.disconnect()
  }
}
