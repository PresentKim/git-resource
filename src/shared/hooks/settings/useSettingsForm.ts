import {useState, useMemo, useCallback} from 'react'
import {
  useSettingStore,
  type Theme,
  type GridBackground,
} from '@/shared/stores/settingStore'

export interface SettingsFormValues {
  githubToken: string
  columnCount: number
  pixelated: boolean
  animationEnabled: boolean
  theme: Theme
  gridBackground: GridBackground
}

/**
 * Hook for managing settings form state
 * Handles local form state and initial values
 */
export function useSettingsForm() {
  const settings = useSettingStore()

  const [githubToken, setGithubToken] = useState('')
  const [columnCount, setColumnCount] = useState(0)
  const [pixelated, setPixelated] = useState(true)
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const [theme, setTheme] = useState<Theme>('dark')
  const [gridBackground, setGridBackground] = useState<GridBackground>('auto')
  const [initialValues, setInitialValues] = useState<SettingsFormValues>({
    githubToken: '',
    columnCount: 0,
    pixelated: true,
    animationEnabled: true,
    theme: 'dark',
    gridBackground: 'auto',
  })

  const loadInitialValues = useCallback(() => {
    const initial = {
      githubToken: settings.githubToken,
      columnCount: settings.columnCount,
      pixelated: settings.pixelated,
      animationEnabled: settings.animationEnabled,
      theme: settings.theme,
      gridBackground: settings.gridBackground,
    }
    setGithubToken(initial.githubToken)
    setColumnCount(initial.columnCount)
    setPixelated(initial.pixelated)
    setAnimationEnabled(initial.animationEnabled)
    setTheme(initial.theme)
    setGridBackground(initial.gridBackground)
    setInitialValues(initial)
  }, [settings])

  const hasChanges = useMemo(() => {
    return (
      githubToken !== initialValues.githubToken ||
      columnCount !== initialValues.columnCount ||
      pixelated !== initialValues.pixelated ||
      animationEnabled !== initialValues.animationEnabled ||
      theme !== initialValues.theme ||
      gridBackground !== initialValues.gridBackground
    )
  }, [
    githubToken,
    columnCount,
    pixelated,
    animationEnabled,
    theme,
    gridBackground,
    initialValues,
  ])

  return {
    githubToken,
    setGithubToken,
    columnCount,
    setColumnCount,
    pixelated,
    setPixelated,
    animationEnabled,
    setAnimationEnabled,
    theme,
    setTheme,
    gridBackground,
    setGridBackground,
    initialValues,
    setInitialValues,
    loadInitialValues,
    hasChanges,
  }
}
