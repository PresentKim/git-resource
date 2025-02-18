import {NavLink, Outlet} from 'react-router-dom'
import {FolderGit2Icon as GithubIcon, SettingsIcon} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {Button} from '@/components/ui/button'
import {BreadcrumbList} from '@/components/breadcrumb-list'
import {SearchDialog} from '@/components/search-dialog'
import {LogoIcon as HeaderIcon} from '@/components/logo'
import {useTargetRepository} from '@/hooks/useTargetRepository'
import {useGithubRateLimitStore} from '@/stores/githubApiStore'
import {useSearchDialogStore} from '@/stores/searchDialogStore'
import {cn} from '@/lib/utils'

const underlineHoverAnimation = cn(
  'relative',
  'after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-current after:transition-all hover:after:w-full',
)

function Header() {
  const [{owner, repo, ref}] = useTargetRepository()
  const openSearchDialog = useSearchDialogStore(state => state.open)

  return (
    <header
      data-slot="header"
      className={cn(
        'flex justify-between items-center align-middle',
        'w-full max-w-full min-h-8 px-4 py-2',
        'shadow-xs shadow-neutral-800',
      )}>
      <div
        data-slot="header-title"
        className="flex flex-1 items-center h-full min-w-0 gap-2">
        <NavLink to="/" aria-label="Home" className="font-bold select-none">
          <HeaderIcon strokeWidth={3} className="size-6 min-w-6 self-start" />
        </NavLink>
        {!owner || !repo ? (
          <NavLink to="/" aria-label="Home" className="font-bold select-none">
            repo-image-viewer
          </NavLink>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:cursor-pointer flex-1 w-full">
              <BreadcrumbList
                items={[owner, repo, ref]}
                separator={<span className="text-neutral-500">/</span>}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem asChild>
                <a
                  href={`https://github.com/${owner}/${repo}${ref ? `/tree/${ref}` : ''}`}
                  target="_blank"
                  rel="noreferrer">
                  View on GitHub
                </a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Button variant="ghost" onClick={openSearchDialog}>
                  Open New Repository
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div
        data-slot="header-side"
        className="flex items-center h-full ml-8 gap-2">
        <NavLink
          to="/settings"
          aria-label="Settings"
          className="self-start hover:rotate-90 [&.active]:rotate-90 transition-transform">
          <SettingsIcon className="size-6 min-w-6" />
        </NavLink>
      </div>
    </header>
  )
}

function Footer() {
  const {limit, remaining} = useGithubRateLimitStore()

  return (
    <footer className="my-4 flex w-full items-center justify-center gap-0.5 text-xs text-neutral-400">
      <GithubIcon className="size-4" />
      <a
        href="https://github.com/PresentKim"
        target="_blank"
        rel="noopener noreferrer"
        className={underlineHoverAnimation}>
        PresentKim
      </a>
      <p>/</p>
      <a
        href="https://github.com/PresentKim/repo-image-viewer"
        target="_blank"
        rel="noopener noreferrer"
        className={underlineHoverAnimation}>
        repo-image-viewer
      </a>
      <div
        aria-label="Github API rate limit"
        className="fixed text-xs right-2 bottom-2 select-none">
        {remaining || '-'}/{limit || '-'}
      </div>
    </footer>
  )
}

export default function BaseLayout() {
  return (
    <>
      <div className="flex flex-col items-center justify-center h-full w-full max-w-full">
        <Header />
        <main className="flex flex-col flex-1 justify-start items-center w-full px-4 py-8 space-y-6">
          <Outlet />
        </main>
        <Footer />
      </div>
      <SearchDialog />
    </>
  )
}
