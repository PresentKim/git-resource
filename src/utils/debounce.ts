/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified delay has elapsed since the last time it was invoked.
 *
 * @param fn The function to debounce
 * @param delay The delay in milliseconds
 * @returns A debounced version of the function with a cancel method
 */
export function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
): ((...args: T) => void) & {cancel: () => void} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debouncedFn = (...args: T) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
      timeoutId = null
    }, delay)
  }

  debouncedFn.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debouncedFn
}
