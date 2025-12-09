import {useLayoutEffect, useState} from 'react'

interface UseInputSyncProps {
  externalValue: string
  inputRef: React.RefObject<HTMLInputElement | null>
}

/**
 * Hook for synchronizing external value with input element
 * Useful for controlled inputs that need to sync with URL state or store
 */
export function useInputSync({externalValue, inputRef}: UseInputSyncProps) {
  const [localValue, setLocalValue] = useState(externalValue)

  // Sync localValue with externalValue when it changes
  useLayoutEffect(() => {
    if (localValue !== externalValue) {
      setLocalValue(externalValue)
      if (inputRef.current) {
        inputRef.current.value = externalValue
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalValue])

  return {
    localValue,
    setLocalValue,
  }
}
