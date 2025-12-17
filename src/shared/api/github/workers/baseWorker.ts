import type {RateLimit, WorkerRequestBase, WorkerResponse} from '../types'
import {WorkerStorage} from './storage'

const GITHUB_API_ACCEPT_HEADER = 'application/vnd.github.v3+json'
const RATE_LIMIT_HEADER_LIMIT = 'X-Ratelimit-Limit'
const RATE_LIMIT_HEADER_REMAINING = 'X-Ratelimit-Remaining'
const ETAG_HEADER = 'ETag'
const IF_NONE_MATCH_HEADER = 'If-None-Match'
const AUTHORIZATION_HEADER = 'Authorization'

/**
 * Parse rate limit from response headers
 */
function parseRateLimit(response: Response): RateLimit {
  const limitHeader = response.headers.get(RATE_LIMIT_HEADER_LIMIT)
  const remainingHeader = response.headers.get(RATE_LIMIT_HEADER_REMAINING)

  return {
    limit: parseInt(limitHeader || '0', 10),
    remaining: parseInt(remainingHeader || '0', 10),
  }
}

/**
 * Check if error is a 403 Forbidden error
 */
function isForbiddenError(error: unknown): boolean {
  return (
    error instanceof Error && error.message === 'GitHub API request failed: 403'
  )
}

export abstract class BaseGithubWorker<TRequest, TResponse> {
  protected storage = new WorkerStorage()

  protected abstract getCacheKey(request: TRequest): string
  protected abstract fetchData(
    request: TRequest,
    headers: HeadersInit,
  ): Promise<Response>
  protected abstract fallbackFetchData(request: TRequest): Promise<TResponse>
  protected abstract parseResponse(response: unknown): TResponse

  async handleRequest(
    request: TRequest & WorkerRequestBase,
  ): Promise<WorkerResponse<TResponse>> {
    const cacheKey = this.getCacheKey(request)
    const cache = await this.storage.getCache<TResponse>(cacheKey)

    // Check if cache is valid
    if (cache && cache.expiredAt > Date.now()) {
      return this.createResponse(cache.value, {limit: 0, remaining: 0})
    }

    // Remove expired cache
    if (cache && cache.expiredAt <= Date.now()) {
      await this.storage.removeCache(cacheKey)
    }

    // Build request headers
    const headers: HeadersInit = {
      Accept: GITHUB_API_ACCEPT_HEADER,
    }

    if (request.token) {
      headers[AUTHORIZATION_HEADER] = `Bearer ${request.token}`
    }

    if (cache?.etag) {
      headers[IF_NONE_MATCH_HEADER] = cache.etag
    }

    try {
      const response = await this.fetchData(request, headers)
      const rateLimit = parseRateLimit(response)

      // Handle 304 Not Modified
      if (response.status === 304 && cache) {
        return this.createResponse(cache.value, rateLimit)
      }

      // Handle error responses
      if (!response.ok) {
        throw new Error(`GitHub API request failed: ${response.status}`)
      }

      // Parse response data
      const data = await response.json()
      const parsedData = this.parseResponse(data)

      // Cache the response if ETag is available
      const etag = response.headers.get(ETAG_HEADER)
      if (etag) {
        await this.storage.setCache(cacheKey, etag, parsedData)
      }

      return this.createResponse(parsedData, rateLimit)
    } catch (error) {
      // Try fallback for 403 errors
      if (isForbiddenError(error)) {
        try {
          const responseData = await this.fallbackFetchData(request)
          await this.storage.setCache(cacheKey, '', responseData)
          return this.createResponse(responseData, {limit: 0, remaining: 0})
        } catch (fallbackError) {
          const errorMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError)
          return this.createErrorResponse(errorMessage)
        }
      }

      // Handle other errors
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      return this.createErrorResponse(errorMessage)
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
