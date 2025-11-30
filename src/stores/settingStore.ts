import {create} from 'zustand'

export type Theme = 'light' | 'dark'
export type GridBackground = 'auto' | 'white' | 'black' | 'transparent'

interface SettingsStore {
  githubToken: string
  setGithubToken: (token: string) => void

  columnCount: number
  setColumnCount: (columnCount: number) => void

  filledColumnCount: number
  updateFilledColumnCount: () => void

  pixelated: boolean
  setPixelated: (pixelated: boolean) => void

  animationEnabled: boolean
  setAnimationEnabled: (animationEnabled: boolean) => void

  theme: Theme
  setTheme: (theme: Theme) => void

  gridBackground: GridBackground
  setGridBackground: (background: GridBackground) => void
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
const ANIMATION_ENABLED_KEY = 'settings.animationEnabled'
const THEME_KEY = 'settings.theme'
const GRID_BACKGROUND_KEY = 'settings.gridBackground'
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

  animationEnabled: localStorage.getItem(ANIMATION_ENABLED_KEY) !== 'false',
  setAnimationEnabled: (animationEnabled: boolean) => {
    set({animationEnabled})
    localStorage.setItem(ANIMATION_ENABLED_KEY, animationEnabled.toString())
  },

  theme: (() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | 'system' | null
    // Migrate 'system' to 'dark'
    if (stored === 'system' || !stored) {
      return 'dark'
    }
    return stored
  })(),
  setTheme: (theme: Theme) => {
    set({theme})
    localStorage.setItem(THEME_KEY, theme)
  },

  gridBackground:
    (localStorage.getItem(GRID_BACKGROUND_KEY) as GridBackground) || 'auto',
  setGridBackground: (background: GridBackground) => {
    set({gridBackground: background})
    localStorage.setItem(GRID_BACKGROUND_KEY, background)
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    useSettingStore.getState().updateFilledColumnCount()
  })
}
