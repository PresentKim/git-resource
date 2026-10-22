import {useCallback, useState} from 'react'
import {RefreshCw} from 'lucide-react'

import {Button} from '@/shared/components/ui/button'
import {RepoInput} from '@/features/home/components/RepoInput'
import {RepositoryCard} from '@/features/home/components/RepositoryCard'
import {RecentRepositories} from '@/features/home/components/RecentRepositories'
import {
  LocalOpenButtons,
  RecentLocalList,
} from '@/features/local/LocalOpenButtons'

import {useRepoPath} from '@/features/repo/useRepoPath'
import {cn, pickByPartialFisherYates} from '@/shared/utils'
import {
  exampleRepositories,
  featuredRepositories,
} from '@/shared/utils/example-repositories'
import {
  getFeaturedPreview,
  getRepositoryPreview,
} from '@/shared/utils/example-thumbnails'
import {APP_NAME} from '@/shared/utils/routeMeta'

const EXAMPLE_REPO_COUNT = 7
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
        <RecentRepositories onOpen={setRepoPath} className="mt-4 ml-3" />
      </div>

      <div className="mx-auto w-full max-w-2xl pt-10">
        <h2 className="mb-1 ml-3 text-base font-semibold">
          <span aria-hidden="true">• </span>Or open images on this device
        </h2>
        <p className="mb-3 ml-3 text-xs text-muted-foreground">
          A folder, a resource pack or mod (.zip, .jar), or images. You can also
          drop them anywhere on the page; nothing is uploaded.
        </p>
        <LocalOpenButtons className="ml-3" />
        <RecentLocalList className="mt-4 ml-3" />
      </div>

      {/* Decorative: the two headings already say what each part is for */}
      <div aria-hidden="true" className="flex items-center py-8 sm:py-10">
        <div className="h-px flex-1 bg-border" />
        <span className="px-2 text-xs text-muted-foreground">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="mx-auto w-full max-w-2xl pb-8 sm:pb-10">
        <h2
          id="featured-repositories-title"
          className="mb-3 ml-3 text-base font-semibold">
          <span aria-hidden="true">• </span>Start with a featured repository
        </h2>
        <ul
          className="grid w-full grid-cols-1 gap-3"
          aria-labelledby="featured-repositories-title">
          {featuredRepositories.map(featured => {
            const {owner, name, ref} = featured
            return (
              <li key={`${owner}/${name}/${ref}`}>
                <RepositoryCard
                  owner={owner}
                  name={name}
                  {...getFeaturedPreview(featured)}
                  featured
                  onOpen={() => setRepoPath(owner, name, ref)}
                />
              </li>
            )
          })}
        </ul>
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
          className={`grid w-full grid-cols-1 gap-3 transition-opacity duration-200 ${
            isRerolling ? 'opacity-0' : 'opacity-100'
          }`}
          aria-labelledby="example-repositories-title">
          {shuffledExampleRepositories.map(([owner, name, ref], index) => (
            <li key={`${rerollKey}-${index}`}>
              <RepositoryCard
                owner={owner}
                name={name}
                {...getRepositoryPreview(owner, name, ref)}
                onOpen={() => setRepoPath(owner, name, ref)}
                className="animate-fade-in-slide"
                style={{animationDelay: `${index * 50}ms`}}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
