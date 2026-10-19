import {useId, useState} from 'react'
import {CircleAlert, Send} from 'lucide-react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/shared/components/ui/input-group'
import {parseGithubUrl} from '@/shared/utils'
import {useRepoPath} from '@/features/repo/useRepoPath'

export function RepoInput() {
  const [, setRepoPath] = useRepoPath()
  const [repoInput, setRepoInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messageId = useId()

  const handleSend = () => {
    if (repoInput.trim() === '') {
      setError('Enter a repository, for example owner/repo.')
      return
    }

    const parsedRepo = parseGithubUrl(repoInput)
    if (!parsedRepo) {
      setError(
        'That does not look like a GitHub repository. Use owner/repo or owner/repo/branch.',
      )
      return
    }

    setError(null)
    setRepoPath(parsedRepo.owner, parsedRepo.name, parsedRepo.ref)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim()
    const match = value.match(/^https:\/\/github\.com\/(.+)$/i)
    if (match) {
      value = match[1]
    }

    setRepoInput(value)
    setError(null)
  }

  return (
    <div className="space-y-2">
      {/* Taller on phones, where the send button is tapped */}
      <InputGroup className="max-sm:h-10">
        <InputGroupAddon>
          <InputGroupText>https://github.com/</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          aria-invalid={!!error}
          value={repoInput}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          type="text"
          placeholder=":owner/:repo/:ref"
          className={error ? 'border-destructive' : ''}
          aria-label="GitHub repository URL"
          aria-describedby={messageId}
        />
        <InputGroupAddon align="inline-end">
          {error && (
            <CircleAlert
              aria-hidden="true"
              className="size-5 text-destructive"
            />
          )}
          {/* Stays enabled so that pressing it always answers, with the
              message below when the input cannot be opened */}
          <InputGroupButton
            aria-label="Open repository"
            title="Open repository"
            variant="ghost"
            className="max-sm:size-9"
            onClick={handleSend}>
            <Send className="size-5" />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {/* A hint until something is wrong, then the reason in its place. The
          alert is a new element so that screen readers announce it. */}
      {error ? (
        <p
          key="error"
          id={messageId}
          role="alert"
          className="ml-3 text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p
          key="hint"
          id={messageId}
          className="ml-3 text-xs text-muted-foreground">
          For example owner/repo or owner/repo/branch. A full GitHub link works
          too.
        </p>
      )}
    </div>
  )
}
