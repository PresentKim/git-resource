export interface GithubRepo {
  /** The owner of the repository */
  owner: string

  /** The name of the repository */
  name: string

  /** The branch, tag, or commit hash of the repository */
  ref: string

  /** The URL to the GitHub repository */
  url: string

  /** The display name of the repository */
  displayName: string
}

/**
 * Create a GitHub repository object.
 *
 * @param owner The owner of the repository.
 * @param name The name of the repository.
 * @param ref The branch, tag, or commit hash of the repository.
 * @returns The created GithubRepo object.
 */
export function createGithubRepo(
  owner: string,
  name: string,
  ref: string,
): GithubRepo {
  return {
    owner: owner || '',
    name: name || '',
    ref: ref || '',
    url: `https://github.com/${owner}/${name}${ref ? `/tree/${ref}` : ''}`,
    displayName: `${owner}/${name}${ref ? `@${ref}` : ''}`,
  }
}

/**
 * Clean GitHub URL input by removing protocol, domain, and trailing characters
 */
function cleanGithubUrlInput(url: string): string {
  return url
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?(git@|github\.com)?[/:]?/i, '')
    .replace(/(\/|\?.+|\.git)$/i, '')
    .trim()
}

/**
 * GitHub URL patterns supported:
 * - owner/repo
 * - owner/repo@ref
 * - owner/repo/@ref
 * - owner/repo/ref
 * - owner/repo/tree/ref
 * - owner/repo/commit/ref
 */
const GITHUB_URL_REGEX =
  /^(?<owner>[a-z0-9_-]+)\/(?<repo>[a-z0-9_-]+)(?:\/tree\/|\/commit\/|\/?@|\/)?(?<ref>[a-z0-9/_.-]+)?$/i

/**
 * Parse a GitHub URL into a GithubRepo object
 *
 * @param url The GitHub URL to parse
 * @returns The parsed GithubRepo object, or null if the URL is invalid
 */
export function parseGithubUrl(url: string): GithubRepo | null {
  if (!url || typeof url !== 'string') {
    return null
  }

  const cleanInput = cleanGithubUrlInput(url)
  if (!cleanInput) {
    return null
  }

  const regexMatch = cleanInput.match(GITHUB_URL_REGEX)
  if (!regexMatch?.groups) {
    return null
  }

  const {owner, repo, ref} = regexMatch.groups

  // Validate owner and repo are present
  if (!owner || !repo) {
    return null
  }

  return createGithubRepo(owner, repo, ref || '')
}

/**
 * Create a direct image URL from GitHub
 */
export function createRawImageUrl(repo: GithubRepo, path: string): string {
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.ref}/${path}`
}
