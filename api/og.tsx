import {readFile} from 'node:fs/promises'
import {ImageResponse} from '@vercel/og'

import {parseGithubUrl} from '../src/shared/utils/github.js'
import {getRouteDescription} from '../src/shared/utils/routeMeta.js'
import {
  fetchFilePaths,
  fetchRawFile,
  fetchRepoDescription,
  rawFileExists,
} from './_lib/github.js'
import {pixelatePng} from './_lib/texture.js'

/**
 * GET /api/og?owner=&repo=&ref=&image=
 *
 * The link-preview image of a repository page, in the style of
 * public/thumbnail.png: owner/repo, the repository description, and either the
 * shared image (?image=) scaled up with nearest-neighbour or a grid of the
 * repository's first PNGs. middleware.ts points og:image here.
 *
 * Parts that GitHub cannot provide (rate limit, private repository) are left
 * out; anything else that fails redirects to the static /thumbnail.png.
 */

export const config = {maxDuration: 15}

const WIDTH = 1200
const HEIGHT = 630

/** The side of the square that holds the image, the grid or the logo */
const MEDIA_SIZE = 336
const GRID_COLUMNS = 3
const GRID_GAP = 12
const GRID_CELL = (MEDIA_SIZE - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS

const COLOR = {
  background: '#484848',
  card: '#333333',
  border: '#1e1e1e',
  shadow: '#262626',
  text: '#f2f2f2',
  muted: '#8c8c8c',
}

const CACHE_CONTROL =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800'
const FALLBACK_CACHE_CONTROL = 'public, max-age=300, s-maxage=300'

/** Galmuri11, cut down to Latin (see api/_fonts/Galmuri-OFL.txt) */
const fontData = readFile(new URL('./_fonts/Galmuri11.ttf', import.meta.url))

/** The app icon (public/favicon.svg), drawn with square pixels */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 16 16" shape-rendering="crispEdges"><path fill="#485566" d="M6 2h4v1H6ZM2 5h3v1H2Zm9 0h3v1h-3v1h2v1h-1v1h-1V7h-1V6h1ZM2 7h2v1H2Zm7 0h1v1H9Zm4 1h1v5h-1v1H9v-1h1v-1h1v-1h1v2h1Zm-3 1h1v2h-1Zm-8 4h1v1H2Z"/><path fill="#2c2735" d="M10 2h1v1h-1ZM5 3h1v1H5Zm7 0h2v1h1v2h-1V4h-2ZM2 4h1v1H2ZM1 5h1v2H1Zm5 1h4v1H6ZM4 7h1v1H4Zm6 0h1v2h1v2h-1V9h-1Zm4 0h1v7h-1v1H2v-1h3v-1h4v1h5ZM1 8h1v5H1Zm2 1h1v3h1v1H4v-1H3Zm7 2h1v1h-1Zm-1 1h1v1H9Z"/><path fill="#5b6e80" d="M3 3h2v1H3Zm3 2h4v1H6Zm-1 6h1v1H5Z"/><path fill="#f3ddc8" d="M6 3h4v2H6ZM3 4h1v1H3Zm9 0h1v1h-1ZM2 6h2v1H2Zm9 0h2v1h-2ZM8 7h1v1h1v1H9V8H8Zm-1 3h1v1H7Z"/><path fill="#8eb6cd" d="M10 3h1v1h1v1h-1v1h-1ZM4 4h1v1H4Zm9 0h1v1h-1ZM4 6h1v1h3v1H5V7H4Zm9 0h2v1h-2ZM4 8h1v1H4Zm5 1h1v2H9Z"/><path fill="#2d465a" d="M11 3h1v1h-1ZM5 4h1v3H5Zm1 4h2v1H6v2H5V9h1Zm2 1h1v3H8Zm-2 2h1v1H6Zm7 2h1v1h-1Z"/><path fill="#26202f" d="M1 7h1v1H1Zm12 0h1v1h-1ZM6 9h2v1H7v1h1v1H7v-1H6Zm-5 4h1v1H1Z"/><path fill="#726b67" d="M2 8h2v1H3v3h1v1h1v1H3v-1H2Zm10 0h1v5h-1Z"/><path fill="#608eb5" d="M5 8h1v1H5v3h4v-1h1v1H9v1H5v-1H4V9h1Zm3 0h1v1H8Z"/></svg>`
const LOGO_URI = `data:image/svg+xml;base64,${Buffer.from(LOGO_SVG).toString('base64')}`

const PNG_PATH = /\.png$/i
/** Game textures make the best grid; other PNGs (screenshots, logos) follow */
const TEXTURE_PATH = /(^|\/)textures?\//i
/** Grid images larger than this are screenshots or photos, not textures */
const GRID_MAX_SIDE = 512
const JPEG_PATH = /\.jpe?g$/i

type Media =
  {kind: 'image'; src: string} | {kind: 'grid'; srcs: string[]} | {kind: 'logo'}

/** The shared image, scaled to fill the media square */
async function loadImage(
  owner: string,
  repo: string,
  ref: string,
  path: string,
): Promise<Media | null> {
  const isPng = PNG_PATH.test(path)
  if (!isPng && !JPEG_PATH.test(path)) return null

  const [data, animated] = await Promise.all([
    fetchRawFile(owner, repo, ref, path),
    isPng ? rawFileExists(owner, repo, ref, `${path}.mcmeta`) : false,
  ])
  if (!data) return null

  const src = isPng
    ? pixelatePng(data, MEDIA_SIZE, MEDIA_SIZE, {firstFrame: animated})
    : `data:image/jpeg;base64,${Buffer.from(data).toString('base64')}`
  return src ? {kind: 'image', src} : null
}

/** The repository's first PNGs, one per grid cell */
async function loadGrid(
  owner: string,
  repo: string,
  ref: string,
): Promise<Media | null> {
  const paths = await fetchFilePaths(owner, repo, ref)
  if (!paths) return null

  const files = new Set(paths)
  const pngs = paths.filter(path => PNG_PATH.test(path))
  // A few spare candidates stand in for images that fail or are too large
  const candidates = [
    ...pngs.filter(path => TEXTURE_PATH.test(path)),
    ...pngs.filter(path => !TEXTURE_PATH.test(path)),
  ].slice(0, GRID_COLUMNS * GRID_COLUMNS + 3)

  const srcs = await Promise.all(
    candidates.map(async path => {
      const data = await fetchRawFile(owner, repo, ref, path)
      if (!data) return null
      try {
        return pixelatePng(data, GRID_CELL, GRID_CELL, {
          firstFrame: files.has(`${path}.mcmeta`),
          maxSide: GRID_MAX_SIDE,
        })
      } catch {
        return null
      }
    }),
  )
  const loaded = srcs
    .filter((src): src is string => src !== null)
    .slice(0, GRID_COLUMNS * GRID_COLUMNS)
  return loaded.length > 0 ? {kind: 'grid', srcs: loaded} : null
}

function MediaBox({media}: {media: Media}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        alignContent: 'center',
        gap: GRID_GAP,
        width: MEDIA_SIZE,
        height: MEDIA_SIZE,
        flexShrink: 0,
      }}>
      {media.kind === 'image' && (
        // Shown at its own size: pixelatePng already scaled it
        <img
          src={media.src}
          style={{maxWidth: MEDIA_SIZE, maxHeight: MEDIA_SIZE}}
        />
      )}
      {media.kind === 'grid' &&
        media.srcs.map((src, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: GRID_CELL,
              height: GRID_CELL,
            }}>
            <img src={src} />
          </div>
        ))}
      {media.kind === 'logo' && <img src={LOGO_URI} width={192} height={192} />}
    </div>
  )
}

/** Shrinks long names so "owner/repo" fits on one line when it can */
function getTitleFontSize(title: string): number {
  if (title.length <= 34) return 48
  if (title.length <= 41) return 40
  return 32
}

interface CardProps {
  owner: string
  repo: string
  ref: string
  imagePath: string | null
  description: string
  media: Media
}

function Card({owner, repo, ref, imagePath, description, media}: CardProps) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        background: COLOR.background,
        fontFamily: 'Galmuri11',
        color: COLOR.text,
      }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1060,
          height: 500,
          padding: '28px 40px 36px',
          gap: 32,
          background: COLOR.card,
          border: `4px solid ${COLOR.border}`,
          boxShadow: `12px 12px 0 ${COLOR.shadow}`,
        }}>
        <div
          style={{
            display: 'flex',
            fontSize: getTitleFontSize(`${owner}/${repo}`),
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
          }}>
          {/* Past the smallest size the owner gives way first */}
          <span
            style={{
              color: COLOR.muted,
              flexShrink: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {owner}
          </span>
          <span style={{color: COLOR.muted, flexShrink: 0}}>/</span>
          <span
            style={{
              flexShrink: 0,
              maxWidth: '75%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
            {repo}
          </span>
        </div>
        <div style={{display: 'flex', flex: 1, gap: 48, alignItems: 'center'}}>
          <MediaBox media={media} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minWidth: 0,
              gap: 20,
            }}>
            {imagePath && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 28,
                  color: COLOR.muted,
                  wordBreak: 'break-all',
                  lineClamp: 2,
                }}>
                {imagePath}
              </div>
            )}
            <div
              style={{
                display: 'flex',
                fontSize: 36,
                lineHeight: 1.5,
                lineClamp: imagePath ? 3 : 5,
              }}>
              {description}
            </div>
            {ref && (
              <div style={{display: 'flex', fontSize: 28, color: COLOR.muted}}>
                @{ref}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

async function renderPng(props: CardProps, font: Buffer): Promise<ArrayBuffer> {
  const image = new ImageResponse(<Card {...props} />, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [{name: 'Galmuri11', data: font, weight: 400, style: 'normal'}],
    emoji: 'twemoji',
  })
  // ImageResponse renders while it streams; reading it here lets a rendering
  // error reach the caller's fallback instead of sending a broken image
  return image.arrayBuffer()
}

function fallback(request: Request): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL('/thumbnail.png', request.url).href,
      'Cache-Control': FALLBACK_CACHE_CONTROL,
    },
  })
}

export async function GET(request: Request): Promise<Response> {
  try {
    const params = new URL(request.url).searchParams
    const ref = params.get('ref') ?? ''
    // A path inside the repository; '..' could step out of it in the raw URL
    const imagePath = params.get('image')?.split('/').includes('..')
      ? null
      : params.get('image')

    // Same rules as the page's URL, so nothing else reaches the GitHub URLs
    const repo = parseGithubUrl(
      `${params.get('owner') ?? ''}/${params.get('repo') ?? ''}${ref ? `/${ref}` : ''}`,
    )
    if (!repo || repo.ref !== ref) return fallback(request)
    const {owner, name} = repo
    const contentRef = ref || 'HEAD'

    const [description, media] = await Promise.all([
      fetchRepoDescription(owner, name),
      (imagePath
        ? loadImage(owner, name, contentRef, imagePath)
        : Promise.resolve(null)
      ).then(image => image ?? loadGrid(owner, name, contentRef)),
    ])

    const png = await renderPng(
      {
        owner,
        repo: name,
        ref,
        imagePath,
        description: description ?? getRouteDescription(repo),
        media: media ?? {kind: 'logo'},
      },
      await fontData,
    )

    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        // Without anything from GitHub (rate limit, missing repository), try
        // again soon instead of keeping the bare card for a day
        'Cache-Control':
          description || media ? CACHE_CONTROL : FALLBACK_CACHE_CONTROL,
      },
    })
  } catch (error) {
    console.error('og: falling back to the static thumbnail', error)
    return fallback(request)
  }
}
