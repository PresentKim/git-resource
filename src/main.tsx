import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {NuqsAdapter} from 'nuqs/adapters/react'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'

import './index.css'
import App from './App.tsx'

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    </QueryClientProvider>
  </StrictMode>,
)
