import {test} from 'node:test';
import assert from 'node:assert/strict';

globalThis.self = globalThis;
await import('../public/auth-sw-core.js');
const {parseRawTarget, createRawHandler} = self.AuthSwCore;
const ORIGIN = 'https://gitresource.com';
const RAW = 'https://raw.githubusercontent.com/Foo/Bar/main/a%20b.png';

function setup(responses, token = 't') {
  const calls = [];
  const fetch = async (input, init) => {
    calls.push({input, init});
    const r = responses.shift();
    return new Response(null, {status: r});
  };
  const handler = createRawHandler({fetch, getToken: async () => token});
  return {calls, handler};
}

test('parseRawTarget raw, proxy, and others', () => {
  assert.deepEqual(parseRawTarget(RAW, ORIGIN), {
    repoKey: 'foo/bar',
    rest: 'Foo/Bar/main/a%20b.png',
  });
  assert.deepEqual(
    parseRawTarget(`${ORIGIN}/proxy/raw/o/r/v1/x.mcmeta`, ORIGIN),
    {repoKey: 'o/r', rest: 'o/r/v1/x.mcmeta'}
  );
  assert.equal(
    parseRawTarget('https://example.com/o/r/main/x.png', ORIGIN),
    null
  );
});

test('test_other_url_not_handled', () => {
  assert.equal(parseRawTarget(`${ORIGIN}/api/auth/session`, ORIGIN), null);
  assert.equal(
    parseRawTarget('https://raw.githubusercontent.com/o/r', ORIGIN),
    null
  );
  assert.equal(parseRawTarget(`${ORIGIN}/proxy/raw/o/r`, ORIGIN), null);
});

test('test_no_token_passthrough', async () => {
  const {calls, handler} = setup([404], null);
  const req = new Request(RAW);
  const res = await handler(req, ORIGIN);
  assert.equal(res.status, 404);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, req);
});

test('test_public_ok_single_fetch', async () => {
  const {calls, handler} = setup([200]);
  const res = await handler(new Request(RAW), ORIGIN);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].input, RAW);
  assert.equal(calls[0].init.mode, 'cors');
  assert.equal(calls[0].init.credentials, 'omit');
});

test('non-404 first response is returned as is', async () => {
  const {calls, handler} = setup([403]);
  const res = await handler(new Request(RAW), ORIGIN);
  assert.equal(res.status, 403);
  assert.equal(calls.length, 1);
});

test('same-origin proxy first attempt is the request', async () => {
  const {calls, handler} = setup([200]);
  const req = new Request(`${ORIGIN}/proxy/raw/o/r/v1/x.mcmeta`);
  await handler(req, ORIGIN);
  assert.equal(calls[0].input, req);
});

test('test_404_retries_with_bearer', async () => {
  const {calls, handler} = setup([404, 200]);
  const res = await handler(new Request(RAW), ORIGIN);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
  assert.equal(
    calls[1].input,
    `${ORIGIN}/proxy/raw-auth/Foo/Bar/main/a%20b.png`
  );
  assert.equal(calls[1].init.headers.Authorization, 'Bearer t');
  assert.equal(calls[1].init.cache, 'no-store');
});

test('test_known_private_skips_raw', async () => {
  const {calls, handler} = setup([404, 200, 200]);
  await handler(new Request(RAW), ORIGIN);
  calls.length = 0;
  const res = await handler(new Request(RAW), ORIGIN);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].input, /\/proxy\/raw-auth\//);
});

test('test_retry_failure_returns_original', async () => {
  const {calls, handler} = setup([404, 404, 404, 404]);
  const res = await handler(new Request(RAW), ORIGIN);
  assert.equal(res.status, 404);
  assert.equal(calls.length, 2);
  calls.length = 0;
  await handler(new Request(RAW), ORIGIN);
  assert.equal(calls[0].input, RAW);
});

test('test_token_change_clears_private', async () => {
  const {calls, handler} = setup([404, 200, 200]);
  await handler(new Request(RAW), ORIGIN);
  handler.reset();
  calls.length = 0;
  await handler(new Request(RAW), ORIGIN);
  assert.equal(calls[0].input, RAW);
});

test('known-private proxy throwing falls back to raw fetch', async () => {
  const calls = [];
  let n = 0;
  const handler = createRawHandler({
    fetch: async (input, init) => {
      calls.push(input);
      n++;
      if (n === 1) return new Response(null, {status: 404});
      if (n === 2) return new Response(null, {status: 200});
      if (n === 3) throw new TypeError('offline');
      return new Response(null, {status: 200});
    },
    getToken: async () => 't',
  });
  await handler(new Request(RAW), ORIGIN);
  const res = await handler(new Request(RAW), ORIGIN);
  assert.equal(res.status, 200);
  assert.equal(calls[3], RAW);
});
