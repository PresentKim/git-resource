# Git Resource Viewer

A single-page web app for browsing every image in a GitHub repository, from
just its URL, or in a folder, resource pack or mod on your own device.

[Live demo](https://gitresource.com)

## Features

- **Every image in a repository, in one grid.** Enter a repository and the app
  finds its default branch, lists all PNG, JPEG, GIF, WebP and SVG files, and
  shows them in a virtualized grid that stays smooth with tens of thousands of
  images.
- **Images on your device.** Open a folder, `.zip` or `.jar` files (resource
  packs, mods) or images, or drop them anywhere on the page. They are read in
  the browser and never uploaded. Where the browser keeps file handles
  (Chromium), recent folders and files can be opened again after a reload, and
  the installed app can open `.zip`, `.jar` and image files directly.
- **Filter, browse folders and sort.** Filter paths with keywords (`sword -old`
  keeps paths containing "sword" and drops those containing "old"), step
  through folders, and sort by path, file name or file size in either
  direction, and local files also by modification time.
- **Duplicates.** Show only the images whose content appears more than once,
  grouped together and marked with their number of copies.
- **Compare versions.** Compare the open branch, tag or commit with another
  one to see only the images added, modified or removed since, and switch a
  modified image between its two versions in the viewer.
- **Favorites and recent repositories.** Star images in the viewer to collect
  them from any repository in one gallery, and reopen recently opened
  repositories from the home page. Both stay in this browser.
- **Full-screen viewer.** Open any image to see it large, with its size and
  format. Move between images with the arrow buttons or keys, zoom with the
  buttons, Ctrl/Cmd + wheel or a pinch, drag to pan, and switch to 1:1 or to
  the largest size that fits. A transparency checkerboard and a pixel grid can
  be turned on. The viewer shows each image's size, format and file size, and
  it can be downloaded, starred or opened on GitHub.
- **Download as ZIP.** Download all filtered images at once, keeping the
  original folders, only the last folder, or no folders (duplicate names are
  numbered).
- **Screenshot (sprite sheet).** Combine the filtered images into one PNG,
  with a chosen gap, background, scale and column count.
- **Minecraft texture animation.** Textures with a `.mcmeta` file play their
  animation in the grid and in the viewer.
- **Shareable views.** The filter, the sort order, the duplicates view, the
  comparison and the open image are kept in the URL, so a link reopens the
  same view.
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

To look at files on your device instead, use **Open folder** or **Open .zip,
.jar or images** on the home page, or drop them on any page. A single folder
or archive is shown as it is; several are shown side by side, each in a folder
of its own name. Opened files are kept until the page is reloaded.

Looking for textures you may reuse? [TEXTURE_REPOSITORIES.md](TEXTURE_REPOSITORIES.md)
lists repositories that give away Minecraft-style textures, with their
licenses and a link to browse each one here.

### URL parameters

| Parameter    | Example            | Meaning                                                                                    |
| ------------ | ------------------ | ------------------------------------------------------------------------------------------ |
| `filter`     | `?filter=gui`      | Keywords to include, and `-keyword` to exclude                                             |
| `sort`       | `?sort=name`       | `path` (default), `name`, `size` or `modified`, or `-desc` after one for the reverse order |
| `duplicates` | `?duplicates=true` | Only images that have an identical copy                                                    |
| `compare`    | `?compare=v1.0`    | The branch, tag or commit to compare the open one with                                     |
| `changes`    | `?changes=added`   | While comparing: `added`, `modified` or `removed` only                                     |
| `image`      | `?image=a/b.png`   | The image open in the viewer                                                               |

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

The file list also holds each file's size and git hash, which the size sort,
the duplicates view and comparisons use without further requests. Comparing
loads the other ref's file list the same way (one more request, or none when
it is cached). When a list comes from the ZIP fallback, files are told apart by
the CRC-32 the archive stores, so such a list can be searched for duplicates
but not compared with one from the API.

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
    home/       Home page, repository input and recent repositories
    repo/       Gallery: grid cells, filter toolbar, viewer, downloads, compare
    local/      Opening files from this device (/local), drop zone
    favorites/  Favorites gallery (/favorites) and the viewer's star
  shared/
    api/github/ Web Workers that call the GitHub API, with caching and fallbacks
    api/local/  Reading folders and files, Web Workers that unpack and hash
    components/ Layout, virtualized grid and UI primitives
    hooks/      Shared React hooks
    stores/     Zustand stores (gallery, local files, favorites, settings, ...)
    utils/      Image sources, URL parsing, sorting, comparing, .mcmeta parsing
```

## Tech stack

React 19 with the React Compiler, TypeScript, Vite (Rolldown), Tailwind CSS 4,
Base UI components in the shadcn style, Zustand, TanStack Query, nuqs, React
Router, idb-keyval, JSZip, UPNG.js and Lucide icons. Deployed on Vercel.

For the design and the problems it solves, see the project overview:
[English](./PROJECT_OVERVIEW.md) · [한국어](./PROJECT_OVERVIEW.kor.md).

## License

[MIT](./LICENSE)
