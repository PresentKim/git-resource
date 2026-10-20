import {useEffect, useLayoutEffect, useRef, useState} from 'react'

/** Never mount more cells than this, however smooth the page is */
const MAX_CELLS = 10000
/** Cells added per growth step; small steps keep each mount short */
const GROW_STEP_CELLS = 240
/** Pause between growth steps */
const GROW_INTERVAL_MS = 250
/** Grow only after the page has not scrolled for this long */
const SCROLL_IDLE_MS = 400
/** A growth step whose frame takes longer than this is undone */
const SLOW_GROWTH_MS = 100
/** After an undone step, wait this long before trying again */
const SLOW_GROWTH_COOLDOWN_MS = 3000
/**
 * Growth stops for the session after this many slow steps; one alone can be
 * noise (an image decoding in the same frame)
 */
const SLOW_GROWTHS_TO_STOP = 2
/** A frame longer than this while scrolling is a stall the user can see */
const STALL_MS = 100
/** A stall this soon after a scroll event happened while scrolling */
const SCROLL_BLAME_MS = 300
/** This many stalls while scrolling, within STALL_WINDOW_MS, shrink the budget */
const STALLS_TO_SHRINK = 3
const STALL_WINDOW_MS = 3000
/** How much of the budget a shrink keeps */
const SHRINK_RATIO = 0.75

/**
 * The most cells this device handled without stalling, learned once per
 * session, so the next grid (another repository, a new filter) does not
 * stall at the same point again
 */
let sessionCeiling = MAX_CELLS
let slowGrowths = 0
let growthPausedUntil = 0

/** 'long-animation-frame' (Chromium) covers rendering too; 'longtask' is the fallback */
function observeStalls(onStall: (startTime: number) => void): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {}
  const supported = PerformanceObserver.supportedEntryTypes ?? []
  const type = supported.includes('long-animation-frame')
    ? 'long-animation-frame'
    : supported.includes('longtask')
      ? 'longtask'
      : null
  if (!type) return () => {}
  const observer = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) {
      if (entry.duration > STALL_MS) onStall(entry.startTime)
    }
  })
  observer.observe({type, buffered: false})
  return () => observer.disconnect()
}

function whenIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(callback, {timeout: 1000})
    return () => cancelIdleCallback(id)
  }
  const id = setTimeout(callback, 0)
  return () => clearTimeout(id)
}

/**
 * How many grid cells to keep mounted. Starts at `baseCells` (the viewport
 * plus a small margin) and, while the page is not scrolling, grows step by
 * step towards MAX_CELLS, so rows scrolled back to are still there instead of
 * remounting and reloading. It backs off when the browser cannot keep up:
 * - a growth step is timed from the state update to the next painted frame,
 *   and undone if that took too long; the second slow step stops growth there
 * - repeated stalls while scrolling shrink the budget by a quarter
 * Both lower the ceiling for the rest of the session.
 *
 * @param baseCells The least that is ever mounted
 * @param itemCount Growing past the number of items is pointless
 */
function useAdaptiveCellBudget(baseCells: number, itemCount: number): number {
  const [grownCells, setGrownCells] = useState(0)
  const budget = Math.max(baseCells, grownCells)

  const budgetRef = useRef(budget)
  const baseRef = useRef(baseCells)
  useEffect(() => {
    budgetRef.current = budget
    baseRef.current = baseCells
  })

  // Not 0: performance.now() starts at page load, so stalls while loading
  // would count as stalls while scrolling
  const lastScrollRef = useRef(-Infinity)
  const pendingGrowthRef = useRef<{
    startedAt: number
    before: number
    after: number
  } | null>(null)

  useEffect(() => {
    const onScroll = () => {
      lastScrollRef.current = performance.now()
    }
    window.addEventListener('scroll', onScroll, {passive: true})

    let recentStalls: number[] = []
    const stopObserving = observeStalls(startTime => {
      if (startTime - lastScrollRef.current > SCROLL_BLAME_MS) return
      recentStalls = [
        ...recentStalls.filter(t => startTime - t < STALL_WINDOW_MS),
        startTime,
      ]
      if (recentStalls.length < STALLS_TO_SHRINK) return
      recentStalls = []
      const shrunk = Math.max(
        baseRef.current,
        Math.round(budgetRef.current * SHRINK_RATIO),
      )
      sessionCeiling = Math.min(sessionCeiling, shrunk)
      setGrownCells(shrunk)
    })

    return () => {
      window.removeEventListener('scroll', onScroll)
      stopObserving()
    }
  }, [])

  // Time a growth step: render and commit happen before this layout effect,
  // style, layout and paint before the second animation frame
  useLayoutEffect(() => {
    const growth = pendingGrowthRef.current
    if (!growth || growth.after !== budget) return
    pendingGrowthRef.current = null
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (performance.now() - growth.startedAt <= SLOW_GROWTH_MS) return
        slowGrowths++
        if (slowGrowths >= SLOW_GROWTHS_TO_STOP)
          sessionCeiling = Math.min(sessionCeiling, growth.before)
        else growthPausedUntil = performance.now() + SLOW_GROWTH_COOLDOWN_MS
        setGrownCells(growth.before)
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [budget])

  const target = Math.min(sessionCeiling, Math.max(baseCells, itemCount))
  useEffect(() => {
    if (budget >= target) return
    let cancelIdle = () => {}
    const timer = setInterval(() => {
      if (document.hidden) return
      const now = performance.now()
      if (now < growthPausedUntil) return
      if (now - lastScrollRef.current < SCROLL_IDLE_MS) return
      cancelIdle()
      cancelIdle = whenIdle(() => {
        const before = budgetRef.current
        const next = Math.min(sessionCeiling, target, before + GROW_STEP_CELLS)
        if (next <= before) return
        pendingGrowthRef.current = {
          startedAt: performance.now(),
          before,
          after: next,
        }
        setGrownCells(next)
      })
    }, GROW_INTERVAL_MS)
    return () => {
      clearInterval(timer)
      cancelIdle()
    }
  }, [budget, target])

  return budget
}

export {useAdaptiveCellBudget}
