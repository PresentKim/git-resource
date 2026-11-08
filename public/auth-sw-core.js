/* Core logic of the auth service worker. Plain ES2020, no modules. */
;(function (root) {
  var RAW_HOST = 'raw.githubusercontent.com'
  var PROXY_PREFIX = '/proxy/raw/'

  // Returns {repoKey, rest} for raw.githubusercontent.com URLs and same-origin
  // /proxy/raw/ URLs, or null for anything else.
  function parseRawTarget(url, origin) {
    var u
    try {
      u = new URL(url)
    } catch (e) {
      return null
    }
    var rest
    if (u.protocol === 'https:' && u.host === RAW_HOST) {
      rest = u.pathname.slice(1)
    } else if (u.origin === origin && u.pathname.indexOf(PROXY_PREFIX) === 0) {
      rest = u.pathname.slice(PROXY_PREFIX.length)
    } else {
      return null
    }
    var parts = rest.split('/')
    if (parts.length < 4 || parts.some(function (p) { return p === '' })) {
      return null
    }
    var owner
    var repo
    try {
      owner = decodeURIComponent(parts[0])
      repo = decodeURIComponent(parts[1])
    } catch (e) {
      return null
    }
    return {repoKey: (owner + '/' + repo).toLowerCase(), rest: rest}
  }

  function createRawHandler(deps) {
    var privateRepos = new Set()
    var generation = 0

    function authed(origin, target, token) {
      return deps.fetch(origin + '/proxy/raw-auth/' + target.rest, {
        headers: {Authorization: 'Bearer ' + token},
        cache: 'no-store',
        credentials: 'omit',
      })
    }

    async function handle(request, origin) {
      var target = parseRawTarget(request.url, origin)
      if (!target) return deps.fetch(request)
      var gen = generation
      var token = await deps.getToken()
      if (!token) return deps.fetch(request)

      if (privateRepos.has(target.repoKey)) {
        var direct = null
        try {
          direct = await authed(origin, target, token)
        } catch (e) {
          direct = null
        }
        if (direct && direct.ok) return direct
        if (gen === generation) privateRepos.delete(target.repoKey)
      }

      var first =
        new URL(request.url).host === RAW_HOST
          ? await deps.fetch(request.url, {mode: 'cors', credentials: 'omit'})
          : await deps.fetch(request)
      if (first.status !== 404) return first

      var retry
      try {
        retry = await authed(origin, target, token)
      } catch (e) {
        return first
      }
      if (!retry.ok) return first
      if (gen === generation) privateRepos.add(target.repoKey)
      return retry
    }

    handle.reset = function () {
      generation++
      privateRepos.clear()
    }
    return handle
  }

  root.AuthSwCore = {parseRawTarget: parseRawTarget, createRawHandler: createRawHandler}
})(self)
