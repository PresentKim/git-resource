import {useCallback, useEffect, useState} from 'react'
import {Shuffle} from 'lucide-react'

import {Button} from '@/components/ui/button'
import {RepoInput} from '@/components/RepoInput'

import {useTargetRepository} from '@/hooks/useTargetRepository'

const EXAMPLE_REPO_COUNT = 5
const REROLL_ANIMATION_DURATION_MS = 200

type ExampleRepository = [string, string, string]

/**
 * Fisher-Yates shuffle algorithm for better randomness
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Pick random examples from a list
 */
function pickRandomExamples(
  list: ExampleRepository[],
  count: number,
): ExampleRepository[] {
  if (list.length <= count) {
    return shuffleArray(list)
  }
  return shuffleArray(list).slice(0, count) as ExampleRepository[]
}

export default function Home() {
  const [, setTargetRepository] = useTargetRepository()
  const [exampleRepositories, setExampleRepositories] = useState<
    ExampleRepository[]
  >([])
  const [shuffledExampleRepositories, setShuffledExampleRepositories] =
    useState<ExampleRepository[]>([])
  const [isRerolling, setIsRerolling] = useState(false)
  const [rerollKey, setRerollKey] = useState(0)

  useEffect(() => {
    const loadExampleRepositories = async () => {
      try {
        const module = await import('@/utils/example-repositories.json')
        const loaded = module.default as ExampleRepository[]
        setExampleRepositories(loaded)
        setShuffledExampleRepositories(
          pickRandomExamples(loaded, EXAMPLE_REPO_COUNT),
        )
      } catch (error) {
        console.error('Failed to load example repositories:', error)
      }
    }

    loadExampleRepositories()
  }, [])

  const handleRerollExamples = useCallback(() => {
    if (!exampleRepositories.length) return

    setIsRerolling(true)
    setRerollKey(prev => prev + 1)

    // After fade-out, apply the new shuffled list
    setTimeout(() => {
      setShuffledExampleRepositories(
        pickRandomExamples(exampleRepositories, EXAMPLE_REPO_COUNT),
      )
      setIsRerolling(false)
    }, REROLL_ANIMATION_DURATION_MS)
  }, [exampleRepositories])

  return (
    <section
      aria-labelledby="hero-title"
      className="flex w-full justify-center px-4 py-10 sm:py-16">
      <div className="flex w-full max-w-4xl flex-col gap-10 sm:gap-12">
        <div className="space-y-4 sm:space-y-6 text-center">
          <div className="inline-flex items-center justify-center rounded-full border border-border/60 bg-card/50 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-chart-2" />
            Browse GitHub repository images instantly
          </div>
          <div className="space-y-3 sm:space-y-4">
            <h1
              id="hero-title"
              className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Explore GitHub images
              <span className="block bg-linear-to-r from-chart-1 via-chart-4 to-chart-2 bg-clip-text text-transparent">
                filter, preview, and download in one place
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
              Paste any public GitHub repository URL and
              <span className="font-semibold text-accent">
                {' '}
                browse all image assets with powerful filtering and download
                capabilities
              </span>
              .
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:text-sm">
              <li>🔍 include / -exclude text filter</li>
              <li>⚡ caching + lazy loading</li>
              <li>🌓 dark-mode-friendly layout</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border/70 bg-card/70 p-4 shadow-lg backdrop-blur sm:p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground sm:text-base">
            Start with a repository URL
          </h2>
          <div className="w-full">
            <RepoInput />
          </div>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Example:{' '}
            <span className="font-mono text-xs text-accent">
              https://github.com/owner/repo
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          <div className="h-px flex-1 bg-border/60" />
          <span>OR</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <div className="mx-auto w-full max-w-3xl space-y-4 rounded-xl border border-dashed border-border/70 bg-card/40 p-4 sm:space-y-5 sm:p-5">
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Explore with example repositories
              </p>
              <p className="text-xs text-muted-foreground">
                Pick a curated repo to see how the image gallery works.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-xs transition-transform duration-300 hover:scale-105"
              onClick={handleRerollExamples}
              disabled={isRerolling}
              aria-label="Shuffle example repositories">
              <Shuffle
                className={`h-3.5 w-3.5 transition-transform duration-500 ${
                  isRerolling ? 'animate-spin' : ''
                }`}
              />
              <span>Shuffle examples</span>
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
                  size="sm"
                  className="flex h-9 items-center justify-start overflow-hidden text-ellipsis whitespace-nowrap border-border/60 bg-background/40 text-xs font-normal text-muted-foreground transition-all duration-300 hover:bg-accent/20 hover:text-foreground hover:scale-[1.02] animate-fade-in-slide"
                  style={{
                    animationDelay: `${index * 50}ms`,
                    opacity: 0,
                  }}
                  onClick={handleClick}
                  aria-label={`Open example repository ${displayName}`}>
                  <span className="font-mono">{displayName}</span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
