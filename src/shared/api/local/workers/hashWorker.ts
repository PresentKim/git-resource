import {gitBlobHash} from '@/shared/utils/fileMeta'
import type {HashRequest, HashResponse} from '../types'

const PROGRESS_INTERVAL = 100

function post(message: HashResponse) {
  self.postMessage(message)
}

/**
 * Hash local files (git blob SHA-1) to find identical ones. Folders are
 * listed without reading their files, so this runs only when asked for.
 */
self.onmessage = async (e: MessageEvent<HashRequest>) => {
  const {files} = e.data
  try {
    const hashes: Array<{path: string; hash: string}> = []
    for (const [index, {path, blob}] of files.entries()) {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      hashes.push({path, hash: await gitBlobHash(bytes)})
      if ((index + 1) % PROGRESS_INTERVAL === 0) {
        post({type: 'progress', done: index + 1, total: files.length})
      }
    }
    post({type: 'done', hashes})
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    })
  }
}
