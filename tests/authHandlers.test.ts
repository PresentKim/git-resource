import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
  handleCallback,
  handleLogin,
  handleLogout,
  handleSession,
} from '../api/_lib/authHandlers.ts'
import {
  decodeSession,
  encodeSession,
  type StoredSession,
} from '../api/_lib/authCookies.ts'

const env = {
  GITHUB_APP_CLIENT_ID: 'cid',
  GITHUB_APP_CLIENT_SECRET: 'sec',
  GITHUB_APP_SLUG: 'git-resource',
}
const ORIGIN = 'https://app.test'
const NOW = 1_700_000_000_000

type Call = {url: string; init?: RequestInit}
function fakeFetch(responses: unknown[]) {
  const calls: Call[] = []
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({url: String(url), init})
    const body = responses.shift()
    return new Response(JSON.stringify(body), {status: 200})
  }) as typeof fetch
  return {impl, calls}
}

const stateCookie = (state: string, returnTo = '/a/b') =>
  `gr_state=${state}.${Buffer.from(returnTo).toString('base64url')}`
const req = (path: string, cookie?: string, method = 'GET') =>
  new Request(ORIGIN + path, {
    method,
    headers: cookie ? {cookie} : {},
  })
const cookiesOf = (res: Response) => res.headers.getSetCookie()
const sessionFrom = (res: Response) => {
  const c = cookiesOf(res).find(x => x.startsWith('gr_session='))
  return c ? c.split(';')[0].slice('gr_session='.length) : undefined
}
const stored: StoredSession = {
  at: 'ghu_1',
  atExp: NOW + 3_600_000,
  rt: 'ghr_1',
  rtExp: NOW + 10_000_000,
  login: 'kim',
  avatarUrl: 'https://a/x',
}

test('test_login_redirect', () => {
  const res = handleLogin(req('/api/auth/login?returnTo=/a/b'), env)
  assert.equal(res.status, 302)
  const loc = new URL(res.headers.get('location')!)
  assert.equal(loc.host, 'github.com')
  assert.equal(loc.pathname, '/login/oauth/authorize')
  assert.equal(loc.searchParams.get('client_id'), 'cid')
  assert.equal(
    loc.searchParams.get('redirect_uri'),
    `${ORIGIN}/api/auth/callback`,
  )
  const cookie = cookiesOf(res)[0]
  assert.match(cookie, /Max-Age=600/)
  const value = cookie.split(';')[0].slice('gr_state='.length)
  assert.equal(value.split('.')[0], loc.searchParams.get('state'))
  assert.equal(Buffer.from(value.split('.')[1], 'base64url').toString(), '/a/b')
})

test('login sanitizes offsite returnTo', () => {
  const res = handleLogin(req('/api/auth/login?returnTo=//evil.com'), env)
  const value = cookiesOf(res)[0].split(';')[0].slice('gr_state='.length)
  assert.equal(Buffer.from(value.split('.')[1], 'base64url').toString(), '/')
})

test('test_login_disabled_404', () => {
  assert.equal(handleLogin(req('/api/auth/login'), {}).status, 404)
})

test('test_callback_state_mismatch_400', async () => {
  const f = fakeFetch([])
  const res = await handleCallback(
    req('/api/auth/callback?code=c&state=a', stateCookie('b')),
    env,
    f.impl,
  )
  assert.equal(res.status, 400)
  assert.equal(sessionFrom(res), undefined)
  assert.equal(f.calls.length, 0)
})

test('test_callback_missing_state_cookie_400', async () => {
  const res = await handleCallback(
    req('/api/auth/callback?code=c&state=a'),
    env,
    fakeFetch([]).impl,
  )
  assert.equal(res.status, 400)
})

test('test_callback_denied_redirects', async () => {
  const res = await handleCallback(
    req('/api/auth/callback?error=access_denied&state=s', stateCookie('s')),
    env,
    fakeFetch([]).impl,
  )
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('location'), '/a/b')
  assert.equal(sessionFrom(res), undefined)
})

test('test_callback_sets_session', async () => {
  const f = fakeFetch([
    {
      access_token: 'ghu_1',
      expires_in: 28800,
      refresh_token: 'ghr_1',
      refresh_token_expires_in: 15897600,
    },
    {login: 'kim', avatar_url: 'https://a/x'},
  ])
  const before = Date.now()
  const res = await handleCallback(
    req('/api/auth/callback?code=c&state=s', stateCookie('s')),
    env,
    f.impl,
  )
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('location'), '/a/b')
  const s = decodeSession(sessionFrom(res))!
  assert.equal(s.at, 'ghu_1')
  assert.equal(s.rt, 'ghr_1')
  assert.equal(s.login, 'kim')
  assert.equal(s.avatarUrl, 'https://a/x')
  assert.ok(s.atExp! >= before + 28800 * 1000)
  assert.ok(s.rtExp! >= before + 15897600 * 1000)
  assert.ok(cookiesOf(res).some(c => /^gr_state=;.*Max-Age=0/.test(c)))
  const body = JSON.parse(String(f.calls[0].init?.body))
  assert.equal(body.code, 'c')
  assert.equal(body.redirect_uri, `${ORIGIN}/api/auth/callback`)
  assert.equal(
    (f.calls[1].init?.headers as Record<string, string>).Authorization,
    'Bearer ghu_1',
  )
})

test('callback exchange failure redirects without session', async () => {
  const res = await handleCallback(
    req('/api/auth/callback?code=c&state=s', stateCookie('s')),
    env,
    fakeFetch([{error: 'bad_verification_code'}]).impl,
  )
  assert.equal(res.status, 302)
  assert.equal(res.headers.get('location'), '/a/b')
  assert.equal(sessionFrom(res), undefined)
})

test('session disabled / signed out', async () => {
  const off = await handleSession(
    req('/api/auth/session'),
    {},
    fakeFetch([]).impl,
    NOW,
  )
  assert.deepEqual(await off.json(), {enabled: false})
  const res = await handleSession(
    req('/api/auth/session'),
    env,
    fakeFetch([]).impl,
    NOW,
  )
  assert.deepEqual(await res.json(), {
    enabled: true,
    user: null,
    accessToken: null,
    expiresAt: null,
    installUrl: 'https://github.com/apps/git-resource/installations/new',
  })
})

test('session valid cookie', async () => {
  const res = await handleSession(
    req('/api/auth/session', `gr_session=${encodeSession(stored)}`),
    env,
    fakeFetch([]).impl,
    NOW,
  )
  assert.deepEqual(await res.json(), {
    enabled: true,
    user: {login: 'kim', avatarUrl: 'https://a/x'},
    accessToken: 'ghu_1',
    expiresAt: NOW + 3_600_000,
    installUrl: null,
  })
  assert.equal(cookiesOf(res).length, 0)
})

test('test_session_no_store', async () => {
  const res = await handleSession(
    req('/api/auth/session'),
    env,
    fakeFetch([]).impl,
    NOW,
  )
  assert.equal(res.headers.get('cache-control'), 'no-store')
})

test('test_session_refreshes_near_expiry', async () => {
  const f = fakeFetch([
    {
      access_token: 'ghu_2',
      expires_in: 28800,
      refresh_token: 'ghr_2',
      refresh_token_expires_in: 1000,
    },
  ])
  const res = await handleSession(
    req(
      '/api/auth/session',
      `gr_session=${encodeSession({...stored, atExp: NOW + 30_000})}`,
    ),
    env,
    f.impl,
    NOW,
  )
  const body = JSON.parse(String(f.calls[0].init?.body))
  assert.equal(body.grant_type, 'refresh_token')
  assert.equal(body.refresh_token, 'ghr_1')
  const info = await res.json()
  assert.equal(info.accessToken, 'ghu_2')
  assert.equal(info.expiresAt, NOW + 28800 * 1000)
  const s = decodeSession(sessionFrom(res))!
  assert.equal(s.at, 'ghu_2')
  assert.equal(s.rt, 'ghr_2')
  assert.equal(s.login, 'kim')
})

test('test_session_refresh_failure_clears', async () => {
  const res = await handleSession(
    req(
      '/api/auth/session',
      `gr_session=${encodeSession({...stored, atExp: NOW + 30_000})}`,
    ),
    env,
    fakeFetch([{error: 'bad_refresh_token'}]).impl,
    NOW,
  )
  const info = await res.json()
  assert.equal(info.user, null)
  assert.equal(info.accessToken, null)
  assert.match(cookiesOf(res)[0], /^gr_session=;.*Max-Age=0/)
})

test('test_logout_requires_post', () => {
  assert.equal(handleLogout(req('/api/auth/logout')).status, 405)
  const res = handleLogout(req('/api/auth/logout', undefined, 'POST'))
  assert.equal(res.status, 204)
  assert.match(cookiesOf(res)[0], /^gr_session=;.*Max-Age=0/)
})

test('auth redirects and 400s are no-store', async () => {
  const login = handleLogin(req('/api/auth/login'), env)
  assert.equal(login.headers.get('cache-control'), 'no-store')
  const bad = await handleCallback(
    req('/api/auth/callback?state=x&code=c'),
    env,
    fakeFetch([]).impl,
  )
  assert.equal(bad.status, 400)
  assert.equal(bad.headers.get('cache-control'), 'no-store')
})

test('token requests carry an abort signal', async () => {
  const f = fakeFetch([{error: 'bad_verification_code'}])
  await handleCallback(
    req('/api/auth/callback?state=s&code=c', stateCookie('s')),
    env,
    f.impl,
  )
  assert.ok(f.calls[0].init?.signal)
})
