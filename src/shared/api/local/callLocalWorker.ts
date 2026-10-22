type WorkerMessage<TResult> =
  | {type: 'progress'; done: number; total: number}
  | ({type: 'done'} & TResult)
  | {type: 'error'; message: string}

/**
 * Run one request on a fresh worker that reports progress before its
 * result, and terminate it afterwards (or when the signal aborts).
 */
export function callLocalWorker<TRequest, TResult>(
  workerUrl: string,
  request: TRequest,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
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

    worker.onmessage = (e: MessageEvent<WorkerMessage<TResult>>) => {
      const message = e.data
      if (message.type === 'progress') {
        onProgress?.(message.done, message.total)
        return
      }
      cleanup()
      if (message.type === 'error') {
        reject(new Error(message.message))
      } else {
        resolve(message)
      }
    }
    worker.onerror = e => {
      cleanup()
      reject(new Error(e.message || 'Worker failed'))
    }

    worker.postMessage(request)
  })
}
