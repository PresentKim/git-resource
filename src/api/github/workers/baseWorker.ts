import type {RateLimit, WorkerRequestBase, WorkerResponse} from '../types'
import {WorkerStorage} from './storage'

export abstract class BaseGithubWorker<TRequest, TResponse> {
  protected storage = new WorkerStorage()

  protected abstract getCacheKey(request: TRequest): string
  protected abstract fetchData(
    request: TRequest,
    headers: HeadersInit,
  ): Promise<Response>
  protected abstract fallbackFetchData(request: TRequest): Promise<TResponse>
  protected abstract parseResponse(response: unknown): TResponse

  async handleRequest(request: TRequest & WorkerRequestBase) {
    const cacheKey = this.getCacheKey(request)
    const cache = await this.storage.getCache<TResponse>(cacheKey)

    if (cache) {
      if (cache.expiredAt > Date.now()) {
        return this.createResponse(cache.value, {limit: 0, remaining: 0})
      } else {
        this.storage.removeCache(cacheKey)
      }
    }

    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    }

    if (request.token) {
      headers['Authorization'] = `Bearer ${request.token}`
    }

    if (cache?.etag) {
      headers['If-None-Match'] = cache.etag
    }

    try {
      const response = await this.fetchData(request, headers)
      const rateLimit: RateLimit = {
        limit: parseInt(response.headers.get('X-Ratelimit-Limit') || '0'),
        remaining: parseInt(
          response.headers.get('X-Ratelimit-Remaining') || '0',
        ),
      }

      if (response.status === 304 && cache) {
        return this.createResponse(cache.value, rateLimit)
      }

      if (!response.ok) {
        throw new Error(`GitHub API request failed: ${response.status}`)
      }

      const data = await response.json()
      const parsedData = this.parseResponse(data)

      const etag = response.headers.get('ETag')
      if (etag) {
        await this.storage.setCache(cacheKey, etag, parsedData)
      }

      return this.createResponse(parsedData, rateLimit)
    } catch (error) {
      if ((error as Error).message === 'GitHub API request failed: 403') {
        try {
          const responseData = await this.fallbackFetchData(request)
          await this.storage.setCache(cacheKey, '', responseData)
          return this.createResponse(responseData, {limit: 0, remaining: 0})
        } catch (fallbackError) {
          return this.createErrorResponse((fallbackError as Error).message)
        }
      }
      return this.createErrorResponse((error as Error).message)
    }
  }

  protected createResponse(
    data: TResponse,
    rateLimit: RateLimit,
  ): WorkerResponse<TResponse> {
    return {data, rateLimit}
  }

  protected createErrorResponse(message: string): WorkerResponse<TResponse> {
    return {error: message}
  }
}
