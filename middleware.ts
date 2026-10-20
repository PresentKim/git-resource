import {next} from '@vercel/functions'

import {parseGithubUrl} from './src/shared/utils/github.js'
import {
  APP_NAME,
  getRouteDescription,
  getRouteTitle,
} from './src/shared/utils/routeMeta.js'

/**
 * Vercel Routing Middleware: link-preview metadata for repository pages.
 *
 * Every route serves the same index.html, and link-preview crawlers (Discord,
 * Slack, KakaoTalk, X, Facebook) do not run JavaScript, so they would all see
 * the home page's title and image. For /owner/repo[/ref] this serves
 * index.html with the title, description, og:* and twitter:* tags of that
 * repository instead. Only the URL is used here (no GitHub requests), so the
 * page is never slowed down; the dynamic image (/api/og) does the fetching.
 */
export const config = {
  // Repository paths have at least two segments; static files sit at the top
  // level (favicon.ico, thumbnail.png, ...), and /api, /proxy and /assets
  // are left alone.
  matcher: '/((?!api/|proxy/|assets/).+/.+)',
}

const OG_IMAGE_WIDTH = 1200
const OG_IMAGE_HEIGHT = 630

/** Tags this middleware writes; the same tags in index.html are dropped */
const REPLACED_TAGS =
  /<title>[\s\S]*?<\/title>\s*|<meta\s+(?:property|name)="(?:description|og:title|og:description|og:url|og:image(?::width|:height|:alt)?|og:site_name|twitter:[a-z:]+)"[^>]*>\s*/g

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** index.html does not change within a deployment; fetch it once per instance */
let indexHtml: Promise<string> | null = null

function getIndexHtml(origin: string): Promise<string> {
  if (!indexHtml) {
    indexHtml = fetch(new URL('/index.html', origin)).then(response => {
      if (!response.ok) throw new Error(`index.html: ${response.status}`)
      return response.text()
    })
    // Forget a failed request so the next one retries
    indexHtml.catch(() => {
      indexHtml = null
    })
  }
  return indexHtml
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default async function middleware(request: Request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next()

  const url = new URL(request.url)
  const repo = parseGithubUrl(safeDecode(url.pathname.slice(1)))
  if (!repo) return next()

  let html: string
  try {
    html = await getIndexHtml(url.origin)
  } catch (error) {
    console.error('middleware: falling back to the static page', error)
    return next()
  }

  const imagePath = url.searchParams.get('image')
  const title = getRouteTitle(repo, imagePath)
  const description = getRouteDescription(repo, imagePath)

  const ogImage = new URL('/api/og', url.origin)
  ogImage.searchParams.set('owner', repo.owner)
  ogImage.searchParams.set('repo', repo.name)
  if (repo.ref) ogImage.searchParams.set('ref', repo.ref)
  if (imagePath) ogImage.searchParams.set('image', imagePath)

  const tags: [string, string, string][] = [
    ['name', 'description', description],
    ['property', 'og:site_name', APP_NAME],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['property', 'og:url', url.href],
    ['property', 'og:image', ogImage.href],
    ['property', 'og:image:width', String(OG_IMAGE_WIDTH)],
    ['property', 'og:image:height', String(OG_IMAGE_HEIGHT)],
    ['property', 'og:image:alt', title],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
    ['name', 'twitter:image', ogImage.href],
  ]
  const head = [
    `<title>${escapeHtml(title)}</title>`,
    ...tags.map(
      ([attribute, key, value]) =>
        `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`,
    ),
  ].join('\n    ')

  // Put the new tags where <title> was, then drop the rest of the old ones
  let inserted = false
  const body = html.replace(REPLACED_TAGS, match => {
    if (inserted || !match.startsWith('<title>')) return ''
    inserted = true
    return `${head}\n    `
  })

  return new Response(request.method === 'HEAD' ? null : body, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
