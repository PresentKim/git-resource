/**
 * The few GitHub requests the link-preview image needs. Each one is optional:
 * a failure (rate limit, private repository, timeout) returns null and the
 * card is drawn without that part.
 */

const TIMEOUT_MS = 4000

/** Image files larger than this are skipped */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

function apiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'git-resource-og',
  }
  // Optional: raises the API limit from 60 to 5,000 requests an hour
  const token = process.env.GITHUB_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: apiHeaders(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return response.ok ? ((await response.json()) as T) : null
  } catch {
    return null
  }
}

export async function fetchRepoDescription(
  owner: string,
  repo: string,
): Promise<string | null> {
  const data = await fetchJson<{description: string | null}>(
    `https://api.github.com/repos/${owner}/${repo}`,
  )
  return data?.description?.trim() || null
}

/** Every file path of the repository at `ref` (HEAD for the default branch) */
export async function fetchFilePaths(
  owner: string,
  repo: string,
  ref: string,
): Promise<string[] | null> {
  const data = await fetchJson<{tree: {path: string; type: string}[]}>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodePath(ref)}?recursive=1`,
  )
  return data?.tree.filter(e => e.type === 'blob').map(e => e.path) ?? null
}

export async function fetchRawFile(
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodePath(ref)}/${encodePath(path)}`,
      {signal: AbortSignal.timeout(TIMEOUT_MS)},
    )
    if (!response.ok) return null
    if (Number(response.headers.get('Content-Length')) > MAX_IMAGE_BYTES) {
      return null
    }
    const data = await response.arrayBuffer()
    return data.byteLength > MAX_IMAGE_BYTES ? null : data
  } catch {
    return null
  }
}

export async function rawFileExists(
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodePath(ref)}/${encodePath(path)}`,
      {method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS)},
    )
    return response.ok
  } catch {
    return false
  }
}
