import {memo} from 'react'
import {Copy} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {useDuplicatesQuery} from '@/features/repo/filter/useGalleryQuery'
import {useRepoStore} from '@/shared/stores/repoStore'
import {cn} from '@/shared/utils'

/**
 * Toolbar toggle for the duplicates view: only images with an identical
 * copy, grouped together. Needs file hashes, which GitHub lists give and
 * local files get on demand.
 */
export const DuplicatesToggle = memo(function DuplicatesToggle() {
  const {duplicates, setDuplicates} = useDuplicatesQuery()
  const available = useRepoStore(
    state => state.metaFields.has('hash') || state.source.kind === 'local',
  )
  const label = duplicates ? 'Show all images' : 'Show only identical images'

  return (
    <Button
      aria-label={label}
      aria-pressed={duplicates}
      title={available ? label : 'File contents are unknown for these images'}
      disabled={!available && !duplicates}
      onClick={() => setDuplicates(duplicates ? null : true)}
      size="sm"
      variant={duplicates ? 'default' : 'outline'}
      className={cn('text-xs font-semibold')}>
      <Copy className="size-4" />
      <span className="hidden sm:inline">DUPLICATES</span>
    </Button>
  )
})
