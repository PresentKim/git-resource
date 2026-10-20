# Git Resource Viewer

A single-page web app for browsing every image in a GitHub repository, from
just its URL.

[Live demo](https://gitresource.com)

## Features

- **Every image in a repository, in one grid.** Enter a repository and the app
  finds its default branch, lists all PNG, JPEG, GIF, WebP and SVG files, and
  shows them in a virtualized grid that stays smooth with tens of thousands of
  images.
- **Filter, browse folders and sort.** Filter paths with keywords (`sword -old`
  keeps paths containing "sword" and drops those containing "old"), step
  through folders, and sort by path or file name in either direction.
- **Full-screen viewer.** Open any image to see it large, with its size and
  format. Move between images with the arrow buttons or keys, zoom with the
  buttons, Ctrl/Cmd + wheel or a pinch, drag to pan, and switch to 1:1 or to
  the largest size that fits. A transparency checkerboard and a pixel grid can
  be turned on. Each image can be downloaded or opened on GitHub.
- **Download as ZIP.** Download all filtered images at once, keeping the
  original folders, only the last folder, or no folders (duplicate names are
  numbered).
- **Screenshot (sprite sheet).** Combine the filtered images into one PNG,
  with a chosen gap, background, scale and column count.
- **Minecraft texture animation.** Textures with a `.mcmeta` file play their
  animation in the grid and in the viewer.
- **Shareable views.** The filter, the sort order and the open image are kept
  in the URL, so a link reopens the same view.
- **Settings.** Light, dark or system theme, pixelated rendering, animation on
  or off, and an optional GitHub personal access token. The grid density is
  set from the toolbar.

## Usage

1. Paste a repository into the input on the home page, or pick an example.
   These forms all work:
   - `owner/repo`, `owner/repo@ref` or `owner/repo/ref`
   - `https://github.com/owner/repo`, including `/tree/<ref>` and
     `/commit/<sha>` links
   - `git@github.com:owner/repo.git`
2. Without a ref, the default branch is used. A branch, a tag or a commit SHA
   can be given as the ref.
3. Filter, sort or browse folders from the toolbar, then click an image (or
   focus it and press Enter) to open the viewer.

Looking for textures you may reuse? [TEXTURE_REPOSITORIES.md](TEXTURE_REPOSITORIES.md)
lists repositories that give away Minecraft-style textures, with their
licenses and a link to browse each one here.

### URL parameters

| Parameter | Example          | Meaning                                              |
| --------- | ---------------- | ---------------------------------------------------- |
| `filter`  | `?filter=gui`    | Keywords to include, and `-keyword` to exclude       |
| `sort`    | `?sort=name`     | `path` (default), `path-desc`, `name` or `name-desc` |
| `image`   | `?image=a/b.png` | The image open in the viewer                         |

### Viewer keys

| Key              | Action                |
| ---------------- | --------------------- |
| ← / →            | Previous / next image |
| Esc              | Close the viewer      |
| Ctrl/Cmd + wheel | Zoom at the pointer   |

## GitHub API and rate limits

The image list comes from the GitHub REST API, which allows 60 requests per
hour without a token. To stay within that:

- Each response is cached in IndexedDB. For an hour the cached list is used
  without asking GitHub at all; after that it is revalidated with its ETag,
  and an unchanged list is reused instead of downloaded again.
- If the API refuses a request (rate limit) or returns a truncated tree (very
  large repositories), the app falls back to the repository's ZIP archive,
  and to the repository page for the default branch.

Adding a personal access token in the settings raises the limit to 5,000
requests per hour. The token is stored unencrypted in this browser only and is
sent only to `api.github.com`.

Images themselves are loaded from `raw.githubusercontent.com`, which serves
public repositories only, so private repositories are not supported.

## Development

Requirements: Node.js 22 or later. Yarn 4 is included in the repository
(`.yarn/releases`), and dependencies use Plug'n'Play (no `node_modules`).

```bash
yarn install      # install dependencies
yarn dev          # start the dev server at http://localhost:5173
yarn build        # type-check and build to dist/
yarn preview      # serve the production build
yarn eslint:lint  # lint (eslint:fix to fix)
yarn format:lint  # check formatting (format:fix to format)
yarn examples:thumbnails  # pick thumbnails for new example repositories
```

The featured and example repositories on the home page show their description
and a few of their images without calling the GitHub API.
`scripts/update-example-thumbnails.mjs` picks them once and writes
`src/shared/utils/example-thumbnails.json`, pinned to a commit so the
`raw.githubusercontent.com` URLs keep working when a branch moves. Run it after
adding a repository (`--all` refreshes every entry); it uses `GITHUB_TOKEN` or
the GitHub CLI's login. A repository without an entry is shown with its name
only, and a featured one can set its own description and images.

The Yarn cache in `.yarn/cache` is committed with the Linux native binaries
that CI needs. On Windows or macOS, run `yarn install` once after cloning so
Yarn fetches the binaries for your platform (Vite cannot start without them),
and leave the extra cache files it adds uncommitted.

The ZIP and `.mcmeta` fallbacks fetch from GitHub through same-origin proxy
paths: `/proxy/github`, `/proxy/raw` and `/proxy/codeload`. The dev server
provides them in `vite.config.ts`, and production provides them with the
rewrites in `vercel.json`.

Shared repository links get their own link preview. `middleware.ts` (Vercel
Routing Middleware) serves `index.html` with the title, description and
`og:*`/`twitter:*` tags of the repository in the URL, and `api/og.tsx` draws
the preview image: the repository name and description with the shared image,
or a grid of its first textures, scaled up pixel for pixel. Set `GITHUB_TOKEN`
in the Vercel project to raise its GitHub API limit. Vite's dev server runs
neither; use `vercel dev` to try them locally.

### Project structure

```text
api/            Vercel Function for the link-preview image (/api/og)
middleware.ts   Link-preview metadata for repository URLs
src/
  features/
    home/       Home page and repository input
    repo/       Gallery page: grid cells, filter toolbar, viewer, downloads
  shared/
    api/github/ Web Workers that call the GitHub API, with caching and fallbacks
    components/ Layout, virtualized grid and UI primitives
    hooks/      Shared React hooks
    stores/     Zustand stores (repository, settings, rate limit)
    utils/      URL parsing, sorting, .mcmeta parsing, image helpers
```

## Tech stack

React 19 with the React Compiler, TypeScript, Vite (Rolldown), Tailwind CSS 4,
Base UI components in the shadcn style, Zustand, TanStack Query, nuqs, React
Router, idb-keyval, JSZip, UPNG.js and Lucide icons. Deployed on Vercel.

For the design and the problems it solves, see the project overview:
[English](./PROJECT_OVERVIEW.md) · [한국어](./PROJECT_OVERVIEW.kor.md).

## License

[MIT](./LICENSE)
