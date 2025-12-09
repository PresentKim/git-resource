import {useCallback} from 'react'
import {useSettingStore} from '@/stores/settingStore'
import type {SettingsFormValues} from './useSettingsForm'

interface UseSettingsSaveProps {
  formValues: SettingsFormValues
  setInitialValues: (values: SettingsFormValues) => void
}

/**
 * Hook for saving settings
 * Handles saving form values to store
 */
export function useSettingsSave({
  formValues,
  setInitialValues,
}: UseSettingsSaveProps) {
  const settings = useSettingStore()

  const handleSave = useCallback(() => {
    settings.setGithubToken(formValues.githubToken)
    settings.setColumnCount(formValues.columnCount)
    settings.setPixelated(formValues.pixelated)
    settings.setAnimationEnabled(formValues.animationEnabled)
    settings.setTheme(formValues.theme)
    settings.setGridBackground(formValues.gridBackground)
    // Update initial values after saving
    setInitialValues(formValues)
  }, [formValues, setInitialValues, settings])

  return {
    handleSave,
  }
}
