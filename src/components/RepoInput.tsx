import {SendHorizonal, X as XIcon} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'

import {useInputRef} from '@/hooks/features/form/useInputRef'
import {useRepoSetting} from '@/hooks/features/repo/useRepoSetting'
import {cn, parseGithubUrl} from '@/utils'

export function RepoInput({className, ...props}: React.ComponentProps<'div'>) {
  const {inputRef, clearInput, getValue} = useInputRef()
  const {setRepo} = useRepoSetting()

  const handleClearRepo = () => {
    clearInput()
  }

  const handleApplyRepo = () => {
    const url = getValue()
    if (!url) return

    const parsedRepo = parseGithubUrl(url)
    if (!parsedRepo) return

    setRepo(parsedRepo)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyRepo()
    }
  }

  return (
    <div
      className={cn('flex flex-row items-center w-full', className)}
      {...props}>
      <div className="relative flex-1 w-full">
        <Input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          type="text"
          placeholder="https://github.com/:owner/:repo/:ref"
          className="w-full pr-8 peer rounded-r-none"
          aria-label="GitHub repository URL"
          aria-describedby="repo-input-description"
        />
        <span id="repo-input-description" className="sr-only">
          Enter a GitHub repository URL to browse images
        </span>
        <Button
          onClick={handleClearRepo}
          size="icon"
          variant="ghost"
          className="absolute right-0 top-0 max-w-sm h-full px-2 peer-placeholder-shown:hidden"
          aria-label="Clear repository URL">
          <XIcon className="size-4" />
        </Button>
      </div>
      <Button
        onClick={handleApplyRepo}
        aria-label="Open repository"
        variant="outline"
        size="icon"
        className="rounded-l-none">
        <SendHorizonal strokeWidth={4} className="size-5" />
      </Button>
    </div>
  )
}
