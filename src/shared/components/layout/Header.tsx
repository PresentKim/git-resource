import {NavLink} from 'react-router-dom'

import {FloatingHeader} from '@/shared/components/FloatingHeader'
import {LogoIcon} from '@/shared/components/LogoIcon'
import {SettingButton} from '@/shared/components/layout/SettingButton'

import {useRepoStore} from '@/shared/stores/repoStore'

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
        <SettingButton />
      </div>
    </FloatingHeader>
  )
}
