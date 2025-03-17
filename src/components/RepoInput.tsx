import {useRef} from 'react'

import {Search as SearchIcon, X as XIcon} from 'lucide-react'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'

import {useTargetRepository} from '@/hooks/useTargetRepository'
import {cn, parseGithubUrl} from '@/utils'

interface RepoInputProps extends React.ComponentProps<'div'> {}
export function RepoInput({className, ...props}: RepoInputProps) {
  const [, setRepo] = useTargetRepository()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClearRepo = () => {
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleApplyRepo = () => {
    if (!inputRef.current) {
      return
    }

    const parsedRepository = parseGithubUrl(inputRef.current.value)
    if (!parsedRepository) {
      return
    }

    setRepo(parsedRepository.owner, parsedRepository.name, parsedRepository.ref)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleApplyRepo()
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row justify-center items-center w-full sm:space-x-2 space-y-2 sm:space-y-0',
        className,
      )}
      {...props}>
      <div className="relative flex-1 w-full">
        <Input
          ref={inputRef}
          onKeyDown={handleKeyDown}
          type="text"
          placeholder="https://github.com/example/test/main"
          className="w-full pr-8 peer"
        />
        <Button
          onClick={handleClearRepo}
          size="icon"
          variant="ghost"
          className="absolute right-0 top-0 max-w-sm h-full px-2 peer-placeholder-shown:hidden">
          <XIcon className="size-4" />
        </Button>
      </div>
      <Button onClick={handleApplyRepo} className="w-full sm:w-fit gap-2">
        <SearchIcon strokeWidth={3} className="size-4" />
        <p className="">Open Repo</p>
      </Button>
    </div>
  )
}
