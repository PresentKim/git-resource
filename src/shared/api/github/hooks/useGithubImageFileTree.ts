import type {GithubImageFileTree, ImageFileTreeRequest} from '../types'
import {useGithubWorker} from './useGithubBaseWorker'
import workerUrl from '../workers/imageFileTreeWorker.ts?worker&url'

export function useGithubImageFileTree() {
  const worker = String(new URL(workerUrl, import.meta.url))
  return useGithubWorker<ImageFileTreeRequest, GithubImageFileTree>(worker)
}
