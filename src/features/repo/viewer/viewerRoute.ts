import {useCallback, useEffect, useMemo} from 'react'
import {parseAsString, useQueryState} from 'nuqs'

type ViewerOpener = (path: string) => void

/** Set by the mounted viewer; lets gallery cells open it without subscribing */
let opener: ViewerOpener | null = null

/** True while the open viewer sits on a history entry that opening pushed */
let openedByPush = false

function setOpenedByPush(value: boolean) {
  openedByPush = value
}

/** Returns whether the viewer was opened by a push, and forgets it */
function takeOpenedByPush() {
  const value = openedByPush
  openedByPush = false
  return value
}

function setViewerOpener(next: ViewerOpener | null) {
  opener = next
}

/**
 * Open the viewer on an image. Does nothing until the viewer is mounted.
 * Kept as a plain function so the gallery does not subscribe to the URL
 * (which would re-render every cell each time the viewer opens or closes).
 */
export function openViewer(path: string) {
  opener?.(path)
}

/**
 * Viewer state lives in the URL (?image=<path>) so an image can be shared or
 * reloaded, and the browser Back button closes the viewer.
 *
 * - Opening pushes a history entry; closing from the UI goes back to it.
 * - Moving to the previous/next image replaces the entry instead of piling
 *   up one history entry per arrow press.
 * - A path that is not in the current list (stale link, different filter)
 *   leaves the viewer closed and is removed from the URL.
 */
export function useViewerRoute(images: string[]) {
  const [imagePath, setImagePath] = useQueryState('image', parseAsString)

  const index = useMemo(
    () => (imagePath ? images.indexOf(imagePath) : -1),
    [images, imagePath],
  )

  useEffect(() => {
    setViewerOpener(path => {
      setOpenedByPush(true)
      void setImagePath(path, {history: 'push'})
    })
    return () => setViewerOpener(null)
  }, [setImagePath])

  useEffect(() => {
    if (!imagePath) setOpenedByPush(false)
  }, [imagePath])

  useEffect(() => {
    if (imagePath && index < 0 && images.length > 0) {
      void setImagePath(null, {history: 'replace'})
    }
  }, [imagePath, index, images.length, setImagePath])

  const goTo = useCallback(
    (nextIndex: number) => {
      const path = images[nextIndex]
      if (path) void setImagePath(path, {history: 'replace'})
    },
    [images, setImagePath],
  )

  const close = useCallback(() => {
    if (takeOpenedByPush()) {
      window.history.back()
    } else {
      void setImagePath(null, {history: 'replace'})
    }
  }, [setImagePath])

  return {open: index >= 0, currentIndex: Math.max(0, index), goTo, close}
}
