import thumbnails from './example-thumbnails.json'
import {createGithubRepo, createRawImageUrl} from './github'

interface ExampleThumbnailEntry {
  /** The commit the image paths were picked from */
  sha: string
  /** The repository's GitHub description, when it has one */
  description?: string
  images: string[]
}

const exampleThumbnails: Record<string, ExampleThumbnailEntry> = thumbnails

export interface RepositoryPreview {
  description?: string
  thumbnailUrls: string[]
}

/**
 * The description and thumbnail URLs of an example repository,
 * pinned to the commit they were picked from. They come from
 * scripts/update-example-thumbnails.mjs, so showing them costs no GitHub API
 * calls; raw.githubusercontent.com is not rate limited like the API.
 */
export function getRepositoryPreview(
  owner: string,
  name: string,
  ref: string,
): RepositoryPreview {
  const entry = exampleThumbnails[`${owner}/${name}/${ref}`]
  if (!entry) return {thumbnailUrls: []}
  const repo = createGithubRepo(owner, name, entry.sha)
  return {
    description: entry.description,
    thumbnailUrls: entry.images.map(path => createRawImageUrl(repo, path)),
  }
}
