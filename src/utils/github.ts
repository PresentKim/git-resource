import type {TargetRepository} from '@/hooks/useTargetRepository'

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
 * Parse a GitHub URL into a GithubRepo object
 *
 * @param url The GitHub URL to parse
 * @returns The parsed GithubRepo object, or null if the URL is invalid
 */
export function parseGithubUrl(url: string): GithubRepo | null {
  // Remove http://github.com or https://github.com or git@github.com: from the input, and remove .git or / on end
  const cleanInput = url
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?(git@|github\.com)?[/:]?/i, '')
    .replace(/(\/|\?.+|\.git)$/i, '')
    .trim()

  /**
   * Validate the input field is in the correct format
   *
   * Supports the following formats:
   * - owner/repo
   * - owner/repo@ref
   * - owner/repo/@ref
   * - owner/repo/ref
   * - owner/repo/tree/ref
   * - owner/repo/commit/ref
   */
  const regexMatch = cleanInput.match(
    /^(?<owner>[a-z0-9_-]+)\/(?<repo>[a-z0-9_-]+)(?:\/tree\/|\/commit\/|\/?@|\/)?(?<ref>[a-z0-9/_.-]+)?$/i,
  )
  if (!regexMatch || !regexMatch.groups) {
    return null
  }

  const {owner, repo, ref} = regexMatch.groups

  return createGithubRepo(owner, repo, ref || '')
}

/**
 * Create a direct image URL from GitHub
 */
export function createRawImageUrl(repo: GithubRepo, path: string): string {
  return `https://raw.githubusercontent.com/${repo.owner}/${repo.name}/${repo.ref}/${path}`
}
