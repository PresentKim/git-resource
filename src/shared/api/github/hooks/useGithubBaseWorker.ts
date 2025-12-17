import {useCallback, useEffect, useRef} from 'react'

import {useGithubRateLimitStore} from '@/shared/stores/githubApiStore'
import {useSettingStore} from '@/shared/stores/settingStore'

import type {WorkerResponse} from '../types'

export function useGithubWorker<TRequest, TResponse>(workerUrl: string) {
  const workerRef = useRef<Worker | null>(null)
  const setRateLimit = useGithubRateLimitStore(state => state.setRateLimit)
  const githubToken = useSettingStore(state => state.githubToken)

  useEffect(() => {
    workerRef.current = new Worker(workerUrl, {type: 'module'})
    return () => workerRef.current?.terminate()
  }, [workerUrl])

  return useCallback(
    async (request: TRequest) => {
      if (!workerRef.current) {
        throw new Error('Worker not initialized')
      }

      return new Promise<TResponse>((resolve, reject) => {
        if (!workerRef.current) return

        workerRef.current.onmessage = (
          e: MessageEvent<WorkerResponse<TResponse>>,
        ) => {
          if (e.data.error) {
            reject(new Error(e.data.error))
            return
          }

          if (e.data.rateLimit) {
            setRateLimit(e.data.rateLimit.limit, e.data.rateLimit.remaining)
          }

          if (e.data.data !== undefined) {
            resolve(e.data.data)
          }
        }

        workerRef.current.postMessage({...request, token: githubToken})
      })
    },
    [githubToken, setRateLimit],
  )
}
