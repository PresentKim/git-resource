/**
 * Titles and descriptions that depend on the route. The page (document title)
 * and the routing middleware (link previews) both use these, so a shared link
 * and the open tab read the same.
 *
 * Keep this file free of browser APIs: middleware.ts imports it on the server.
 */

export const APP_NAME = 'Github Resource'

export const APP_DESCRIPTION =
  'A single-page web app for previewing image files from a github repository URL'

interface RouteRepo {
  owner: string
  name: string
  ref: string
}

/** The last segment of an image path, e.g. "stone.png" for "blocks/stone.png" */
export function getImageName(imagePath: string): string {
  return imagePath.split('/').filter(Boolean).pop() ?? imagePath
}

/** "owner/repo", or "owner/repo@ref" when a ref is given */
function getRepoLabel(repo: RouteRepo, withRef: boolean): string {
  const label = `${repo.owner}/${repo.name}`
  return withRef && repo.ref ? `${label}@${repo.ref}` : label
}

/**
 * The document title of a route:
 * - home: "Github Resource"
 * - repository: "owner/repo · Github Resource"
 * - open image: "stone.png · owner/repo · Github Resource"
 */
export function getRouteTitle(
  repo: RouteRepo | null,
  imagePath?: string | null,
): string {
  if (!repo?.owner || !repo.name) return APP_NAME

  const parts = [getRepoLabel(repo, false), APP_NAME]
  if (imagePath) parts.unshift(getImageName(imagePath))
  return parts.join(' · ')
}

/** The link-preview description of a repository route */
export function getRouteDescription(
  repo: RouteRepo,
  imagePath?: string | null,
): string {
  const label = getRepoLabel(repo, true)
  return imagePath
    ? `${imagePath} from ${label}, previewed with ${APP_NAME}.`
    : `Browse every image in ${label} at once with ${APP_NAME}.`
}
