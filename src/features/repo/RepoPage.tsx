import {Gallery, type GalleryLoading} from '@/features/repo/Gallery'
import {RepoError} from '@/features/repo/RepoError'
import {useRepoLoading} from '@/features/repo/useRepoLoading'
import {useGithubRepo, useRepoStore} from '@/shared/stores/repoStore'

/** The gallery of a GitHub repository (/owner/repo/ref) */
export default function RepoPage() {
  const repo = useGithubRepo()

  // Load repository data
  const {isLoadRef, isLoadImagePaths, retry} = useRepoLoading()

  const imageFiles = useRepoStore(state => state.imageFiles)
  const error = useRepoStore(state => state.error)

  const loading: GalleryLoading | null = isLoadRef
    ? {
        title: 'Fetching default branch',
        description: 'Detecting the default branch for this repository...',
      }
    : isLoadImagePaths
      ? {
          title: 'Fetching image list',
          description: 'Loading all image files from the repository...',
        }
      : imageFiles === null && repo?.owner && repo.name
        ? {
            title: 'Loading images',
            description: 'Please wait while images are being loaded...',
          }
        : null

  return (
    <Gallery
      titleLabel={
        repo?.owner && repo.name ? `${repo.owner}/${repo.name}` : null
      }
      loading={loading}
      error={error && <RepoError error={error} onRetry={retry} />}
    />
  )
}
