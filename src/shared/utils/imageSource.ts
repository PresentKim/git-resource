import {
  createGithubBlobUrl,
  createGithubRepo,
  createRawImageUrl,
  type GithubRepo,
} from './github'
import {isMcmetaFile} from './mcmeta'

/** The images of a GitHub repository at one ref */
export interface GithubSource {
  kind: 'github'
  repo: GithubRepo
  /**
   * Set while comparing with another ref: the paths that exist only there
   * (removed since) are loaded from that ref
   */
  comparison?: {repo: GithubRepo; removed: ReadonlySet<string>}
}

/** Files opened from this device: a folder, .zip/.jar archives or images */
export interface LocalSource {
  kind: 'local'
  /** What was opened, e.g. the folder or archive name */
  name: string
  files: ReadonlyMap<string, Blob>
  /** Object URLs, made on first use and revoked by disposeImageSource */
  urls: Map<string, string>
}

/** Where an image of the favorites lives */
export interface FavoriteLocation {
  repo: GithubRepo
  path: string
}

/** Starred images from any number of repositories */
export interface FavoritesSource {
  kind: 'favorites'
  /** Gallery path ("owner/repo@ref/path") to the image it stands for */
  entries: ReadonlyMap<string, FavoriteLocation>
}

/**
 * Where the gallery's images come from. Paths in the gallery are relative to
 * the source, which turns them into URLs, so the grid, the viewer and the
 * downloads work the same for every kind.
 */
export type ImageSource = GithubSource | LocalSource | FavoritesSource

export const EMPTY_SOURCE: GithubSource = {
  kind: 'github',
  repo: createGithubRepo('', '', ''),
}

/** The repository and path a gallery path stands for, if it is on GitHub */
export function locateOnGithub(
  source: ImageSource,
  path: string,
): FavoriteLocation | null {
  switch (source.kind) {
    case 'github':
      return {
        repo: source.comparison?.removed.has(path)
          ? source.comparison.repo
          : source.repo,
        path,
      }
    case 'favorites': {
      const entry = source.entries.get(path)
      if (entry) return entry
      // An animation's .mcmeta sits next to its image
      if (isMcmetaFile(path)) {
        const image = source.entries.get(path.slice(0, -'.mcmeta'.length))
        if (image) return {repo: image.repo, path: `${image.path}.mcmeta`}
      }
      return null
    }
    case 'local':
      return null
  }
}

/** The URL an image (or .mcmeta file) of the source loads from */
export function getImageUrl(source: ImageSource, path: string): string {
  if (source.kind === 'local') {
    const cached = source.urls.get(path)
    if (cached) return cached
    const file = source.files.get(path)
    if (!file) return ''
    const url = URL.createObjectURL(file)
    source.urls.set(path, url)
    return url
  }

  const location = locateOnGithub(source, path)
  return location ? createRawImageUrl(location.repo, location.path) : ''
}

/** The page of the file on GitHub, or null when it is not on GitHub */
export function getExternalUrl(
  source: ImageSource,
  path: string,
): string | null {
  const location = locateOnGithub(source, path)
  return location && location.repo.owner
    ? createGithubBlobUrl(location.repo, location.path)
    : null
}

/** A name for files made from the source (ZIP downloads, sprite sheets) */
export function getSourceFileName(source: ImageSource): string {
  switch (source.kind) {
    case 'github':
      return `${source.repo.owner}-${source.repo.name}`
    case 'local':
      return source.name.replace(/[\\/:*?"<>|]+/g, '_') || 'local'
    case 'favorites':
      return 'favorites'
  }
}

/** Release what the source holds on to (the object URLs of local files) */
export function disposeImageSource(source: ImageSource) {
  if (source.kind !== 'local') return
  for (const url of source.urls.values()) URL.revokeObjectURL(url)
  source.urls.clear()
}
