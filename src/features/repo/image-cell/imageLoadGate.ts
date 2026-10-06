/**
 * Decides when a grid cell may start loading its image.
 *
 * Rows that fly past during a fast scroll should not create an <img> or hit
 * the network, but waiting a fixed time before every load makes images appear
 * late when scrolling slowly or after a stop. So the wait depends on how fast
 * the page is scrolling: while it is slow (or stopped) a cell loads right
 * away, and while it is fast cells wait until the scroll slows down.
 */

/** Faster than this counts as "flying past" */
const FAST_SCROLL_PX_PER_S = 2500
/** Once fast, the scroll must slow below this share of the limit to count as slow */
const SLOW_DOWN_RATIO = 0.5
/** How much of the previous smoothed speed each new sample keeps */
const SMOOTHING = 0.6
/** Speed is measured over at least this long, since events come in bursts */
const MIN_SAMPLE_MS = 16
/** No scroll event for this long means the scroll has stopped */
const SETTLE_MS = 60
/** A cell never waits longer than this, even if the scroll never slows down */
const MAX_WAIT_MS = 300

let fast = false
let smoothedSpeed = 0
let lastY = 0
let lastTime = 0
let lastEventY = 0
let settleTimer: ReturnType<typeof setTimeout> | undefined
let listening = false
const waiting = new Set<() => void>()

function setFast(next: boolean) {
  if (fast === next) return
  fast = next
  if (fast) return
  smoothedSpeed = 0
  const callbacks = [...waiting]
  waiting.clear()
  for (const callback of callbacks) callback()
}

function settleIfStopped() {
  // When the main thread is busy the timer can fire although scrolling goes
  // on and its events are still queued, so check the position as well
  if (Math.abs(window.scrollY - lastEventY) > 1) {
    lastEventY = window.scrollY
    settleTimer = setTimeout(settleIfStopped, SETTLE_MS)
    return
  }
  setFast(false)
}

function handleScroll() {
  const now = performance.now()
  lastEventY = window.scrollY
  clearTimeout(settleTimer)
  settleTimer = setTimeout(settleIfStopped, SETTLE_MS)

  if (lastTime === 0) {
    lastY = window.scrollY
    lastTime = now
    return
  }
  const elapsed = now - lastTime
  if (elapsed < MIN_SAMPLE_MS) return
  const speed = (Math.abs(window.scrollY - lastY) / elapsed) * 1000
  lastY = window.scrollY
  lastTime = now
  // Smoothed, and with a lower bar for leaving "fast" than for entering it,
  // so a scroll that eases between wheel steps does not flip back and forth
  smoothedSpeed = smoothedSpeed * SMOOTHING + speed * (1 - SMOOTHING)
  setFast(
    smoothedSpeed >
      (fast ? FAST_SCROLL_PX_PER_S * SLOW_DOWN_RATIO : FAST_SCROLL_PX_PER_S),
  )
}

function startListening() {
  if (listening) return
  listening = true
  window.addEventListener('scroll', handleScroll, {passive: true})
}

/** Whether the page is scrolling too fast for images to be worth loading */
export function isScrollingFast(): boolean {
  startListening()
  return fast
}

/**
 * Calls `callback` once the scroll is no longer fast, or after a short
 * maximum wait. Returns a function that cancels the wait.
 */
export function whenScrollSettles(callback: () => void): () => void {
  startListening()
  if (!fast) {
    callback()
    return () => {}
  }
  const run = () => {
    clearTimeout(maxWaitTimer)
    waiting.delete(run)
    callback()
  }
  const maxWaitTimer = setTimeout(run, MAX_WAIT_MS)
  waiting.add(run)
  return () => {
    clearTimeout(maxWaitTimer)
    waiting.delete(run)
  }
}

// Images that have loaded once are in the browser cache, so a cell that shows
// one again (scrolling back) has nothing to wait for.
const MAX_REMEMBERED = 20000
const loadedUrls = new Set<string>()

export function hasLoaded(url: string): boolean {
  return loadedUrls.has(url)
}

export function rememberLoaded(url: string) {
  if (loadedUrls.size >= MAX_REMEMBERED) loadedUrls.clear()
  loadedUrls.add(url)
}
