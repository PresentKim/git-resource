import {useGithubRateLimitStore} from '@/shared/stores/githubApiStore'
import {useSettingStore} from '@/shared/stores/settingStore'

import type {WorkerResponse} from './types'

/**
 * Run a single request on a fresh worker and terminate it afterwards.
 * Each call owns its worker, so concurrent requests cannot receive each
 * other's responses and an unmounting component cannot orphan a request.
 */
export function callGithubWorker<TRequest, TResponse>(
  workerUrl: string,
  request: TRequest,
  signal?: AbortSignal,
): Promise<TResponse> {
  return new Promise<TResponse>((resolve, reject) => {
    const worker = new Worker(String(new URL(workerUrl, import.meta.url)), {
      type: 'module',
    })

    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort)
      worker.terminate()
    }
    const onAbort = () => {
      cleanup()
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'))
    }

    if (signal?.aborted) {
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort)

    worker.onmessage = (e: MessageEvent<WorkerResponse<TResponse>>) => {
      cleanup()

      if (e.data.error) {
        reject(new Error(e.data.error))
        return
      }

      if (e.data.rateLimit) {
        useGithubRateLimitStore
          .getState()
          .setRateLimit(e.data.rateLimit.limit, e.data.rateLimit.remaining)
      }

      if (e.data.data !== undefined) {
        resolve(e.data.data)
      } else {
        reject(new Error('Empty response from GitHub worker'))
      }
    }
    worker.onerror = e => {
      cleanup()
      reject(new Error(e.message || 'GitHub worker failed'))
    }

    worker.postMessage({
      ...request,
      token: useSettingStore.getState().githubToken,
    })
  })
}
