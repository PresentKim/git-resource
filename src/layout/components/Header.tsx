import {useCallback} from 'react'
import {NavLink} from 'react-router-dom'
import {SettingsIcon} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {BreadcrumbList} from '@/components/BreadcrumbList'
import {LogoIcon as HeaderIcon} from '@/components/LogoIcon'
import {FloatingHeader} from '@/components/FloatingHeader'
import {useTargetRepository} from '@/hooks/useTargetRepository'
import {useFilterQuery} from '@/hooks/useFilterQuery'
import {useSearchDialogStore} from '@/stores/searchDialogStore'
import {cn, debounce} from '@/utils'

export default function Header({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [{owner, repo, ref}] = useTargetRepository()
  const openSearchDialog = useSearchDialogStore(state => state.open)

  const [filter, setFilterQuery] = useFilterQuery()
  const setFilter = debounce(setFilterQuery, 300)

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value),
    [setFilter],
  )

  return (
    <FloatingHeader
      data-slot="header"
      className={cn(
        'flex justify-between items-center align-middle duration-700',
        'w-full max-w-full px-4 py-2',
        'shadow-xs shadow-primary-foreground bg-background',
        className,
      )}
      {...props}>
      <div
        data-slot="header-title"
        className="flex flex-1 items-center h-full min-h-10 min-w-0 gap-2">
        <NavLink
          to="/"
          aria-label="Home"
          className="font-bold select-none self-start mt-2">
          <HeaderIcon strokeWidth={3} className="size-6 min-w-6 self-start" />
        </NavLink>
        {!owner || !repo ? (
          <NavLink to="/" aria-label="Home" className="font-bold select-none">
            git-resource
          </NavLink>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="hover:cursor-pointer flex-1 w-full">
              <BreadcrumbList items={[owner, repo, ref]} />
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
        <Input
          defaultValue={filter}
          onChange={handleInputChange}
          placeholder="includes -excludes"
          className="w-40"></Input>
        <NavLink
          to="/settings"
          aria-label="Settings"
          className="self-start hover:rotate-90 [&.active]:rotate-90 transition-transform">
          <SettingsIcon className="size-6 min-w-6" />
        </NavLink>
      </div>
    </FloatingHeader>
  )
}
