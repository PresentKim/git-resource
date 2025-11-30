import {useEffect, useState} from 'react'
import {Shuffle} from 'lucide-react'

import {Button} from '@/components/ui/button'
import {RepoInput} from '@/components/RepoInput'

import {useTargetRepository} from '@/hooks/useTargetRepository'

const EXAMPLE_REPO_COUNT = 5

export default function Home() {
  const [, setTargetRepository] = useTargetRepository()
  const [exampleRepositories, setExampleRepositories] = useState<
    [string, string, string][]
  >([])
  const [shuffledExampleRepositories, setShuffledExampleRepositories] =
    useState<[string, string, string][]>([])

  const pickRandomExamples = (
    list: [string, string, string][],
  ): [string, string, string][] => {
    return [...list]
      .sort(() => Math.random() - 0.5)
      .slice(0, EXAMPLE_REPO_COUNT) as [string, string, string][]
  }

  useEffect(() => {
    import('@/utils/example-repositories.json').then(module => {
      const loaded = module.default as [string, string, string][]
      setExampleRepositories(loaded)
      setShuffledExampleRepositories(pickRandomExamples(loaded))
    })
  }, [])

  const handleRerollExamples = () => {
    if (!exampleRepositories.length) return
    setShuffledExampleRepositories(pickRandomExamples(exampleRepositories))
  }

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
              <span className="block bg-gradient-to-r from-chart-1 via-chart-4 to-chart-2 bg-clip-text text-transparent">
                filter, preview, and download in one place
              </span>
            </h1>
            <p className="mx-auto max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
              Paste any public GitHub repository URL and
              <span className="font-semibold text-accent">
                {' '}
                browse all image assets with powerful filtering and download
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
            <span className="font-mono text-[0.7rem] text-accent sm:text-xs">
              https://github.com/owner/repo
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
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
              className="flex items-center gap-1 text-xs"
              onClick={handleRerollExamples}
              aria-label="Shuffle example repositories">
              <Shuffle className="h-3.5 w-3.5" />
              <span>Shuffle examples</span>
            </Button>
          </div>

          <div
            className="grid w-full grid-cols-1 gap-2"
            role="list"
            aria-label="Example repositories">
            {shuffledExampleRepositories.map(([owner, name, ref], index) => (
              <Button
                key={index}
                role="listitem"
                variant="outline"
                size="sm"
                className="flex h-9 items-center justify-start overflow-hidden text-ellipsis whitespace-nowrap border-border/60 bg-background/40 text-[0.7rem] font-normal text-muted-foreground hover:bg-accent/20 hover:text-foreground sm:text-xs"
                onClick={() => setTargetRepository(owner, name, ref)}
                aria-label={`Open example repository ${owner}/${name}`}>
                <span className="font-mono">
                  {owner}/{name}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
