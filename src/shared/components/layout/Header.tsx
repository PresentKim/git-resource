import {NavLink} from 'react-router-dom'

import {FloatingHeader} from '@/shared/components/FloatingHeader'
import {LogoIcon} from '@/shared/components/LogoIcon'
import {SettingButton} from '@/shared/components/layout/SettingButton'

import {useRepoStore} from '@/shared/stores/repoStore'

function HomeButton() {
  return (
    <NavLink to="/" aria-label="Home Button" className="select-none">
      <LogoIcon className="size-8" />
    </NavLink>
  )
}

function RepoInfo(props: React.ComponentProps<'div'>) {
  const repo = useRepoStore(state => state.repo)
  const error = useRepoStore(state => state.error)

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
