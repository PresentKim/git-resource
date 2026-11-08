import assert from 'node:assert/strict'
import {test} from 'node:test'
import {
  decodeSession,
  encodeSession,
  parseCookies,
  safeReturnTo,
  serializeCookie,
  type StoredSession,
} from '../api/_lib/authCookies.ts'

const session: StoredSession = {
  at: 'ghu_1',
  atExp: 1000,
  rt: 'ghr_1',
  rtExp: null,
  login: 'kim',
  avatarUrl: 'https://a/x',
}

test('test_return_to_rejects_offsite', () => {
  for (const v of [
    '//evil.com',
    '/\\evil.com',
    'https://evil.com',
    '',
    null,
    'owner/repo',
  ]) {
    assert.equal(safeReturnTo(v), '/')
  }
})

test('test_decode_rejects_wrong_shape', () => {
  const v = Buffer.from('{"at":1}').toString('base64url')
  assert.equal(decodeSession(v), null)
})

test('test_cookie_values_url_safe', () => {
  assert.match(encodeSession(session), /^[A-Za-z0-9_-]+$/)
})

test('parseCookies', () => {
  assert.deepEqual(parseCookies('a=1; gr_session=xyz'), {
    a: '1',
    gr_session: 'xyz',
  })
  assert.deepEqual(parseCookies(null), {})
  assert.deepEqual(parseCookies('a=b=c'), {a: 'b=c'})
})

test('serializeCookie', () => {
  assert.equal(
    serializeCookie('gr_state', 'v', 600),
    'gr_state=v; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600',
  )
  assert.equal(
    serializeCookie('gr_session', '', 0),
    'gr_session=; Path=/api/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
  )
})

test('session round trip and garbage', () => {
  assert.deepEqual(decodeSession(encodeSession(session)), session)
  assert.equal(decodeSession('not-base64-json'), null)
  assert.equal(decodeSession(undefined), null)
})

test('safeReturnTo accepts local paths', () => {
  assert.equal(safeReturnTo('/owner/repo?filter=gui'), '/owner/repo?filter=gui')
  assert.equal(safeReturnTo('/'), '/')
  assert.equal(safeReturnTo('/a\nb'), '/')
  assert.equal(safeReturnTo('/a\u0000b'), '/')
  assert.equal(safeReturnTo('/a\u007fb'), '/')
})
