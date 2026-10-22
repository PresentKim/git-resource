import {Star} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {getFavoriteKey, useFavoritesStore} from '@/shared/stores/favoritesStore'
import {useRepoStore} from '@/shared/stores/repoStore'
import {cn, getMcmetaPath} from '@/shared/utils'
import {locateOnGithub} from '@/shared/utils/imageSource'

interface FavoriteButtonProps {
  path: string
  /** The bigger, icon-only button of the phone toolbar */
  large?: boolean
}

/**
 * Stars the open image, or takes the star away. Only images on GitHub can be
 * favorites: local files are gone after a reload.
 */
export function FavoriteButton({path, large = false}: FavoriteButtonProps) {
  const source = useRepoStore(state => state.source)
  const mcmetaPaths = useRepoStore(state => state.mcmetaPaths)
  const toggleFavorite = useFavoritesStore(state => state.toggleFavorite)
  const location = locateOnGithub(source, path)
  const key =
    location && location.repo.owner
      ? getFavoriteKey({...location.repo, path: location.path})
      : null
  const starred = useFavoritesStore(state =>
    key ? state.keys.has(key) : false,
  )

  if (!location || !key) return null

  const label = starred ? 'Remove from favorites' : 'Add to favorites'

  return (
    <Button
      type="button"
      size={large ? 'icon' : 'sm'}
      variant="outline"
      className={large ? 'size-11' : 'px-2 py-1'}
      onClick={() =>
        toggleFavorite(location, mcmetaPaths.has(getMcmetaPath(path)))
      }
      aria-label={label}
      aria-pressed={starred}
      title={label}>
      <Star
        className={cn(
          large ? 'size-5' : 'h-3.5 w-3.5',
          starred && 'fill-amber-400 text-amber-400',
        )}
      />
    </Button>
  )
}
