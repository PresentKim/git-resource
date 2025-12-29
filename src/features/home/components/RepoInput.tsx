import {useState} from 'react'
import {IconSend2, IconAlertCircle} from '@tabler/icons-react'

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@/shared/components/ui/input-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import {parseGithubUrl} from '@/shared/utils'
import {useRepoPath} from '@/features/repo/useRepoPath'

export function RepoInput() {
  const [, setRepoPath] = useRepoPath()
  const [repoInput, setRepoInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSend = () => {
    if (repoInput.trim() === '') {
      setError('URL is required')
      return
    }

    const parsedRepo = parseGithubUrl(repoInput)
    if (!parsedRepo) {
      setError('Invalid URL')
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
    <InputGroup>
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
        aria-describedby="repo-input-description"
      />
      <InputGroupAddon align="inline-end">
        {error && (
          <Tooltip>
            <TooltipTrigger>
              <IconAlertCircle title="Error" className="size-5" />
            </TooltipTrigger>
            <TooltipContent>{error}</TooltipContent>
          </Tooltip>
        )}
        <InputGroupButton
          aria-label="Clear repository URL"
          title="Clear repository URL"
          variant="ghost"
          onClick={handleSend}
          disabled={!repoInput || !!error}>
          <IconSend2 title="Open repository" className="size-5" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
