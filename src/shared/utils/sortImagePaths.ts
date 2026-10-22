import type {FileMeta} from './fileMeta'
import type {ImageSource} from './imageSource'

export const SORT_MODES = [
  'path',
  'path-desc',
  'name',
  'name-desc',
  'size-desc',
  'size',
  'modified-desc',
  'modified',
] as const
export type SortMode = (typeof SORT_MODES)[number]

export const DEFAULT_SORT_MODE: SortMode = 'path'

type ListOrderMode = 'path' | 'path-desc'

const sortModeLabels: Record<Exclude<SortMode, ListOrderMode>, string> = {
  name: 'File name A–Z',
  'name-desc': 'File name Z–A',
  'size-desc': 'Largest file first',
  size: 'Smallest file first',
  'modified-desc': 'Recently modified first',
  modified: 'Least recently modified first',
}

/** The order "path" stands for, which depends on where the list came from */
const LIST_ORDER_LABELS: Record<
  ImageSource['kind'],
  Record<ListOrderMode, string>
> = {
  github: {path: 'Repository order', 'path-desc': 'Repository order, reversed'},
  local: {path: 'Path order', 'path-desc': 'Path order, reversed'},
  favorites: {
    path: 'Recently starred first',
    'path-desc': 'Oldest starred first',
  },
}

/** The label of a mode for a list from this kind of source */
export function getSortModeLabel(
  mode: SortMode,
  sourceKind: ImageSource['kind'],
): string {
  return mode === 'path' || mode === 'path-desc'
    ? LIST_ORDER_LABELS[sourceKind][mode]
    : sortModeLabels[mode]
}

/** Modes that need a value the source may not provide */
const REQUIRED_META: Partial<Record<SortMode, keyof FileMeta>> = {
  'size-desc': 'size',
  size: 'size',
  'modified-desc': 'modified',
  modified: 'modified',
}

/** The modes that can be offered for metadata with these fields */
export function getAvailableSortModes(
  available: ReadonlySet<keyof FileMeta>,
): SortMode[] {
  return SORT_MODES.filter(mode => {
    const field = REQUIRED_META[mode]
    return !field || available.has(field)
  })
}

// Numeric-aware so that img_2 sorts before img_10
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

function comparePaths(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Return the paths in the requested order without modifying the input.
 * "path" is the order the repository listing came in and is returned as is.
 * Size and date modes put files without that value last, in path order.
 */
export function sortImagePaths(
  paths: readonly string[],
  mode: SortMode,
  getMeta?: (path: string) => FileMeta | undefined,
): string[] {
  if (mode === 'path') return paths as string[]
  if (mode === 'path-desc') return [...paths].reverse()

  const field = REQUIRED_META[mode]
  if (field) {
    const direction = mode.endsWith('-desc') ? -1 : 1
    const keyed = paths.map(path => ({
      path,
      value: getMeta?.(path)?.[field] as number | undefined,
    }))
    keyed.sort((a, b) => {
      if (a.value === undefined || b.value === undefined) {
        if (a.value !== b.value) return a.value === undefined ? 1 : -1
        return comparePaths(a.path, b.path)
      }
      return direction * (a.value - b.value) || comparePaths(a.path, b.path)
    })
    return keyed.map(item => item.path)
  }

  // Decorate with the file name once instead of slicing inside the comparator
  const keyed = paths.map(path => ({path, name: fileName(path)}))
  const direction = mode === 'name' ? 1 : -1
  keyed.sort(
    (a, b) =>
      direction *
      (collator.compare(a.name, b.name) || comparePaths(a.path, b.path)),
  )
  return keyed.map(item => item.path)
}
