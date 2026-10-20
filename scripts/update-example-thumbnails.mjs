/**
 * Picks a few thumbnail images and the description of every featured and
 * example repository and writes them to src/shared/utils/example-thumbnails.json,
 * so the home page can show them without calling the GitHub API.
 *
 * Each entry is pinned to a commit SHA: raw.githubusercontent.com URLs for a
 * commit never change, so the thumbnails keep working when the branch moves.
 * Loading them from raw.githubusercontent.com does not count against the API
 * rate limit.
 *
 * Usage:
 *   node scripts/update-example-thumbnails.mjs         # only repositories without thumbnails
 *   node scripts/update-example-thumbnails.mjs --all   # refresh every repository
 *
 * Needs a token for the API calls (three per repository): GITHUB_TOKEN, or the
 * GitHub CLI's login (`gh auth token`).
 */
import {execSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const EXAMPLES_FILE = fileURLToPath(
  new URL('../src/shared/utils/example-repositories.ts', import.meta.url)
);
const OUTPUT_FILE = fileURLToPath(
  new URL('../src/shared/utils/example-thumbnails.json', import.meta.url)
);

const THUMBNAILS_PER_REPO = 8;
/** How many candidates to download at most before giving up on a repository */
const MAX_CANDIDATES = 40;
const CONCURRENCY = 6;
const MIN_SIZE = 8;
const MAX_SIZE = 64;

const refreshAll = process.argv.includes('--all');

function getToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync('gh auth token', {encoding: 'utf8'}).trim();
  } catch {
    throw new Error('Set GITHUB_TOKEN or log in with `gh auth login`');
  }
}

/**
 * The featured repositories ({owner, name, ref} objects) followed by the
 * [owner, name, ref] tuples of exampleRepositories, read from the source
 */
function readRepositories() {
  const source = readFileSync(EXAMPLES_FILE, 'utf8');
  const examplesStart = source.indexOf('exampleRepositories:');
  const featured = source.slice(0, examplesStart);
  const examples = source.slice(examplesStart);
  const objectPattern =
    /owner: '([^']+)',\s*name: '([^']+)',\s*ref: '([^']+)'/g;
  const tuplePattern = /\[\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',?\s*\]/g;
  return [
    ...featured.matchAll(objectPattern),
    ...examples.matchAll(tuplePattern),
  ].map(([, owner, name, ref]) => ({owner, name, ref}));
}

const token = getToken();

async function githubApi(path, accept = 'application/vnd.github+json') {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {Authorization: `Bearer ${token}`, Accept: accept},
  });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return accept.endsWith('sha') ? response.text() : response.json();
}

/** Lower is better; Infinity for files that make poor thumbnails */
function rankPath(path) {
  const lower = path.toLowerCase();
  if (!lower.endsWith('.png')) return Infinity;
  if (
    /(^|\/)(\.github|docs?|screenshots?|gallery|wiki)\//.test(lower) ||
    /(^|\/)(pack|logo|icon|banner|preview|thumbnail)[^/]*\.png$/.test(lower) ||
    /_(n|s|e|normal|specular|emissive|overlay)\.png$/.test(lower)
  )
    return Infinity;
  // Rarely look like an item on their own: only when nothing else is left
  if (
    /\/(gui|particles?|entity|environment|colormap|font|misc|painting|map|mob_effect|models\/armor|trims)\//.test(
      lower
    )
  )
    return 4;
  if (/\/textures\/items?\//.test(lower)) return 0;
  if (/\/textures\/blocks?\//.test(lower)) return 1;
  if (lower.includes('/textures/')) return 2;
  return 3;
}

/** Spread picks across the sorted list so they come from different folders */
function spread(items, count) {
  if (items.length <= count) return items;
  const step = items.length / count;
  return Array.from({length: count}, (_, i) => items[Math.floor(i * step)]);
}

/** Width and height from a PNG's IHDR chunk */
function pngSize(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 24 || view.getUint32(0) !== 0x89504e47) return null;
  return {width: view.getUint32(16), height: view.getUint32(20)};
}

function rawUrl(owner, name, sha, path) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${owner}/${name}/${sha}/${encoded}`;
}

async function isGoodThumbnail(owner, name, sha, path) {
  const response = await fetch(rawUrl(owner, name, sha, path));
  if (!response.ok) return false;
  const size = pngSize(new Uint8Array(await response.arrayBuffer()));
  return (
    !!size &&
    size.width === size.height &&
    size.width >= MIN_SIZE &&
    size.width <= MAX_SIZE
  );
}

async function pickThumbnails({owner, name, ref}) {
  const {description} = await githubApi(`/repos/${owner}/${name}`);
  const sha = await githubApi(
    `/repos/${owner}/${name}/commits/${encodeURIComponent(ref)}`,
    'application/vnd.github.sha'
  );
  const tree = await githubApi(
    `/repos/${owner}/${name}/git/trees/${sha}?recursive=1`
  );
  const ranked = tree.tree
    .filter(entry => entry.type === 'blob')
    .map(entry => ({path: entry.path, rank: rankPath(entry.path)}))
    .filter(entry => entry.rank !== Infinity)
    .sort((a, b) => a.rank - b.rank || a.path.localeCompare(b.path));

  // Best tier first, spread out; lower tiers only fill what is left
  const candidates = [];
  for (const rank of [0, 1, 2, 3, 4]) {
    const tier = ranked.filter(entry => entry.rank === rank);
    candidates.push(...spread(tier, MAX_CANDIDATES - candidates.length));
    if (candidates.length >= MAX_CANDIDATES) break;
  }

  const images = [];
  for (const {path} of candidates) {
    if (await isGoodThumbnail(owner, name, sha, path)) images.push(path);
    if (images.length === THUMBNAILS_PER_REPO) break;
  }
  return description?.trim()
    ? {sha, description: description.trim(), images}
    : {sha, images};
}

const repositories = readRepositories();
const previous = existsSync(OUTPUT_FILE)
  ? JSON.parse(readFileSync(OUTPUT_FILE, 'utf8'))
  : {};
const keyOf = ({owner, name, ref}) => `${owner}/${name}/${ref}`;

const result = {};
const todo = [];
for (const repo of repositories) {
  const key = keyOf(repo);
  if (!refreshAll && previous[key]) result[key] = previous[key];
  else todo.push(repo);
}

console.info(
  `${repositories.length} repositories, ${todo.length} to update (${refreshAll ? 'all' : 'missing only'})`
);

const failures = [];
let next = 0;
async function worker() {
  while (next < todo.length) {
    const repo = todo[next++];
    const key = keyOf(repo);
    try {
      const entry = await pickThumbnails(repo);
      result[key] = entry;
      console.info(`${entry.images.length}/${THUMBNAILS_PER_REPO}  ${key}`);
    } catch (error) {
      failures.push(`${key}: ${error.message}`);
      console.error(`failed  ${key}: ${error.message}`);
    }
  }
}
await Promise.all(Array.from({length: CONCURRENCY}, worker));

// Same order as the example list, so diffs stay small
const ordered = Object.fromEntries(
  repositories
    .map(keyOf)
    .flatMap(key => (key in result ? [[key, result[key]]] : []))
);
writeFileSync(OUTPUT_FILE, `${JSON.stringify(ordered, null, 2)}\n`);

const empty = Object.entries(ordered).filter(([, e]) => !e.images.length);
console.info(
  `\nWrote ${Object.keys(ordered).length} entries to ${OUTPUT_FILE}`
);
if (empty.length)
  console.info(`No usable images: ${empty.map(([key]) => key).join(', ')}`);
if (failures.length) {
  console.error(`\n${failures.length} failed:\n  ${failures.join('\n  ')}`);
  process.exitCode = 1;
}
