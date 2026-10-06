import {useEffect} from 'react'
import {AlertTriangle, CheckCircle2, X} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import type {DownloadOutcome} from '@/features/repo/download/useImageDownload'

const SUCCESS_VISIBLE_MS = 4000
const LISTED_FAILURES = 3

interface DownloadNoticeProps {
  outcome: DownloadOutcome | null
  onDismiss: () => void
}

/**
 * Reports how a download ended. Success goes away by itself; partial
 * failures and errors stay until dismissed so they are not missed.
 */
export function DownloadNotice({outcome, onDismiss}: DownloadNoticeProps) {
  const isSuccess = outcome?.kind === 'success'

  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(onDismiss, SUCCESS_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [isSuccess, onDismiss])

  if (!outcome) return null

  const failed = outcome.kind === 'partial' ? outcome.failed : []

  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      className="fixed bottom-4 left-1/2 z-[60] flex w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-card-foreground shadow-lg">
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-chart-2" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1 space-y-1">
        {outcome.kind === 'success' && (
          <p>Downloaded {outcome.total.toLocaleString()} images.</p>
        )}
        {outcome.kind === 'partial' && (
          <>
            <p>
              Downloaded {(outcome.total - failed.length).toLocaleString()} of{' '}
              {outcome.total.toLocaleString()} images.{' '}
              {failed.length.toLocaleString()} could not be fetched and{' '}
              {failed.length === 1 ? 'was' : 'were'} left out.
            </p>
            <p
              className="truncate text-xs text-muted-foreground"
              title={failed.join('\\n')}>
              {failed.slice(0, LISTED_FAILURES).join(', ')}
              {failed.length > LISTED_FAILURES && ', …'}
            </p>
          </>
        )}
        {outcome.kind === 'error' && <p>Download failed: {outcome.message}</p>}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="-my-1 -mr-2 size-8 shrink-0"
        aria-label="Dismiss"
        onClick={onDismiss}>
        <X className="size-4" />
      </Button>
    </div>
  )
}
