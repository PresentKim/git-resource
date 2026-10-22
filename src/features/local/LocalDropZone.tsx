import {useEffect, useEffectEvent, useState} from 'react'
import {Upload} from 'lucide-react'

import {useOpenLocal} from '@/features/local/useOpenLocal'

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

/**
 * Lets folders, archives and images be dropped anywhere on the page to open
 * them, with an overlay while files are dragged over it.
 */
export function LocalDropZone() {
  const {openDrop} = useOpenLocal()
  const [dragging, setDragging] = useState(false)

  const onDrop = useEffectEvent((dataTransfer: DataTransfer) => {
    openDrop(dataTransfer)
  })

  useEffect(() => {
    // dragenter and dragleave fire for every element crossed, so the
    // overlay is shown while more enters than leaves have been seen
    let depth = 0

    const handleDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      depth += 1
      setDragging(true)
    }
    const handleDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return
      // Without this the browser opens the file itself on drop
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }
    const handleDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const handleDrop = (event: DragEvent) => {
      if (!hasFiles(event) || !event.dataTransfer) return
      event.preventDefault()
      depth = 0
      setDragging(false)
      onDrop(event.dataTransfer)
    }

    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  if (!dragging) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/60 bg-card/80 px-10 py-8 text-center shadow-xl">
        <Upload className="size-10 text-chart-8" />
        <p className="text-lg font-semibold">Drop to open</p>
        <p className="text-sm text-muted-foreground">
          A folder, a .zip or .jar file, or images
        </p>
      </div>
    </div>
  )
}
