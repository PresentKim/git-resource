import {FolderGit2Icon as GithubIcon} from 'lucide-react'

export default function Footer() {
  return (
    <footer className="flex w-full items-center justify-center gap-0.5 py-4 text-xs text-muted-foreground">
      <GithubIcon className="size-4" />
      <a
        href="https://github.com/PresentKim"
        target="_blank"
        rel="noopener noreferrer"
        className="hover-underlined">
        PresentKim
      </a>
      <p>/</p>
      <a
        href="https://github.com/PresentKim/git-resource"
        target="_blank"
        rel="noopener noreferrer"
        className="hover-underlined">
        git-resource
      </a>
    </footer>
  )
}
