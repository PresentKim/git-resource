import {NavLink} from 'react-router-dom'

import {Button} from '@/shared/components/ui/button'
import {useSettingsDialogStore} from '@/shared/stores/settingsDialogStore'

interface RepoErrorProps {
  error: Error
  onRetry: () => void
}

/**
 * Error card for a repository that failed to load, with next steps that
 * match the cause: open settings to add a token on a rate limit, or go home
 * when the repository was not found.
 */
export function RepoError({error, onRetry}: RepoErrorProps) {
  const openSettings = useSettingsDialogStore(state => state.setOpen)
  const isRateLimited = error.message.includes('403')
  const isNotFound = error.message.includes('404')

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center text-sm text-destructive-foreground">
      <p className="text-base font-semibold">
        Something went wrong while loading images.
      </p>
      <p className="max-w-xl text-xs text-muted-foreground">{error.message}</p>
      <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
        {isRateLimited ? (
          <>
            <span>· You have hit the GitHub API rate limit.</span>
            <span>
              · Wait a moment and try again, or add a GitHub Personal Access
              Token in settings.
            </span>
          </>
        ) : isNotFound ? (
          <>
            <span>· Check that the repository URL is valid and public.</span>
            <span>· The repository may not exist or may be private.</span>
          </>
        ) : (
          <>
            <span>· Check that the repository URL is valid and public.</span>
            <span>· You may have hit the GitHub API rate limit.</span>
          </>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
        {isRateLimited && (
          <Button size="sm" onClick={() => openSettings(true)}>
            Open settings
          </Button>
        )}
        {isNotFound && (
          <Button
            size="sm"
            variant="secondary"
            nativeButton={false}
            render={<NavLink to="/" />}>
            Back to home
          </Button>
        )}
      </div>
    </div>
  )
}
