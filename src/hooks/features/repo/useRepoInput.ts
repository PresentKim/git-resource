import {useCallback} from 'react'
import {useInputRef} from '@/hooks/features/form/useInputRef'
import {parseGithubUrl} from '@/utils'
import {useRepoSetting} from './useRepoSetting'

/**
 * Hook for managing repository input
 * Handles input ref, parsing, and setting
 */
export function useRepoInput() {
  const {inputRef, clearInput, getValue} = useInputRef()
  const {setRepo} = useRepoSetting()

  const handleClearRepo = useCallback(() => {
    clearInput()
  }, [clearInput])

  const handleApplyRepo = useCallback(() => {
    const url = getValue()
    if (!url) return

    const parsedRepo = parseGithubUrl(url)
    if (!parsedRepo) return

    setRepo(parsedRepo)
  }, [getValue, setRepo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleApplyRepo()
      }
    },
    [handleApplyRepo],
  )

  return {
    inputRef,
    handleClearRepo,
    handleApplyRepo,
    handleKeyDown,
  }
}
