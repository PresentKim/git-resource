export interface DirectoryNode {
  /** Folder name, empty for the root */
  name: string
  /** Full path with a trailing slash, empty for the root */
  path: string
  /** Number of files in this folder and everything below it */
  count: number
  children: Map<string, DirectoryNode>
}

/**
 * Build a folder tree from file paths, counting the files under each folder.
 * One pass over the paths, so it stays cheap for tens of thousands of files.
 */
export function buildDirectoryTree(paths: readonly string[]): DirectoryNode {
  const root: DirectoryNode = {
    name: '',
    path: '',
    count: 0,
    children: new Map(),
  }

  for (const filePath of paths) {
    const segments = filePath.split('/')
    let node = root
    node.count += 1
    // The last segment is the file name, only the folders before it count
    for (let i = 0; i < segments.length - 1; i++) {
      let child = node.children.get(segments[i])
      if (!child) {
        child = {
          name: segments[i],
          path: `${node.path}${segments[i]}/`,
          count: 0,
          children: new Map(),
        }
        node.children.set(segments[i], child)
      }
      child.count += 1
      node = child
    }
  }

  return root
}

/** Find a folder by its path ("a/b/"); the empty path is the root */
export function findDirectory(
  root: DirectoryNode,
  path: string,
): DirectoryNode | null {
  if (!path) return root
  let node = root
  for (const segment of path.split('/').filter(Boolean)) {
    const child = node.children.get(segment)
    if (!child) return null
    node = child
  }
  return node
}
