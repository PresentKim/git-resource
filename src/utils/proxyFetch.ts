const PROXY_URL = 'https://corsproxy.io/?url='

export function proxyFetch(url: string, options?: RequestInit) {
  return fetch(PROXY_URL + encodeURIComponent(url), {
    cache: 'no-store',
    ...options,
  })
}
