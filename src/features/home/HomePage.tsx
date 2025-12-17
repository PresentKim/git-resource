import {useCallback, useState} from 'react'
import {RefreshCw} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {RepoInput} from '@/features/home/components/RepoInput'

import {useTargetRepository} from '@/shared/hooks/useTargetRepository'
import {cn, pickByPartialFisherYates} from '@/shared/utils'
import {exampleRepositories} from '@/shared/utils/example-repositories'

const EXAMPLE_REPO_COUNT = 5
const REROLL_ANIMATION_DURATION_MS = 200

export default function HomePage() {
  const [, setTargetRepository] = useTargetRepository()
  const [shuffledExampleRepositories, setShuffledExampleRepositories] =
    useState(exampleRepositories.slice(0, EXAMPLE_REPO_COUNT))
  const [isRerolling, setIsRerolling] = useState(false)
  const [rerollKey, setRerollKey] = useState(0)

  const handleRerollExamples = useCallback(() => {
    if (!exampleRepositories.length) return

    setIsRerolling(true)
    setRerollKey(prev => prev + 1)

    // After fade-out, apply the new shuffled list
    setTimeout(() => {
      setShuffledExampleRepositories(
        pickByPartialFisherYates(exampleRepositories, EXAMPLE_REPO_COUNT),
      )
      setIsRerolling(false)
    }, REROLL_ANIMATION_DURATION_MS)
  }, [])

  return (
    <section className="flex flex-col w-full px-3">
      <div
        className={cn(
          'inline-flex items-center justify-center w-fit mx-auto px-3 py-1 mt-24 md:mt-28 select-none',
          'rounded-full border border-border/60',
          'bg-card/50 shadow-sm backdrop-blur',
          'text-xs font-medium text-muted-foreground',
        )}>
        <span className="mr-1 inline-block size-1.5 rounded-full bg-chart-2" />
        Browse GitHub repository images instantly
      </div>
      <h1
        aria-label="Hero title"
        id="hero-title"
        className={cn(
          'w-full max-w-2xl mx-auto pt-10 pb-2',
          'text-center text-balance font-semibold tracking-tight text-4xl md:text-6xl leading-[1.1]',
        )}>
        Explore GitHub images
        <span className="block bg-linear-to-r from-chart-1 via-chart-4 to-chart-2 bg-clip-text text-transparent">
          filter, preview, and download in one place
        </span>
      </h1>

      <div
        aria-label="Repository input"
        className="mx-auto w-full max-w-2xl pt-12 sm:pt-16">
        <h2 className="mb-3 ml-3 text-base font-semibold">
          • Paste GitHub repository URL
        </h2>
        <RepoInput />
      </div>

      <div aria-label="Separator" className="flex items-center py-8 sm:py-10">
        <div className="h-px flex-1 bg-border" />
        <span className="px-1 text-xs text-border">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div
        aria-label="Example repositories"
        className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex flex-row justify-between items-center gap-2 sm:text-left">
          <h2 className="mb-3 ml-3 text-base font-semibold">
            • Explore with example repositories
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-xs"
            onClick={handleRerollExamples}
            disabled={isRerolling}
            aria-label="Shuffle example repositories">
            <RefreshCw
              className={`size-4 transition-transform duration-500 ${
                isRerolling ? 'animate-spin' : ''
              }`}
            />
            <span className="hidden sm:block font-semibold">
              Shuffle examples
            </span>
          </Button>
        </div>

        <div
          key={rerollKey}
          className={`grid w-full grid-cols-1 gap-2 transition-opacity duration-200 ${
            isRerolling ? 'opacity-0' : 'opacity-100'
          }`}
          role="list"
          aria-label="Example repositories">
          {shuffledExampleRepositories.map(([owner, name, ref], index) => {
            const handleClick = () => setTargetRepository(owner, name, ref)
            const displayName = `${owner}/${name}`

            return (
              <Button
                key={`${rerollKey}-${index}`}
                role="listitem"
                variant="outline"
                className={cn(
                  'flex items-center justify-start overflow-hidden border-border/60',
                  'text-ellipsis whitespace-nowrap text-sm text-foreground',
                  'animate-fade-in-slide transition-all duration-150',
                  'hover:bg-accent/20 hover:text-foreground hover:scale-102',
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                onClick={handleClick}
                aria-label={`Open example repository ${displayName}`}>
                <span className="font-mono">{displayName}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
