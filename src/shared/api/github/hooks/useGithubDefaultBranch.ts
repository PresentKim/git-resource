import type {DefaultBranchRequest, GithubDefaultBranch} from '../types'
import {useGithubWorker} from './useGithubBaseWorker'
import workerUrl from '../workers/defaultBranchWorker.ts?worker&url'

export function useGithubDefaultBranch() {
  const worker = String(new URL(workerUrl, import.meta.url))
  return useGithubWorker<DefaultBranchRequest, GithubDefaultBranch>(worker)
}
