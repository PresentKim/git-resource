import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {NuqsAdapter} from 'nuqs/adapters/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'

import './index.css'
import App from './App.tsx'
import {useAuthStore} from '@/shared/auth/authStore'
import {setupAuthServiceWorker} from '@/shared/auth/authServiceWorker'
import {useSettingStore} from '@/shared/stores/settingStore'

/**
 * The workers already persist responses in IndexedDB and revalidate them
 * with ETags, so this client only needs to deduplicate and share results
 * in memory; no query persister is used.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <App />
        </NuqsAdapter>
      </QueryClientProvider>
    </StrictMode>,
  )
}

const STARTUP_TIMEOUT_MS = 3000

async function start() {
  let signedInHint = false
  try {
    signedInHint = localStorage.getItem('auth.signedIn') === '1'
  } catch {
    // storage unavailable
  }
  const mayHaveToken = signedInHint || !!useSettingStore.getState().githubToken

  const setup = useAuthStore
    .getState()
    .load()
    .then(() => setupAuthServiceWorker())
    .catch(() => undefined)

  if (mayHaveToken) {
    // Private images need the worker ready before the first requests
    await Promise.race([
      setup,
      new Promise(resolve => setTimeout(resolve, STARTUP_TIMEOUT_MS)),
    ])
  }
  render()
}

void start()
