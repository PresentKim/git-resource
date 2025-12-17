import {useCallback, useState} from 'react'

export function usePromise<T, A extends unknown[]>(
  asyncFunction: (...args: A) => Promise<T>,
): [boolean, (...args: A) => Promise<T>] {
  const [isLoading, setIsLoading] = useState(false)

  const wrappedFunction = useCallback(
    async (...args: A) => {
      setIsLoading(true)
      try {
        return await asyncFunction(...args)
      } finally {
        setIsLoading(false)
      }
    },
    [asyncFunction],
  )

  return [isLoading, wrappedFunction]
}
