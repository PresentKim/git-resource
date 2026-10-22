## Project Overview: Git Resource Viewer

[한국어](./PROJECT_OVERVIEW.kor.md) · [README](./README.md)

### 1. Introduction

**Git Resource Viewer** is a single-page web app that shows every image in a
GitHub repository from just its URL. It runs entirely in the browser and is
deployed on Vercel, which also proxies a few GitHub endpoints that do not allow
cross-origin requests.

It was built for browsing large asset repositories, such as Minecraft mods and
resource packs with thousands of textures, where GitHub's own file browser
shows one folder at a time. The same gallery also opens folders, `.zip` and
`.jar` files from the user's own device, without uploading them.

### 2. Key Features

- **Repository image listing**: finds the default branch when none is given and
  lists every image (PNG, JPEG, GIF, WebP, SVG) in the repository.
- **Local files**: folders, `.zip`/`.jar` archives and images opened with a
  picker, by drag and drop, or by "Open with" on the installed app, read in the
  browser only. Recent openings can be reopened where the browser keeps file
  handles.
- **Filter, folders and sort**: include and exclude keywords
  (`keyword -exclude`), a folder browser, and sorting by path, file name, file
  size or (local files) modification time.
- **Duplicates and comparisons**: a view of the images whose content appears
  more than once, and a comparison of two branches, tags or commits that shows
  only the added, modified and removed images, with a before/after switch in
  the viewer.
- **Favorites and recent repositories**: starred images from any repository
  in one gallery, and recently opened repositories on the home page.
- **Full-screen viewer**: keyboard, wheel and touch navigation, zoom and pan,
  1:1 and fit-to-screen, a transparency checkerboard and a pixel grid, and
  per-image download and GitHub links.
- **Bulk export**: a ZIP of the filtered images (original, last-folder-only or
  flat folder layout) and a sprite-sheet PNG ("Screenshot") of them.
- **Minecraft animation**: `.mcmeta` animations play in the grid and the viewer.
- **Shareable state**: the filter, sort order, duplicates view, comparison and
  open image live in the URL.
- **Link previews**: a shared repository or image link shows that repository
  in Discord, Slack, KakaoTalk or X, with its description and textures.
- **Settings**: theme, pixelated rendering, animation, and an optional GitHub
  personal access token.

### 3. Architecture

```text
URL  /owner/repo/ref?filter=…&sort=…&image=…
 │
 ├─ useRepoPath ─ parses the path (owner/repo, @ref, /tree/, /commit/, SSH)
 │
 ├─ no ref ──► default-branch worker ──► redirect to /owner/repo/<branch>
 │
 └─ ref ─────► image-tree worker ──► repo store ──► filter + sort ──► virtual grid
                 │                                                    │
                 ├─ IndexedDB cache (1 h, then ETag revalidation)     ├─ cells load from
                 ├─ GitHub REST API (git/trees, recursive)            │  raw.githubusercontent.com
                 └─ fallback: ZIP archive via /proxy/codeload         └─ viewer (?image=)
```

- **Workers**: each GitHub request runs in its own Web Worker that is
  terminated when it answers or when the request is aborted, so concurrent
  requests cannot mix up their responses. The workers share an abstract
  `BaseGithubWorker` that handles caching, ETags, rate-limit headers and the
  fallback path.
- **Query layer**: TanStack Query deduplicates and shares results in memory;
  the workers own the persistent cache, so no query persister is needed.
- **Image sources**: the gallery never builds URLs itself. It holds an image
  source (a GitHub repository at a ref, files from the device, or the
  favorites), and the source turns a gallery path into a URL: a
  `raw.githubusercontent.com` URL, an object URL of a local file made on first
  use, or the repository a favorite belongs to. The grid, the viewer, the
  `.mcmeta` animations, the ZIP and the sprite sheet work the same for all of
  them.
- **State**: Zustand stores hold the source, its file list with each file's
  size, hash and date, the local files, the favorites and the settings; nuqs
  keeps the filter, sort, duplicates view, comparison and open image in the
  URL.
- **Rendering**: the grid computes which rows are on screen from the scroll
  position and mounts only the rows around them. How many stay mounted adapts
  to the device: up to 10,000 cells while the browser keeps up, fewer when
  frames stall. Cells take everything as props and are memoized, so
  thousands of cells do not each subscribe to a store.

### 4. Technology Stack and Rationale

- **React 19 + React Compiler, TypeScript, Vite (Rolldown)**: lazy-loaded
  routes keep the first load small, the compiler memoizes components
  automatically, and strict TypeScript catches mistakes early.
- **Tailwind CSS 4 + Base UI (shadcn-style components)**: utility classes with
  theme tokens for light and dark themes, on accessible unstyled primitives.
- **Zustand**: small stores with selector subscriptions, cheap enough to keep
  re-renders of a large grid under control.
- **nuqs + React Router**: URL query parameters as React state, so every view
  can be shared as a link.
- **TanStack Query**: request deduplication and loading and error state for
  the worker calls.
- **idb-keyval (IndexedDB)**: persistent cache that is also reachable from Web
  Workers, with localStorage as a fallback.
- **JSZip, file-saver, UPNG.js, Canvas API**: ZIP export, sprite-sheet PNG
  export, and APNG encoding for Minecraft animations.
- **Vercel**: static hosting plus rewrites that proxy `github.com`,
  `raw.githubusercontent.com` and `codeload.github.com` for the fallbacks.
  Routing Middleware writes the link-preview tags of repository URLs into
  `index.html` from the URL alone, and a function (`@vercel/og`) draws the
  preview image, upscaling textures with nearest-neighbour sampling because
  Satori smooths scaled images.

### 5. Problem-Solving Cases

#### Rendering thousands of images

**Problem**: rendering every image of a large repository made the page lag,
and images appeared late after filtering or jumping.  
**Solution**: a custom virtualized grid and scroll-aware image loading.

- Only the rows in and around the viewport are mounted, computed from the
  scroll offset and the measured row height. While the page is idle the
  mounted range grows step by step (up to 10,000 cells), so rows scrolled back
  to are still there instead of reappearing one by one. A step that makes a
  frame slow is undone, and repeated stalls while scrolling shrink the range.
- The range shifts in chunks rather than every row, rows are memoized and
  each row is its own contained flex container, so a large range costs little
  per scroll.
- A `:has()` selector on the app root (hiding the boot spinner) made the
  browser restyle the whole page on every DOM change, which grew with the
  number of mounted cells. It is now a plain attribute toggle.
- Cells start loading their image once they are within a screen of the
  viewport, right away unless the page is scrolling
  faster than 2,500 px/s, in which case they wait until it slows down (at most
  300 ms). On a mocked 30,000-image repository, filtering back to a folder
  that was already seen went from 349 ms to 2 ms until its images were
  complete.

#### Keeping the main thread free

**Problem**: processing the file list of very large repositories froze the
browser (up to 30 seconds).  
**Solution**: Web Worker-based request and processing pipeline.

- Fetching the file tree, unzipping the fallback archive and picking out the
  image files all run in workers built on one abstract base class.
- Each worker has its own caching and error recovery, and the main thread only
  receives the finished list.

#### Working within GitHub's API rate limit

**Problem**: unauthenticated clients get 60 API requests per hour, so a few
large repositories could stop the app.  
**Solution**: layered caching and fallbacks that avoid the API.

- Responses are cached in IndexedDB for an hour and revalidated with ETags
  afterwards (HTTP 304 keeps the cached list).
- When the API refuses a request or returns a truncated tree, the image list
  comes from the repository's ZIP archive instead, and the default branch from
  the repository page's HTML.
- `.mcmeta` files are fetched through a proxy before the API is used.
- A personal access token can be added to raise the limit to 5,000 per hour.

#### A fallback that the browser blocked

**Problem**: the ZIP fallback never finished. GitHub answers
`github.com/<repo>/archive/<ref>.zip` with a redirect to
`codeload.github.com`, which only allows cross-origin reads from GitHub's own
domain, so the browser blocked the redirected download. The archive URL also
only resolved branches, not tags or commits.  
**Solution**: a dedicated `/proxy/codeload` route (Vite in development,
Vercel rewrites in production) that requests `codeload.github.com/<repo>/zip/<ref>`
directly. That URL needs no redirect and resolves branches, tags and full
commit SHAs.

#### One gallery for files that are not on GitHub

**Problem**: opening local folders and archives needed the whole gallery
(grid, viewer, animations, downloads), which built GitHub URLs in a dozen
places.  
**Solution**: an image source between the gallery and where the files live.

- Every URL comes from the source, so local files only had to provide object
  URLs; `fetch` reads them like any other URL, which kept the download and
  sprite-sheet code unchanged.
- Archives are unpacked in a worker, which also hashes each file; folders are
  listed without reading their files, and are hashed in a worker only when the
  duplicates view needs it.
- Object URLs are revoked when another source opens. The local page renders
  the gallery only once the store holds the opened files, so the previous
  files are never drawn with URLs that are already revoked.

#### Comparing versions without asking GitHub per file

**Problem**: finding what changed between two versions file by file would
take a request per file.  
**Solution**: the tree listing already has the git hash of every file.

- The tree worker keeps each file's hash and size, so a comparison needs only
  the other ref's listing, from the same worker and cache.
- Files with the same path and another hash are modified; paths on one side
  only are added or removed. Removed images still load, from the other ref.
- A listing from the ZIP fallback has CRC-32 values instead of git hashes. It
  still finds duplicates, but is not compared with an API listing; the app
  says so instead of reporting false changes.

### 6. Achievements and Reflection

#### Technical growth

- Performance work with browser APIs: virtualization, Web Workers, IndexedDB
  and image decoding.
- Designing a client-side strategy around an external API's limits instead of
  adding a backend.
- Using the type system and a small number of well-defined stores to keep a
  growing codebase stable.

#### Architecture

- A worker-based asynchronous pipeline with a shared base class for caching,
  revalidation and fallbacks.
- A cache that works the same way from workers and the main thread.
- Error states that name the cause (rate limit, missing repository, failed
  image) and offer a way forward.

#### Lessons

- Even "simple" data refinement needs to leave the main thread once the data
  is large.
- A fallback path needs to be tested end to end in the browser: a redirect
  that works with `curl` can still be blocked by CORS.
- Performance and user experience have to be measured together; loading
  images sooner mattered as much as rendering fewer of them.
