import type {FileListing} from '@/shared/utils/fileMeta'

export interface RateLimit {
  limit: number
  remaining: number
}

export interface WorkerResponse<T> {
  data?: T
  error?: string
  rateLimit?: RateLimit
}

export interface WorkerRequestBase {
  token: string | null
}

export interface GithubApiCacheData<T> {
  etag: string
  value: T
  expiredAt: number
}

export interface DefaultBranchRequest {
  owner: string
  name: string
}
export interface DefaultBranchResponse {
  default_branch: string
}
export type GithubDefaultBranch = string

export interface ImageFileTreeRequest {
  owner: string
  name: string
  ref: string
}
export interface ImageFileTreeResponse {
  tree: Array<{
    path: string
    type: 'tree' | 'blob' | 'commit'
    sha: string
    /** Only on blobs */
    size?: number
  }>
  truncated?: boolean
}
/** Image and .mcmeta files with their sizes and hashes */
export type GithubImageFileTree = FileListing
