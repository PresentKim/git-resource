/**
 * Fisher-Yates shuffle algorithm for better randomness
 * @warning This function **MUTATES** the input array.
 * If you need to keep the original array unchanged, pass a copy:
 * ```javascript
 * fisherYatesShuffle([...arr])
 * ```
 * @link https://en.wikipedia.org/wiki/Fisher-Yates_shuffle
 */
export function fisherYatesShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Picks K random elements from an array WITHOUT duplicates.
 * @description This uses a "partial Fisher-Yates shuffle", so it only does K swaps:
 * - Time: O(K)
 * - Extra memory: O(1) (in-place)
 * @warning This function **MUTATES** the input array.
 * If you need to keep the original array unchanged, pass a copy:
 * ```javascript
 * pickByPartialFisherYates([...arr], k)
 * ```
 * @link https://en.wikipedia.org/wiki/Fisher-Yates_shuffle
 */
export function pickByPartialFisherYates<T>(arr: T[], count: number): T[] {
  const n = arr.length
  const k = Math.max(0, Math.min(count, n))
  if (k === 0) return []

  // "Lock in" one random element per iteration at the end of the array.
  // After swapping, position i becomes final and is not touched again.
  for (let i = n - 1; i >= n - k; i--) {
    // Pick a random index in [0, i]
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }

  // The last k elements are now a uniform random sample without duplicates.
  return arr.slice(n - k)
}
