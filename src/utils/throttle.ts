/**
 * Creates a throttled function that invokes the provided function
 * at most once per specified delay period.
 *
 * @param fn The function to throttle
 * @param delay The delay in milliseconds
 * @returns A throttled version of the function with a cancel method
 */
export function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number,
): ((...args: T) => void) & {cancel: () => void} {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: T | null = null

  const throttledFn = (...args: T) => {
    lastArgs = args

    if (timeoutId === null) {
      fn(...args)
      timeoutId = setTimeout(() => {
        timeoutId = null
        if (lastArgs !== null) {
          fn(...lastArgs)
          lastArgs = null
        }
      }, delay)
    }
  }

  throttledFn.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    lastArgs = null
  }

  return throttledFn
}
