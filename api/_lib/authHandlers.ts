import {randomBytes, timingSafeEqual} from 'node:crypto'

import {
  decodeSession,
  encodeSession,
  parseCookies,
  safeReturnTo,
  serializeCookie,
  type StoredSession,
} from './authCookies.js'

export type AuthEnv = {
  GITHUB_APP_CLIENT_ID?: string
  GITHUB_APP_CLIENT_SECRET?: string
  GITHUB_APP_SLUG?: string
}

const SESSION_COOKIE = 'gr_session'
const STATE_COOKIE = 'gr_state'
const STATE_MAX_AGE = 600
const DEFAULT_MAX_AGE = 180 * 24 * 60 * 60
const REFRESH_MARGIN_MS = 60_000
const TOKEN_URL = 'https://github.com/login/oauth/access_token'

type Credentials = {clientId: string; clientSecret: string}

function credentials(env: AuthEnv): Credentials | null {
  const clientId = env.GITHUB_APP_CLIENT_ID
  const clientSecret = env.GITHUB_APP_CLIENT_SECRET
  return clientId && clientSecret ? {clientId, clientSecret} : null
}

function redirect(location: string, cookies: string[]): Response {
  const headers = new Headers({Location: location, 'Cache-Control': 'no-store'})
  for (const cookie of cookies) headers.append('Set-Cookie', cookie)
  return new Response(null, {status: 302, headers})
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function handleLogin(request: Request, env: AuthEnv): Response {
  const creds = credentials(env)
  if (!creds) return new Response('Sign-in is not configured', {status: 404})
  const url = new URL(request.url)
  const returnTo = safeReturnTo(url.searchParams.get('returnTo'))
  const state = randomBytes(16).toString('base64url')
  const authorize = new URL('https://github.com/login/oauth/authorize')
  authorize.searchParams.set('client_id', creds.clientId)
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback`)
  authorize.searchParams.set('state', state)
  const value = `${state}.${Buffer.from(returnTo).toString('base64url')}`
  return redirect(authorize.toString(), [
    serializeCookie(STATE_COOKIE, value, STATE_MAX_AGE),
  ])
}

type TokenResponse = {
  access_token?: unknown
  expires_in?: unknown
  refresh_token?: unknown
  refresh_token_expires_in?: unknown
}

type Tokens = Pick<StoredSession, 'at' | 'atExp' | 'rt' | 'rtExp'>

async function requestTokens(
  fetchImpl: typeof fetch,
  body: Record<string, string>,
  now: number,
  previousRt: string | null,
): Promise<Tokens | null> {
  try {
    const response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const data = (await response.json()) as TokenResponse
    if (typeof data.access_token !== 'string' || !data.access_token) return null
    const expiresIn =
      typeof data.expires_in === 'number' ? data.expires_in : null
    const rt =
      typeof data.refresh_token === 'string' ? data.refresh_token : previousRt
    const rtIn =
      typeof data.refresh_token_expires_in === 'number'
        ? data.refresh_token_expires_in
        : null
    return {
      at: data.access_token,
      atExp: expiresIn === null ? null : now + expiresIn * 1000,
      rt,
      rtExp: rt && rtIn !== null ? now + rtIn * 1000 : null,
    }
  } catch {
    return null
  }
}

function sessionMaxAge(session: StoredSession, now: number): number {
  if (session.rt && session.rtExp !== null) {
    return Math.max(1, Math.ceil((session.rtExp - now) / 1000))
  }
  return DEFAULT_MAX_AGE
}

export async function handleCallback(
  request: Request,
  env: AuthEnv,
  fetchImpl: typeof fetch,
): Promise<Response> {
  const creds = credentials(env)
  if (!creds) return new Response('Sign-in is not configured', {status: 404})
  const url = new URL(request.url)
  const stored = parseCookies(request.headers.get('cookie'))[STATE_COOKIE]
  const clearState = serializeCookie(STATE_COOKIE, '', 0)
  const bad = () =>
    new Response('Invalid sign-in state', {
      status: 400,
      headers: {'Set-Cookie': clearState, 'Cache-Control': 'no-store'},
    })
  const dot = stored ? stored.indexOf('.') : -1
  const queryState = url.searchParams.get('state')
  if (!stored || dot < 0 || !queryState) return bad()
  if (!safeEqual(stored.slice(0, dot), queryState)) return bad()
  const returnTo = safeReturnTo(
    Buffer.from(stored.slice(dot + 1), 'base64url').toString('utf8'),
  )

  const code = url.searchParams.get('code')
  if (url.searchParams.has('error') || !code) {
    return redirect(returnTo, [clearState])
  }

  const now = Date.now()
  const tokens = await requestTokens(
    fetchImpl,
    {
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      redirect_uri: `${url.origin}/api/auth/callback`,
    },
    now,
    null,
  )
  if (!tokens) return redirect(returnTo, [clearState])

  try {
    const response = await fetchImpl('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.at}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'git-resource',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return redirect(returnTo, [clearState])
    const user = (await response.json()) as {
      login?: unknown
      avatar_url?: unknown
    }
    if (typeof user.login !== 'string') return redirect(returnTo, [clearState])
    const session: StoredSession = {
      ...tokens,
      login: user.login,
      avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : '',
    }
    return redirect(returnTo, [
      serializeCookie(
        SESSION_COOKIE,
        encodeSession(session),
        sessionMaxAge(session, now),
      ),
      clearState,
    ])
  } catch {
    return redirect(returnTo, [clearState])
  }
}

type SessionInfo =
  | {enabled: false}
  | {
      enabled: true
      user: {login: string; avatarUrl: string} | null
      accessToken: string | null
      expiresAt: number | null
      installUrl: string | null
    }

function json(body: SessionInfo, cookie?: string): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  })
  if (cookie) headers.append('Set-Cookie', cookie)
  return new Response(JSON.stringify(body), {status: 200, headers})
}

export async function handleSession(
  request: Request,
  env: AuthEnv,
  fetchImpl: typeof fetch,
  now: number,
): Promise<Response> {
  const creds = credentials(env)
  if (!creds) return json({enabled: false})
  const installUrl = env.GITHUB_APP_SLUG
    ? `https://github.com/apps/${encodeURIComponent(env.GITHUB_APP_SLUG)}/installations/new`
    : null
  const signedOut = (cookie?: string) =>
    json(
      {
        enabled: true,
        user: null,
        accessToken: null,
        expiresAt: null,
        installUrl,
      },
      cookie,
    )

  const raw = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE]
  if (!raw) return signedOut()
  let session = decodeSession(raw)
  const clear = serializeCookie(SESSION_COOKIE, '', 0)
  if (!session) return signedOut(clear)

  let cookie: string | undefined
  if (session.atExp !== null && session.atExp - now < REFRESH_MARGIN_MS) {
    const usable =
      session.rt !== null && (session.rtExp === null || session.rtExp > now)
    const tokens = usable
      ? await requestTokens(
          fetchImpl,
          {
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: session.rt as string,
          },
          now,
          session.rt,
        )
      : null
    if (!tokens) return signedOut(clear)
    session = {...session, ...tokens}
    cookie = serializeCookie(
      SESSION_COOKIE,
      encodeSession(session),
      sessionMaxAge(session, now),
    )
  }

  return json(
    {
      enabled: true,
      user: {login: session.login, avatarUrl: session.avatarUrl},
      accessToken: session.at,
      expiresAt: session.atExp,
      installUrl: null,
    },
    cookie,
  )
}

export function handleLogout(request: Request): Response {
  if (request.method !== 'POST') {
    return new Response(null, {status: 405, headers: {Allow: 'POST'}})
  }
  return new Response(null, {
    status: 204,
    headers: {
      'Set-Cookie': serializeCookie(SESSION_COOKIE, '', 0),
      'Cache-Control': 'no-store',
    },
  })
}
