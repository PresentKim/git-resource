import {NavLink} from 'react-router-dom'

import {Settings as SettingsIcon} from 'lucide-react'
import {FloatingHeader} from '@/components/FloatingHeader'
import {LogoIcon} from '@/components/LogoIcon'
import {useTargetRepository} from '@/hooks/useTargetRepository'
import {cn} from '@/utils'
import {Button} from '@/components/ui/button'

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

function RepoInfo() {
  const [repo] = useTargetRepository()

  return (
    repo.owner && (
      <div className="hidden md:block">
        <a
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm hover:underline text-muted-foreground">
          {repo.displayName}
        </a>
      </div>
    )
  )
}

function SettingButton() {
  return (
    <Button size="icon" variant="ghost" aria-label="Settings">
      <SettingsIcon className="size-6 min-w-6" />
      {/* TODO: Add settings modal */}
    </Button>
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
          'flex items-center justify-between',
          'w-full max-w-screen-xl group-[wide]:max-w-full  h-full min-h-10 mx-auto py-2 px-4 sm:px-6',
        )}>
        <div data-slot="header-title" className="flex-1 items-center">
          <HomeButton />
        </div>
        <div data-slot="header-side" className="flex items-center gap-4">
          <RepoInfo />
          <SettingButton />
        </div>
      </div>
    </FloatingHeader>
  )
}
