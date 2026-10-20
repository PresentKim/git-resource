import {useCallback, useState} from 'react'
import {RefreshCw} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {FeaturedRepositoryCard} from '@/features/home/components/FeaturedRepositoryCard'
import {RepoInput} from '@/features/home/components/RepoInput'

import {useRepoPath} from '@/features/repo/useRepoPath'
import {cn, pickByPartialFisherYates} from '@/shared/utils'
import {
  exampleRepositories,
  featuredRepository,
} from '@/shared/utils/example-repositories'
import {APP_NAME} from '@/shared/utils/routeMeta'

const EXAMPLE_REPO_COUNT = 5
const REROLL_ANIMATION_DURATION_MS = 200

export default function HomePage() {
  const [, setRepoPath] = useRepoPath()
  const [shuffledExampleRepositories, setShuffledExampleRepositories] =
    useState(exampleRepositories.slice(-EXAMPLE_REPO_COUNT))
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
      {/* A repository link opened first leaves its own title in index.html
          (see middleware.ts); this one, hoisted first, wins on the way home */}
      <title>{APP_NAME}</title>
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
        id="hero-title"
        className={cn(
          'w-full max-w-2xl mx-auto pt-10 pb-2',
          'text-center text-balance font-semibold tracking-tight text-4xl md:text-6xl leading-[1.1]',
        )}>
        Explore GitHub images
        <span className="block bg-linear-to-r from-chart-3 via-chart-8 to-chart-6 bg-clip-text text-transparent">
          filter, preview, and download in one place
        </span>
      </h1>

      <div className="mx-auto w-full max-w-2xl pt-12 sm:pt-16">
        <h2 className="mb-3 ml-3 text-base font-semibold">
          <span aria-hidden="true">• </span>Paste GitHub repository URL
        </h2>
        <RepoInput />
      </div>

      {/* Decorative: the two headings already say what each part is for */}
      <div aria-hidden="true" className="flex items-center py-8 sm:py-10">
        <div className="h-px flex-1 bg-border" />
        <span className="px-2 text-xs text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mx-auto w-full max-w-2xl pb-8 sm:pb-10">
        <h2 className="mb-3 ml-3 text-base font-semibold">
          <span aria-hidden="true">• </span>Start with the featured repository
        </h2>
        <FeaturedRepositoryCard
          repository={featuredRepository}
          onOpen={() =>
            setRepoPath(
              featuredRepository.owner,
              featuredRepository.name,
              featuredRepository.ref,
            )
          }
        />
      </div>

      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex flex-row justify-between items-center gap-2 sm:text-left">
          <h2
            id="example-repositories-title"
            className="mb-3 ml-3 text-base font-semibold">
            <span aria-hidden="true">• </span>Explore with example repositories
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex items-center gap-1 text-xs max-sm:size-9"
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

        <ul
          key={rerollKey}
          className={`grid w-full grid-cols-1 gap-2 transition-opacity duration-200 ${
            isRerolling ? 'opacity-0' : 'opacity-100'
          }`}
          aria-labelledby="example-repositories-title">
          {shuffledExampleRepositories.map(([owner, name, ref], index) => {
            const handleClick = () => setRepoPath(owner, name, ref)
            const displayName = `${owner}/${name}`

            return (
              <li key={`${rerollKey}-${index}`}>
                <Button
                  variant="outline"
                  className={cn(
                    'flex w-full items-center justify-start overflow-hidden border-border/60',
                    'text-ellipsis whitespace-nowrap text-sm text-foreground',
                    'animate-fade-in-slide transition-all duration-150',
                    'hover:bg-accent/20 hover:text-foreground hover:scale-102',
                    // Taller on phones, where they are tapped
                    'max-sm:h-10',
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                  onClick={handleClick}
                  aria-label={`Open example repository ${displayName}`}>
                  <span className="font-mono">{displayName}</span>
                </Button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
