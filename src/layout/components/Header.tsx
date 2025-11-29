import {NavLink} from 'react-router-dom'

import {FloatingHeader} from '@/components/FloatingHeader'
import {LogoIcon} from '@/components/LogoIcon'
import {SettingButton} from '@/components/SettingButton'

import {useTargetRepository} from '@/hooks/useTargetRepository'
import {cn} from '@/utils'

function HomeButton() {
  return (
    <NavLink
      to="/"
      aria-label="Home"
      className="flex items-center gap-1 h-full w-fit text-2xl select-none">
      <LogoIcon strokeWidth={3} className="size-8 min-w-8" />
      <span className="font-bold">Github</span>
      <span className="text-card-foreground">resource</span>
    </NavLink>
  )
}

function RepoInfo({className}: {className?: string}) {
  const [repo] = useTargetRepository()

  if (!repo.owner) return null

  return (
    <div className={className}>
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

export default function Header(
  props: Omit<React.ComponentProps<'header'>, 'ref' | 'className'>,
) {
  return (
    <FloatingHeader
      data-slot="header"
      className="w-full border-b border-border/40 bg-background/80 backdrop-blur-lg"
      {...props}>
      <div
        data-slot="header"
        className={cn(
          'flex flex-col',
          'w-full max-w-screen-xl group-[wide]:max-w-full h-full mx-auto py-2 px-4 sm:px-6',
        )}>
        <div className="flex items-center justify-between min-h-10">
          <div data-slot="header-title" className="flex-1 items-center">
            <HomeButton />
          </div>
          <div data-slot="header-side" className="flex items-center gap-4">
            <RepoInfo className="hidden md:block" />
            <SettingButton />
          </div>
        </div>
        <RepoInfo className="md:hidden pb-1" />
      </div>
    </FloatingHeader>
  )
}
