/**
 * Worker Pool for reusing Web Workers across components
 * This reduces memory usage and initialization overhead
 */

type WorkerMessageHandler = (event: MessageEvent) => void

interface WorkerPoolEntry {
  worker: Worker
  messageHandlers: Map<string, WorkerMessageHandler>
  requestId: number
}

class WorkerPool {
  private pools = new Map<string, WorkerPoolEntry>()
  private readonly maxWorkers = 2 // Limit concurrent workers per type

  /**
   * Get or create a worker from the pool
   */
  getWorker(workerUrl: string): Worker {
    const normalizedUrl = this.normalizeUrl(workerUrl)
    let entry = this.pools.get(normalizedUrl)

    if (!entry) {
      const worker = new Worker(normalizedUrl, {type: 'module'})
      entry = {
        worker,
        messageHandlers: new Map(),
        requestId: 0,
      }
      this.pools.set(normalizedUrl, entry)

      // Set up global message handler
      worker.onmessage = (event: MessageEvent) => {
        const {requestId} = event.data
        if (requestId && entry.messageHandlers.has(requestId)) {
          const handler = entry.messageHandlers.get(requestId)!
          handler(event)
          // Clean up handler after use
          entry.messageHandlers.delete(requestId)
        }
      }
    }

    return entry.worker
  }

  /**
   * Send a message with a unique request ID and return a promise
   */
  async sendMessage<TResponse>(
    workerUrl: string,
    message: unknown,
  ): Promise<TResponse> {
    const normalizedUrl = this.normalizeUrl(workerUrl)
    
    // Get or create worker
    const worker = this.getWorker(normalizedUrl)
    const entry = this.pools.get(normalizedUrl)!

    const requestId = `req_${Date.now()}_${++entry.requestId}`

    return new Promise<TResponse>((resolve, reject) => {
      const handler = (event: MessageEvent) => {
        const {error, data, rateLimit, requestId: responseRequestId} = event.data
        // Only handle if this is the response for our request
        if (responseRequestId !== requestId) {
          return
        }
        if (error) {
          reject(new Error(error))
        } else if (data !== undefined) {
          resolve({data, rateLimit} as TResponse)
        }
      }

      entry.messageHandlers.set(requestId, handler)

      worker.postMessage({
        ...message,
        requestId,
      })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (entry.messageHandlers.has(requestId)) {
          entry.messageHandlers.delete(requestId)
          reject(new Error('Worker request timeout'))
        }
      }, 30000)
    })
  }

  /**
   * Normalize worker URL for consistent key generation
   */
  private normalizeUrl(workerUrl: string): string {
    try {
      // Convert to absolute URL for consistent key
      return new URL(workerUrl, window.location.href).href
    } catch {
      return workerUrl
    }
  }

  /**
   * Clean up a worker (called when component unmounts)
   * Only terminates if no handlers are pending
   */
  releaseWorker(workerUrl: string): void {
    const normalizedUrl = this.normalizeUrl(workerUrl)
    const entry = this.pools.get(normalizedUrl)

    if (entry && entry.messageHandlers.size === 0) {
      // Only terminate if no pending requests
      // In practice, we keep workers alive for reuse
      // entry.worker.terminate()
      // this.pools.delete(normalizedUrl)
    }
  }

  /**
   * Terminate all workers (for cleanup)
   */
  terminateAll(): void {
    for (const entry of this.pools.values()) {
      entry.worker.terminate()
    }
    this.pools.clear()
  }
}

// Singleton instance
export const workerPool = new WorkerPool()

