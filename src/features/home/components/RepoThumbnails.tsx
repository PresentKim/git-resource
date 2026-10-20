import {useState} from 'react'

import {cn} from '@/shared/utils'

interface RepoThumbnailsProps {
  urls: string[]
  className?: string
}

/**
 * A row of small pixel-art previews. Decorative: the repository name next to
 * it says what it is. An image that fails to load drops out of the row.
 */
export function RepoThumbnails({urls, className}: RepoThumbnailsProps) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set())
  const visible = urls.filter(url => !failed.has(url))
  if (!visible.length) return null

  return (
    <ul aria-hidden="true" className={cn('flex shrink-0 gap-1', className)}>
      {visible.map(url => (
        <li
          key={url}
          className="flex size-6 items-center justify-center rounded-sm bg-muted/60">
          <img
            src={url}
            alt=""
            width={16}
            height={16}
            loading="lazy"
            draggable={false}
            className="pixelated size-5"
            onError={() => setFailed(prev => new Set(prev).add(url))}
          />
        </li>
      ))}
    </ul>
  )
}
