import type {
  WorkerRequestBase,
  DefaultBranchRequest,
  DefaultBranchResponse,
  GithubDefaultBranch,
} from '../types'
import {BaseGithubWorker} from './baseWorker'

class DefaultBranchWorker extends BaseGithubWorker<
  DefaultBranchRequest & WorkerRequestBase,
  GithubDefaultBranch
> {
  protected getCacheKey(request: DefaultBranchRequest): string {
    return `${request.owner}/${request.name}/default-branch`
  }

  protected fetchData(
    {owner, name}: DefaultBranchRequest,
    headers: HeadersInit,
  ): Promise<Response> {
    return fetch(`https://api.github.com/repos/${owner}/${name}`, {headers})
  }
  protected async fallbackFetchData({
    owner,
    name,
  }: DefaultBranchRequest): Promise<GithubDefaultBranch> {
    const response = await fetch(`/proxy/github/${owner}/${name}`)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const html = await response.text()

    // Try to find the default branch in the HTML
    for (const pattern of [
      /aria-label="([^"]+)\sbranch"/i, // aria-label="dev/1.3.0 branch"
      new RegExp(`href="/${owner}/${name}/commits/([^/]+)/"`), // href="/owner/name/commits/dev/1.3.0/"
      /data-default-branch="([^"]+)"/i, // data-default-branch="dev/1.3.0"
    ]) {
      const match = html.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    throw new Error('Default branch not found in any pattern')
  }

  protected parseResponse(
    response: DefaultBranchResponse,
  ): GithubDefaultBranch {
    return response.default_branch
  }
}

const worker = new DefaultBranchWorker()
self.onmessage = async (
  e: MessageEvent<DefaultBranchRequest & WorkerRequestBase>,
) => {
  const response = await worker.handleRequest(e.data)
  self.postMessage(response)
}
