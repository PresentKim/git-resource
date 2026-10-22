import {create} from 'zustand'
import {createGithubRepo} from '@/shared/utils/github'
import type {
  FavoriteLocation,
  FavoritesSource,
} from '@/shared/utils/imageSource'

/** A starred image on GitHub, as stored in this browser */
export interface Favorite {
  owner: string
  name: string
  ref: string
  path: string
  /** Has a .mcmeta animation next to it */
  animated: boolean
  addedAt: number
}

const STORAGE_KEY = 'favorites'

/** The favorite's path in the favorites gallery: "owner/repo@ref/path" */
export function getFavoriteKey({
  owner,
  name,
  ref,
  path,
}: Pick<Favorite, 'owner' | 'name' | 'ref' | 'path'>): string {
  return `${owner}/${name}@${ref}/${path}`
}

function readStored(): Favorite[] {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '[]',
    )
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry): entry is Favorite =>
            typeof entry?.owner === 'string' &&
            typeof entry?.name === 'string' &&
            typeof entry?.ref === 'string' &&
            typeof entry?.path === 'string',
        )
      : []
  } catch {
    return []
  }
}

interface FavoritesStore {
  /** The latest first */
  favorites: Favorite[]
  /** Keys of the favorites, to check an image quickly */
  keys: ReadonlySet<string>
  toggleFavorite: (location: FavoriteLocation, animated: boolean) => void
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => {
  const save = (favorites: Favorite[]) => {
    set({favorites, keys: new Set(favorites.map(getFavoriteKey))})
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
    } catch {
      // Storage full or blocked; the change still holds for this visit
    }
  }
  const initial = readStored()

  return {
    favorites: initial,
    keys: new Set(initial.map(getFavoriteKey)),
    toggleFavorite: ({repo, path}, animated) => {
      const entry = {owner: repo.owner, name: repo.name, ref: repo.ref, path}
      const key = getFavoriteKey(entry)
      const {favorites, keys} = get()
      save(
        keys.has(key)
          ? favorites.filter(favorite => getFavoriteKey(favorite) !== key)
          : [{...entry, animated, addedAt: Date.now()}, ...favorites],
      )
    },
  }
})

/** The favorites as an image source, with their gallery paths */
export function createFavoritesSource(favorites: readonly Favorite[]): {
  source: FavoritesSource
  /** Images and the .mcmeta files of animated ones */
  paths: string[]
} {
  const entries = new Map<string, FavoriteLocation>()
  const paths: string[] = []
  for (const favorite of favorites) {
    const key = getFavoriteKey(favorite)
    entries.set(key, {
      repo: createGithubRepo(favorite.owner, favorite.name, favorite.ref),
      path: favorite.path,
    })
    paths.push(key)
    if (favorite.animated) paths.push(`${key}.mcmeta`)
  }
  return {source: {kind: 'favorites', entries}, paths}
}
