import {useState, useEffect} from 'react'

import {Button} from '@/components/ui/button'
import {RepoInput} from '@/components/RepoInput'

import {useTargetRepository} from '@/hooks/useTargetRepository'

const EXAMPLE_REPO_COUNT = 10

export default function Home() {
  const [, setTargetRepository] = useTargetRepository()
  const [shuffledExampleRepositories, setShuffledExampleRepositories] =
    useState<[string, string, string][]>([])

  useEffect(() => {
    import('@/utils/example-repositories.json').then(module => {
      const exampleRepositories = module.default
      const shuffled = [...exampleRepositories]
        .sort(() => Math.random() - 0.5)
        .slice(0, EXAMPLE_REPO_COUNT) as [string, string, string][]

      setShuffledExampleRepositories(shuffled)
    })
  }, [])

  return (
    <div className="flex flex-col items-center max-w-2xl space-y-4 py-16">
      <h1 className="text-center text-4xl font-bold">Github Resource</h1>
      <p className="text-center text-lg text-accent">
        Browse and download images from GitHub repository with ease.
      </p>
      <RepoInput />
      <hr className="w-full my-8" />
      <p className="text-center text-muted-foreground">
        Or try one of these example repositories:
      </p>
      <div className="flex flex-wrap justify-center items-center space-x-2 space-y-2 px-2">
        {shuffledExampleRepositories.map(([owner, name, ref], index) => (
          <Button
            key={index}
            variant="outline"
            className="text-sm"
            onClick={() => setTargetRepository(owner, name, ref)}>
            {`${owner}/${name}`}
          </Button>
        ))}
      </div>
    </div>
  )
}
