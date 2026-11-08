import {create} from 'zustand'

import {useSettingStore} from '@/shared/stores/settingStore'

export const SIGNED_IN_HINT_KEY = 'auth.signedIn'

const REFRESH_MARGIN_MS = 120_000
const MIN_REFRESH_DELAY_MS = 30_000

type AuthUser = {login: string; avatarUrl: string}

type SessionInfo =
  | {enabled: false}
  | {
      enabled: true
      user: AuthUser | null
      accessToken: string | null
      expiresAt: number | null
      installUrl: string | null
    }

interface AuthState {
  status: 'loading' | 'disabled' | 'signedOut' | 'signedIn'
  user: AuthUser | null
  installUrl: string | null
  /** Kept in memory only; never persisted. */
  accessToken: string | null
  load: () => Promise<void>
  runLoad: () => Promise<void>
  signIn: () => void
  signOut: () => Promise<void>
}

let loadSeq = 0
let inflightLoad: Promise<void> | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null

function clearRefreshTimer() {
  if (refreshTimer !== null) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

function setSignedInHint(signedIn: boolean) {
  try {
    if (signedIn) localStorage.setItem(SIGNED_IN_HINT_KEY, '1')
    else localStorage.removeItem(SIGNED_IN_HINT_KEY)
  } catch {
    // storage unavailable; the hint only speeds up startup
  }
}

async function fetchSession(): Promise<SessionInfo | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'same-origin',
      headers: {Accept: 'application/json'},
    })
    if (!response.ok) return null
    if (!response.headers.get('content-type')?.includes('json')) return null
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) return null
    return (body as SessionInfo).enabled === true
      ? (body as SessionInfo)
      : {enabled: false}
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,
  installUrl: null,
  accessToken: null,

  load: () => {
    // Refresh tokens are single-use: share one in-flight load
    if (inflightLoad) return inflightLoad
    const run = get().runLoad
    inflightLoad = run().finally(() => {
      inflightLoad = null
    })
    return inflightLoad
  },

  runLoad: async () => {
    clearRefreshTimer()
    const seq = ++loadSeq
    const session = await fetchSession()
    // A newer load() started while waiting: drop this stale result
    if (seq !== loadSeq) return
    clearRefreshTimer()

    if (!session || !session.enabled) {
      setSignedInHint(false)
      set({status: 'disabled', user: null, installUrl: null, accessToken: null})
      return
    }

    if (!session.user || !session.accessToken) {
      setSignedInHint(false)
      set({
        status: 'signedOut',
        user: null,
        installUrl: session.installUrl ?? null,
        accessToken: null,
      })
      return
    }

    setSignedInHint(true)
    set({
      status: 'signedIn',
      user: session.user,
      installUrl: session.installUrl ?? null,
      accessToken: session.accessToken,
    })

    if (session.expiresAt !== null) {
      const delay = Math.max(
        session.expiresAt - Date.now() - REFRESH_MARGIN_MS,
        MIN_REFRESH_DELAY_MS,
      )
      refreshTimer = setTimeout(() => {
        void get().load()
      }, delay)
    }
  },

  signIn: () => {
    const returnTo = window.location.pathname + window.location.search
    window.location.assign(
      `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`,
    )
  },

  signOut: async () => {
    clearRefreshTimer()
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
    } catch {
      // the local state is cleared regardless
    }
    setSignedInHint(false)
    set({status: 'signedOut', user: null, accessToken: null})
  },
}))

/** Effective token: the OAuth access token, else the personal access token. */
export function getGithubToken(): string {
  return (
    useAuthStore.getState().accessToken ||
    useSettingStore.getState().githubToken
  )
}

export function useGithubToken(): string {
  const accessToken = useAuthStore(state => state.accessToken)
  const savedToken = useSettingStore(state => state.githubToken)
  return accessToken || savedToken
}
