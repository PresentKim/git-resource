import type {
  WorkerRequestBase,
  RefsRequest,
  RefsResponse,
  GithubRefs,
} from '../types'
import {BaseGithubWorker} from './baseWorker'

/** Sort branch and tag names out of full ref names */
function groupRefs(refs: Iterable<string>): GithubRefs {
  const branches: string[] = []
  const tags: string[] = []
  for (const ref of refs) {
    if (ref.startsWith('refs/heads/')) {
      branches.push(ref.slice('refs/heads/'.length))
    } else if (ref.startsWith('refs/tags/') && !ref.endsWith('^{}')) {
      tags.push(ref.slice('refs/tags/'.length))
    }
  }
  // Newest versions first, as people usually compare with a recent release
  tags.sort((a, b) => b.localeCompare(a, undefined, {numeric: true}))
  return {branches, tags}
}

class RefsWorker extends BaseGithubWorker<
  RefsRequest & WorkerRequestBase,
  GithubRefs
> {
  protected getCacheKey(request: RefsRequest): string {
    return `${request.owner}/${request.name}/refs`
  }

  protected fetchData(
    {owner, name}: RefsRequest,
    headers: HeadersInit,
  ): Promise<Response> {
    // One page is plenty for suggestions; any other ref can still be typed
    return fetch(
      `https://api.github.com/repos/${owner}/${name}/git/refs?per_page=100`,
      {headers},
    )
  }

  /**
   * Git's own ref advertisement, which the API limit does not apply to: a
   * list of pkt-lines, each "<sha> <ref>" (the first one followed by a NUL
   * and the server's capabilities)
   */
  protected async fallbackFetchData({
    owner,
    name,
  }: RefsRequest): Promise<GithubRefs> {
    const response = await fetch(
      `/proxy/github/${owner}/${name}.git/info/refs?service=git-upload-pack`,
    )
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const text = await response.text()
    const refs: string[] = []
    for (const line of text.split('\n')) {
      const match = line.match(/^[0-9a-f]{4}[0-9a-f]{40} ([^\0\s]+)/)
      if (match) refs.push(match[1])
    }
    return groupRefs(refs)
  }

  protected parseResponse(response: RefsResponse): GithubRefs {
    return groupRefs(response.map(entry => entry.ref))
  }
}

const worker = new RefsWorker()
self.onmessage = async (e: MessageEvent<RefsRequest & WorkerRequestBase>) => {
  const response = await worker.handleRequest(e.data)
  self.postMessage(response)
}
