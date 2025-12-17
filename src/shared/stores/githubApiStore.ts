import {create} from 'zustand'

interface GithubRateLimitState {
  limit: number
  remaining: number
  setRateLimit(limit: number, remaining: number): void
}
export const useGithubRateLimitStore = create<GithubRateLimitState>(set => ({
  limit: 0,
  remaining: 0,
  setRateLimit: (newLimit: number, newRemaining: number) =>
    set({limit: newLimit, remaining: newRemaining}),
}))
