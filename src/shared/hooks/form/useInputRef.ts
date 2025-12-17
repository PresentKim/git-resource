import {useRef} from 'react'

/**
 * Hook for managing input ref
 * Provides a consistent way to access input element
 */
export function useInputRef() {
  const inputRef = useRef<HTMLInputElement>(null)

  const clearInput = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const getValue = () => {
    return inputRef.current?.value || ''
  }

  const setValue = (value: string) => {
    if (inputRef.current) {
      inputRef.current.value = value
    }
  }

  return {
    inputRef,
    clearInput,
    getValue,
    setValue,
  }
}
