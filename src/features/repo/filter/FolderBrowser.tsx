import {memo, useMemo, useState} from 'react'
import {ChevronRight, Folder, FolderTree} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover'
import {useFilterQuery} from '@/features/repo/filter/useFilterQuery'
import {useRepoStore} from '@/shared/stores/repoStore'
import {isMcmetaFile} from '@/shared/utils'
import {
  buildDirectoryTree,
  findDirectory,
  type DirectoryNode,
} from '@/shared/utils/directoryTree'

const folderCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

interface FolderListProps {
  tree: DirectoryNode
}

/**
 * Drill-down folder list. Choosing a folder filters the gallery to it by
 * setting the filter to its path, using the filter syntax that already
 * exists, so it can be refined with keywords afterwards.
 */
function FolderList({tree}: FolderListProps) {
  const {filter, setFilter} = useFilterQuery()

  // Start where the current filter already points, if it is a folder path
  const [currentPath, setCurrentPath] = useState(() =>
    filter.endsWith('/') && findDirectory(tree, filter) ? filter : '',
  )

  const current = findDirectory(tree, currentPath) ?? tree
  const children = useMemo(
    () =>
      [...current.children.values()].sort((a, b) =>
        folderCollator.compare(a.name, b.name),
      ),
    [current],
  )
  const crumbs = currentPath.split('/').filter(Boolean)

  const goTo = (path: string) => {
    setCurrentPath(path)
    setFilter(path)
  }

  return (
    <div className="space-y-2">
      <nav
        aria-label="Folder path"
        className="flex flex-wrap items-center gap-0.5 text-xs">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-1.5 text-xs"
          aria-current={currentPath === '' ? 'location' : undefined}
          onClick={() => goTo('')}>
          All
        </Button>
        {crumbs.map((segment, index) => {
          const path = crumbs.slice(0, index + 1).join('/') + '/'
          return (
            <span key={path} className="flex items-center gap-0.5">
              <ChevronRight className="size-3 text-muted-foreground" />
              <Button
                size="sm"
                variant="ghost"
                className="h-6 max-w-32 truncate px-1.5 text-xs"
                aria-current={path === currentPath ? 'location' : undefined}
                title={path}
                onClick={() => goTo(path)}>
                {segment}
              </Button>
            </span>
          )
        })}
      </nav>

      <p className="px-1.5 text-xs text-muted-foreground">
        {current.count.toLocaleString()} images here
      </p>

      <ul className="max-h-[50vh] space-y-0.5 overflow-y-auto">
        {children.length === 0 && (
          <li className="px-1.5 py-2 text-xs text-muted-foreground">
            No subfolders
          </li>
        )}
        {children.map(child => (
          <li key={child.path}>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-1.5 py-1.5 text-left text-xs hover:bg-muted"
              onClick={() => goTo(child.path)}>
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate" title={child.path}>
                {child.name}
              </span>
              <span className="shrink-0 text-muted-foreground">
                {child.count.toLocaleString()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Toolbar button that opens the folder browser */
export const FolderBrowser = memo(function FolderBrowser() {
  const imageFiles = useRepoStore(state => state.imageFiles)

  // Computed once per file list, not per render or per open
  const tree = useMemo(
    () =>
      buildDirectoryTree(
        (imageFiles ?? []).filter(path => !isMcmetaFile(path)),
      ),
    [imageFiles],
  )
  const hasFolders = tree.children.size > 0

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="Browse folders"
            title="Browse folders"
            size="sm"
            variant="outline"
            disabled={!hasFolders}
            className="text-xs font-semibold">
            <FolderTree className="size-4" />
            <span className="hidden sm:inline">FOLDERS</span>
          </Button>
        }
      />
      <PopoverContent side="bottom" align="start" className="w-72">
        <FolderList tree={tree} />
      </PopoverContent>
    </Popover>
  )
})
