import {create} from 'zustand'

interface SettingsStore {
  githubToken: string
  setGithubToken: (token: string) => void

  columnCount: number
  setColumnCount: (columnCount: number) => void

  filledColumnCount: number
  updateFilledColumnCount: () => void

  pixelated: boolean
  setPixelated: (pixelated: boolean) => void
}

const getColumnCount = () => {
  return Number(localStorage.getItem(COLUMN_COUNT_KEY) || 0)
}

const calcColumnCount = () => {
  const ASPECT_ITEM_SIZE = 64
  const calculatedColumns = Math.floor(window.innerWidth / ASPECT_ITEM_SIZE)
  return Math.max(1, calculatedColumns)
}

const GITHUB_TOKEN_KEY = 'settings.token'
const COLUMN_COUNT_KEY = 'settings.columnCount'
const PIXELATED_KEY = 'settings.pixelated'
export const useSettingStore = create<SettingsStore>((set, get) => ({
  githubToken: localStorage.getItem(GITHUB_TOKEN_KEY) || '',
  setGithubToken: githubToken => {
    set({githubToken})
    localStorage.setItem(GITHUB_TOKEN_KEY, githubToken)
  },

  columnCount: getColumnCount(),
  setColumnCount: columnCount => {
    set({columnCount})
    get().updateFilledColumnCount()
    localStorage.setItem(COLUMN_COUNT_KEY, columnCount.toString())
  },
  filledColumnCount: getColumnCount() || calcColumnCount(),
  updateFilledColumnCount: () => {
    set({filledColumnCount: get().columnCount || calcColumnCount()})
  },

  pixelated: localStorage.getItem(PIXELATED_KEY) !== 'false',
  setPixelated: (pixelated: boolean) => {
    set({pixelated})
    localStorage.setItem(PIXELATED_KEY, pixelated.toString())
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    useSettingStore.getState().updateFilledColumnCount()
  })
}
