import {create} from 'zustand'
import {useMemo} from 'react'

export type Theme = 'light' | 'dark'
export type GridBackground = 'auto' | 'white' | 'black' | 'transparent'

export interface SpriteSettings {
  gap: number
  backgroundColor: string
  customColor: string
  useCustomColor: boolean
  scale: number
  imageSmoothing: boolean
  columns: number | null
}

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

  spriteSettings: SpriteSettings
  setSpriteSettings: (settings: SpriteSettings) => void
}

// LocalStorage keys
const STORAGE_KEYS = {
  GITHUB_TOKEN: 'settings.token',
  COLUMN_COUNT: 'settings.columnCount',
  PIXELATED: 'settings.pixelated',
  ANIMATION_ENABLED: 'settings.animationEnabled',
  THEME: 'settings.theme',
  GRID_BACKGROUND: 'settings.gridBackground',
  SPRITE_SETTINGS: 'settings.spriteSettings',
} as const

// Constants
const ASPECT_ITEM_SIZE = 64
const MIN_COLUMN_COUNT = 1

/**
 * Get column count from localStorage
 */
const getColumnCount = (): number => {
  const stored = localStorage.getItem(STORAGE_KEYS.COLUMN_COUNT)
  return Number(stored || 0)
}

/**
 * Calculate column count based on window width
 */
const calculateColumnCount = (): number => {
  const calculatedColumns = Math.floor(window.innerWidth / ASPECT_ITEM_SIZE)
  return Math.max(MIN_COLUMN_COUNT, calculatedColumns)
}
/**
 * Get initial theme from localStorage with migration support
 */
const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME) as
    | Theme
    | 'system'
    | null
  // Migrate 'system' to 'dark'
  if (stored === 'system' || !stored) {
    return 'dark'
  }
  return stored
}

/**
 * Get boolean value from localStorage
 */
const getBooleanFromStorage = (key: string, defaultValue: boolean): boolean => {
  const stored = localStorage.getItem(key)
  if (stored === null) return defaultValue
  return stored !== 'false'
}

export const useSettingStore = create<SettingsStore>((set, get) => ({
  githubToken: localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN) || '',
  setGithubToken: (githubToken: string) => {
    set({githubToken})
    localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, githubToken)
  },

  columnCount: getColumnCount(),
  setColumnCount: (columnCount: number) => {
    set({columnCount})
    get().updateFilledColumnCount()
    localStorage.setItem(STORAGE_KEYS.COLUMN_COUNT, columnCount.toString())
  },
  filledColumnCount: getColumnCount() || calculateColumnCount(),
  updateFilledColumnCount: () => {
    set({
      filledColumnCount: get().columnCount || calculateColumnCount(),
    })
  },

  pixelated: getBooleanFromStorage(STORAGE_KEYS.PIXELATED, true),
  setPixelated: (pixelated: boolean) => {
    set({pixelated})
    localStorage.setItem(STORAGE_KEYS.PIXELATED, pixelated.toString())
  },

  animationEnabled: getBooleanFromStorage(STORAGE_KEYS.ANIMATION_ENABLED, true),
  setAnimationEnabled: (animationEnabled: boolean) => {
    set({animationEnabled})
    localStorage.setItem(
      STORAGE_KEYS.ANIMATION_ENABLED,
      animationEnabled.toString(),
    )
  },

  theme: getInitialTheme(),
  setTheme: (theme: Theme) => {
    set({theme})
    localStorage.setItem(STORAGE_KEYS.THEME, theme)
  },

  gridBackground:
    (localStorage.getItem(STORAGE_KEYS.GRID_BACKGROUND) as GridBackground) ||
    'auto',
  setGridBackground: (background: GridBackground) => {
    set({gridBackground: background})
    localStorage.setItem(STORAGE_KEYS.GRID_BACKGROUND, background)
  },

  spriteSettings: (() => {
    const stored = localStorage.getItem(STORAGE_KEYS.SPRITE_SETTINGS)
    if (stored) {
      try {
        return JSON.parse(stored) as SpriteSettings
      } catch {
        // Invalid JSON, return default
      }
    }
    // Default sprite settings
    return {
      gap: 0,
      backgroundColor: 'transparent',
      customColor: '#ffffff',
      useCustomColor: false,
      scale: 1,
      imageSmoothing: true,
      columns: null, // null = use current grid column count
    }
  })(),
  setSpriteSettings: (settings: SpriteSettings) => {
    set({spriteSettings: settings})
    localStorage.setItem(STORAGE_KEYS.SPRITE_SETTINGS, JSON.stringify(settings))
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    useSettingStore.getState().updateFilledColumnCount()
  })
}

/**
 * Display settings type
 */
export type DisplaySettings = {
  columnCount: number
  pixelated: boolean
  animationEnabled: boolean
  gridBackground: GridBackground
}

/**
 * Hook to get display-related settings in a single call
 * This reduces re-renders compared to multiple useSettingStore calls
 */
export function useDisplaySettings(): DisplaySettings {
  const columnCount = useSettingStore(state => state.filledColumnCount)
  const pixelated = useSettingStore(state => state.pixelated)
  const animationEnabled = useSettingStore(state => state.animationEnabled)
  const gridBackground = useSettingStore(state => state.gridBackground)

  return useMemo(
    () => ({
      columnCount,
      pixelated,
      animationEnabled,
      gridBackground,
    }),
    [columnCount, pixelated, animationEnabled, gridBackground],
  )
}
