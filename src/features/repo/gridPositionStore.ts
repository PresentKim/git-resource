import {create} from 'zustand'

interface GridPositionStore {
  /** Index of the first image row at the top edge of the viewport */
  firstVisibleIndex: number
  setFirstVisibleIndex: (index: number) => void
}

/**
 * Scroll position of the gallery, written by the grid whenever the top row
 * changes. Kept in its own store so that only the toolbar reading it
 * re-renders while scrolling, not the gallery.
 */
export const useGridPositionStore = create<GridPositionStore>(set => ({
  firstVisibleIndex: 0,
  setFirstVisibleIndex: index => set({firstVisibleIndex: index}),
}))
