import {useLayoutEffect, useState} from 'react'
import {NavLink} from 'react-router-dom'
import {Star} from 'lucide-react'

import {buttonVariants} from '@/shared/components/ui/button'
import {Gallery} from '@/features/repo/Gallery'
import {
  createFavoritesSource,
  useFavoritesStore,
} from '@/shared/stores/favoritesStore'
import {useRepoStore} from '@/shared/stores/repoStore'
import {cn} from '@/shared/utils'
import {getPageTitle} from '@/shared/utils/routeMeta'

const PAGE_LABEL = 'Favorites'

/** The images starred in this browser, from any repository (/favorites) */
export default function FavoritesPage() {
  // Taken once: an image unstarred here stays until the page is left, so
  // the list does not jump and the star can be put back
  const [favorites] = useState(() => useFavoritesStore.getState().favorites)
  const [{source, paths}] = useState(() => createFavoritesSource(favorites))
  const storeSource = useRepoStore(state => state.source)
  const setSource = useRepoStore(state => state.setSource)
  const setImageFiles = useRepoStore(state => state.setImageFiles)

  useLayoutEffect(() => {
    setSource(source)
    setImageFiles(paths)
  }, [source, paths, setSource, setImageFiles])

  if (!favorites.length) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-3 pt-24 text-center">
        <title>{getPageTitle(PAGE_LABEL)}</title>
        <Star className="size-10 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">No favorites yet</h1>
          <p className="text-sm text-muted-foreground">
            Open an image of a repository and press the star in the viewer.
            Favorites from every repository are kept here, in this browser.
          </p>
        </div>
        <NavLink to="/" className={cn(buttonVariants({variant: 'outline'}))}>
          Find images
        </NavLink>
      </section>
    )
  }

  return (
    <Gallery
      titleLabel={PAGE_LABEL}
      loading={
        storeSource === source
          ? null
          : {title: 'Loading favorites', description: 'Just a moment...'}
      }
    />
  )
}
