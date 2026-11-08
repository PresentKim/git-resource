import {NavLink} from 'react-router-dom'
import {Star} from 'lucide-react'

import {FloatingHeader} from '@/shared/components/FloatingHeader'
import {LogoIcon} from '@/shared/components/LogoIcon'
import {SettingButton} from '@/shared/components/layout/SettingButton'

import {useRepoStore} from '@/shared/stores/repoStore'
import {useFavoritesStore} from '@/shared/stores/favoritesStore'
import {buttonVariants} from '@/shared/components/ui/button'
import {cn} from '@/shared/utils'

function HomeButton() {
  return (
    // The padding enlarges the tap area and the negative margin keeps the
    // header's layout as it was
    <NavLink
      to="/"
      aria-label="Home"
      className="-m-1 rounded-md p-1 select-none">
      <LogoIcon className="size-8" />
    </NavLink>
  )
}

function RepoInfo(props: React.ComponentProps<'div'>) {
  const source = useRepoStore(state => state.source)
  const error = useRepoStore(state => state.error)

  if (source.kind === 'local') {
    return (
      <div {...props}>
        <span
          className="text-xs sm:text-sm text-muted-foreground"
          title="Opened from this device">
          {source.name}
          <span className="opacity-70"> · on this device</span>
        </span>
      </div>
    )
  }

  if (source.kind === 'favorites') {
    return (
      <div {...props}>
        <span className="text-xs sm:text-sm text-muted-foreground">
          Favorites
        </span>
      </div>
    )
  }

  const {repo} = source
  if (!repo.owner) return null

  // A repository that failed to load may not exist, so don't link to it
  if (error) {
    return (
      <div {...props}>
        <span className="text-xs sm:text-sm text-muted-foreground">
          {repo.displayName}
        </span>
      </div>
    )
  }

  return (
    <div {...props}>
      <a
        href={repo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs sm:text-sm hover:underline text-muted-foreground">
        {repo.displayName}
      </a>
    </div>
  )
}

/** Link to the favorites; shown once there are any */
function FavoritesLink() {
  const count = useFavoritesStore(state => state.favorites.length)
  if (!count) return null

  return (
    <NavLink
      to="/favorites"
      aria-label={`Favorites (${count.toLocaleString()})`}
      title="Favorites"
      className={({isActive}) =>
        cn(
          buttonVariants({variant: 'ghost'}),
          'max-sm:-my-1.5 max-sm:size-10',
          isActive && 'bg-muted',
        )
      }>
      <Star className="size-5" />
    </NavLink>
  )
}

/** Link to the source code; lucide-react has no brand icons, so the mark is inline */
function GithubLink() {
  return (
    <a
      href="https://github.com/PresentKim/git-resource"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Source code on GitHub"
      title="GitHub"
      className={cn(
        buttonVariants({variant: 'ghost'}),
        'max-sm:-my-1.5 max-sm:size-10',
      )}>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-5"
        aria-hidden="true">
        <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
      </svg>
    </a>
  )
}

export default function Header(props: React.ComponentProps<'header'>) {
  return (
    <FloatingHeader
      data-slot="header"
      className="w-full border-b border-border/40 bg-background"
      {...props}>
      <div className="flex flex-row justify-between items-center w-full max-w-7xl min-h-10 mx-auto py-2 px-4 sm:px-6">
        <div className="flex-1 flex flex-row flex-wrap justify-between items-center gap-2 mr-2">
          <HomeButton />
          <RepoInfo />
        </div>
        <div className="flex items-center gap-1">
          <FavoritesLink />
          <GithubLink />
          <SettingButton />
        </div>
      </div>
    </FloatingHeader>
  )
}
