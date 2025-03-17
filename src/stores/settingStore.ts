import {create} from 'zustand'

interface SettingsStore {
  githubToken: string
  setGithubToken: (token: string) => void

  columnCount: number
  setColumnCount: (columnCount: number) => void

  pixelated: boolean
  setPixelated: (pixelated: boolean) => void
}

const GITHUB_TOKEN_KEY = 'settings.token'
const COLUMN_COUNT_KEY = 'settings.columnCount'
const PIXELATED_KEY = 'settings.pixelated'
export const useSettingStore = create<SettingsStore>(() => ({
  githubToken: localStorage.getItem(GITHUB_TOKEN_KEY) || '',
  setGithubToken: githubToken =>
    localStorage.setItem(GITHUB_TOKEN_KEY, githubToken),

  columnCount: Number(localStorage.getItem(COLUMN_COUNT_KEY)) || 0,
  setColumnCount: columnCount =>
    localStorage.setItem(COLUMN_COUNT_KEY, columnCount.toString()),

  pixelated: localStorage.getItem(PIXELATED_KEY) === 'true',
  setPixelated: (pixelated: boolean) =>
    localStorage.setItem(PIXELATED_KEY, pixelated.toString()),
}))
