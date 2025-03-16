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
