import {getGithubToken, useAuthStore} from './authStore'
import {useSettingStore} from '@/shared/stores/settingStore'

const SW_URL = '/auth-sw.js'

let started = false
let lastToken: string | null = null

async function findRegistration() {
  const registrations = await navigator.serviceWorker.getRegistrations()
  return registrations.find(r =>
    [r.active, r.waiting, r.installing].some(w =>
      w?.scriptURL.endsWith(SW_URL),
    ),
  )
}

let queue: Promise<void> = Promise.resolve()

/** Serialized so register and unregister never interleave. */
function syncToken(): Promise<void> {
  queue = queue.then(doSyncToken, doSyncToken)
  return queue
}

async function doSyncToken() {
  if (!('serviceWorker' in navigator)) return
  const token = getGithubToken() || null
  lastToken = token

  try {
    if (!token) {
      const existing = await findRegistration()
      await existing?.unregister()
      return
    }

    await navigator.serviceWorker.register(SW_URL, {scope: '/'})
    const registration = await navigator.serviceWorker.ready
    // Gallery requests must go through the worker: wait until it controls us
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => {
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          {once: true},
        )
        if (navigator.serviceWorker.controller) resolve()
      })
    }
    // Only the latest token is worth sending
    if (lastToken !== token) return
    registration.active?.postMessage({type: 'auth-token', token})
  } catch {
    // dev servers and unsupported contexts: the app works without the worker
  }
}

/**
 * Registers the auth service worker only while a token exists, keeps it
 * informed of token changes, and answers its token requests.
 */
export async function setupAuthServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  if (!started) {
    started = true
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'auth-token-request') {
        event.ports[0]?.postMessage({token: getGithubToken() || null})
      }
    })
    const onChange = () => {
      if ((getGithubToken() || null) !== lastToken) void syncToken()
    }
    useAuthStore.subscribe(onChange)
    useSettingStore.subscribe(onChange)
  }

  await syncToken()
}
