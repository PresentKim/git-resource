/* Auth service worker: retries 404 raw-file requests through the
   authenticated proxy. Plain ES2020, classic script. */
importScripts('/auth-sw-core.js')

var memoryToken = null

function askPage(clientId) {
  var lookup = clientId
    ? self.clients.get(clientId)
    : Promise.resolve(undefined)
  return lookup.then(function (client) {
    if (client && client.type === 'window') return client
    return self.clients
      .matchAll({type: 'window', includeUncontrolled: false})
      .then(function (list) {
        return list[0] || null
      })
  }).then(function (client) {
    if (!client) return null
    return new Promise(function (resolve) {
      var timer = setTimeout(function () {
        resolve(null)
      }, 1000)
      var channel = new MessageChannel()
      channel.port1.onmessage = function (e) {
        clearTimeout(timer)
        var t = e.data && e.data.token
        resolve(typeof t === 'string' && t ? t : null)
      }
      client.postMessage({type: 'auth-token-request'}, [channel.port2])
    })
  })
}

var currentClientId = null
var handler = self.AuthSwCore.createRawHandler({
  fetch: function (input, init) {
    return self.fetch(input, init)
  },
  getToken: function () {
    if (memoryToken) return Promise.resolve(memoryToken)
    return askPage(currentClientId).then(function (t) {
      if (t) memoryToken = t
      return t
    })
  },
})

self.addEventListener('install', function () {
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('message', function (event) {
  var data = event.data
  if (!data || data.type !== 'auth-token') return
  memoryToken = typeof data.token === 'string' && data.token ? data.token : null
  handler.reset()
})

self.addEventListener('fetch', function (event) {
  var request = event.request
  if (request.method !== 'GET') return
  if (!self.AuthSwCore.parseRawTarget(request.url, self.location.origin)) return
  currentClientId = event.clientId || event.resultingClientId || null
  event.respondWith(handler(request, self.location.origin))
})
