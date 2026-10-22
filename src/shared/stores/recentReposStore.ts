import {create} from 'zustand'
import type {GithubRepo} from '@/shared/utils/github'

export interface RecentRepo {
  owner: string
  name: string
  ref: string
  openedAt: number
}

const STORAGE_KEY = 'recentRepositories'
const MAX_RECENT = 8

function readStored(): RecentRepo[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    )
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is RecentRepo =>
            typeof entry?.owner === 'string' &&
            typeof entry?.name === 'string' &&
            typeof entry?.ref === 'string',
        )
      : []
  } catch {
    return []
  }
}

function isSameRepo(a: {owner: string; name: string}, b: RecentRepo) {
  return (
    a.owner.toLowerCase() === b.owner.toLowerCase() &&
    a.name.toLowerCase() === b.name.toLowerCase()
  )
}

interface RecentReposStore {
  /** Repositories opened in this browser, the latest first */
  recent: RecentRepo[]
  /** Remember a repository that loaded; one entry per repository */
  addRecent: (repo: GithubRepo) => void
  removeRecent: (repo: RecentRepo) => void
}

export const useRecentReposStore = create<RecentReposStore>((set, get) => {
  const save = (recent: RecentRepo[]) => {
    set({recent})
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recent))
    } catch {
      // Storage full or blocked; the list still works for this visit
    }
  }

  return {
    recent: readStored(),
    addRecent: ({owner, name, ref}) => {
      if (!owner || !name) return
      save(
        [
          {owner, name, ref, openedAt: Date.now()},
          ...get().recent.filter(entry => !isSameRepo({owner, name}, entry)),
        ].slice(0, MAX_RECENT),
      )
    },
    removeRecent: repo => {
      save(get().recent.filter(entry => entry !== repo))
    },
  }
})
