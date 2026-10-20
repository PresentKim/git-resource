import thumbnails from './example-thumbnails.json'
import type {FeaturedRepository} from './example-repositories'
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
 * The description and thumbnail URLs of a featured or example repository,
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

/** Like getRepositoryPreview, with what the featured entry sets itself first */
export function getFeaturedPreview(
  featured: FeaturedRepository,
): RepositoryPreview {
  const {owner, name, ref, description, previewImages} = featured
  const picked = getRepositoryPreview(owner, name, ref)
  const repo = createGithubRepo(owner, name, ref)
  return {
    description: description ?? picked.description,
    thumbnailUrls: previewImages
      ? previewImages.map(path => createRawImageUrl(repo, path))
      : picked.thumbnailUrls,
  }
}
