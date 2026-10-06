export const SORT_MODES = ['path', 'path-desc', 'name', 'name-desc'] as const
export type SortMode = (typeof SORT_MODES)[number]

export const DEFAULT_SORT_MODE: SortMode = 'path'

export const sortModeLabels: Record<SortMode, string> = {
  path: 'Repository order',
  'path-desc': 'Repository order, reversed',
  name: 'File name A–Z',
  'name-desc': 'File name Z–A',
}

// Numeric-aware so that img_2 sorts before img_10
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
})

function fileName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/**
 * Return the paths in the requested order without modifying the input.
 * "path" is the order the repository listing came in and is returned as is.
 */
export function sortImagePaths(
  paths: readonly string[],
  mode: SortMode,
): string[] {
  if (mode === 'path') return paths as string[]
  if (mode === 'path-desc') return [...paths].reverse()

  // Decorate with the file name once instead of slicing inside the comparator
  const keyed = paths.map(path => ({path, name: fileName(path)}))
  const direction = mode === 'name' ? 1 : -1
  keyed.sort(
    (a, b) =>
      direction *
      (collator.compare(a.name, b.name) ||
        (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  )
  return keyed.map(item => item.path)
}
