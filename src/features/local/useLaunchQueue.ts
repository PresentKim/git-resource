import {useEffect, useEffectEvent} from 'react'
import {useOpenLocal} from '@/features/local/useOpenLocal'

/**
 * Opens the files an installed app was launched with ("Open with" on a
 * .zip, .jar or image; manifest file_handlers point at /local). The browser
 * holds them until a consumer is set, so setting it on mount is enough.
 */
export function useLaunchQueue() {
  const {openHandles} = useOpenLocal()
  const onLaunch = useEffectEvent((handles: FileSystemHandle[]) => {
    if (handles.length) openHandles(handles)
  })

  useEffect(() => {
    window.launchQueue?.setConsumer(params => onLaunch(params.files))
  }, [])
}
