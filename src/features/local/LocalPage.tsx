import {useLayoutEffect} from 'react'
import {HardDrive, X} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {
  Gallery,
  GalleryLoader,
  type GalleryLoading,
} from '@/features/repo/Gallery'
import {
  LocalOpenButtons,
  RecentLocalList,
} from '@/features/local/LocalOpenButtons'
import {useLocalStore} from '@/shared/stores/localStore'
import {useRepoStore} from '@/shared/stores/repoStore'
import type {LocalProgress} from '@/shared/api/local/openLocalFiles'
import {EMPTY_SOURCE} from '@/shared/utils/imageSource'
import {getPageTitle} from '@/shared/utils/routeMeta'

const PAGE_LABEL = 'On this device'

function toGalleryLoading(progress: LocalProgress | null): GalleryLoading {
  if (!progress) {
    return {title: 'Opening files', description: 'Reading the files...'}
  }
  const {label, done, total} = progress
  return {
    title: label,
    description: total
      ? `${done.toLocaleString()} of ${total.toLocaleString()} files`
      : `${done.toLocaleString()} images found so far`,
    progress: total ? (done / total) * 100 : null,
  }
}

function LocalError({message}: {message: string}) {
  const dismissError = useLocalStore(state => state.dismissError)
  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <div className="space-y-0.5">
        <p className="font-semibold">Could not open these files</p>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Dismiss"
        onClick={dismissError}>
        <X />
      </Button>
    </div>
  )
}

/** What the page shows before anything is open (or after a reload) */
function LocalStart({error}: {error: string | null}) {
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-3 pt-16 pb-10">
      <title>{getPageTitle(PAGE_LABEL)}</title>
      <div className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <HardDrive className="size-6 text-chart-8" aria-hidden="true" />
          Open images from this device
        </h1>
        <p className="text-sm text-muted-foreground">
          Open a folder, a resource pack or mod (.zip, .jar), or images, or drop
          them anywhere on the page. They are read in your browser and are not
          uploaded. Browsers forget opened files when the page is reloaded, so
          open them again after a reload.
        </p>
      </div>
      {error && <LocalError message={error} />}
      <LocalOpenButtons />
      <RecentLocalList />
    </section>
  )
}

/** The gallery of files opened from this device (/local) */
export default function LocalPage() {
  const opened = useLocalStore(state => state.opened)
  const status = useLocalStore(state => state.status)
  const progress = useLocalStore(state => state.progress)
  const error = useLocalStore(state => state.error)
  const storeSource = useRepoStore(state => state.source)
  const setSource = useRepoStore(state => state.setSource)
  const setImageFiles = useRepoStore(state => state.setImageFiles)

  // Before the browser paints, so another source's images never show here
  useLayoutEffect(() => {
    if (!opened) {
      setSource(EMPTY_SOURCE)
      return
    }
    setSource(opened.source)
    setImageFiles(opened.paths, opened.meta, opened.hashKind)
  }, [opened, setSource, setImageFiles])

  const loader = (
    <section className="flex w-full flex-col px-1 py-2 sm:px-2">
      <title>{getPageTitle(PAGE_LABEL)}</title>
      <GalleryLoader loading={toGalleryLoading(progress)} />
    </section>
  )

  if (!opened) {
    return status === 'opening' ? loader : <LocalStart error={error} />
  }

  // Until the layout effect has put the opened files in the store, it holds
  // the previous source, whose object URLs are revoked on the switch
  if (storeSource !== opened.source) return loader

  return (
    <Gallery
      titleLabel={opened.source.name}
      loading={status === 'opening' ? toGalleryLoading(progress) : null}
      notice={error && <LocalError message={error} />}
    />
  )
}
