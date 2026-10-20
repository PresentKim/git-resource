import thumbnails from './example-thumbnails.json'
import {createGithubRepo, createRawImageUrl} from './github'

interface ExampleThumbnailEntry {
  /** The commit the image paths were picked from */
  sha: string
  images: string[]
}

const exampleThumbnails: Record<string, ExampleThumbnailEntry> = thumbnails

/**
 * Raw image URLs for an example repository's thumbnails, pinned to the commit
 * they were picked from. The list comes from
 * scripts/update-example-thumbnails.mjs, so showing them costs no GitHub API
 * calls; raw.githubusercontent.com is not rate limited like the API.
 */
export function getExampleThumbnailUrls(
  owner: string,
  name: string,
  ref: string,
): string[] {
  const entry = exampleThumbnails[`${owner}/${name}/${ref}`]
  if (!entry) return []
  const repo = createGithubRepo(owner, name, entry.sha)
  return entry.images.map(path => createRawImageUrl(repo, path))
}
