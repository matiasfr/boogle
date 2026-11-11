// Docs or code: which gate a change needs (owner call "Fast ships", 10 November). A docs-only change gets the fast
// docs checks (registry, agent model frontmatter) and skips lint, typecheck, unit tests, build, server and net; anything
// else is code and gets everything. The list is an allowlist, so an unknown path is code.
//
// CLI, for CI, the local ship gate and automerge's overlap check. Paths come on stdin, NUL- or newline-separated:
//   node dev/ci/change-class.ts          prints `docs` or `code` (an empty list is code: run everything)
//   node dev/ci/change-class.ts --code   prints only the code paths, one per line
//   node dev/ci/change-class.ts --jobs   prints CI's outputs: docs=, heavy=, server=, image=, net= (true/false)
// Feed it both sides of a rename (git diff --no-renames): a file moving out of docs is a code change.
//
// Which code jobs a code diff needs: `server` (server/test) and `net` (dev/peer-test) run when a file in their import
// closure changed, the image build and boot when the server image's paths (dev/server-build.ts) did. A test cannot be
// affected by a file outside its import closure. The walk is a regex over the source, comments and type imports
// included, so it over-reaches rather than misses; test/change-class.test.ts checks it against the parsed imports and
// fails on a load it cannot follow. Files a walk cannot see (packages, Node's version, the job and this classifier)
// are in each job's fallback list. This runs in CI's `changes` job before `npm ci`, so it uses no packages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVER_IMAGE_PATHS } from '../server-build.ts';

// Code bundles or tests read these directories, whatever the extension: atlas/main.ts bundles docs/atlas/ (its
// changes.md included), the greybox and sickle backdrop import docs/world/map-prototypes.html, and tests read both.
// test/ fixtures and public/ (copied into the site as is) are never prose. .github/ is CI itself.
const READ_BY_CODE = /^(?:docs\/(?:atlas|world)|test|server\/test|public|\.github)\//;
const IMAGE = /^docs\/.+\.(?:png|jpe?g|gif|webp|svg)$/;

/** True for a path no build, bundle or test reads apart from the docs checks. test/change-class.test.ts keeps it so. */
export function isDocs(file: string): boolean {
  const f = file.replace(/^\.\//, '');
  if (!f || f.startsWith('/') || f.split('/').includes('..') || READ_BY_CODE.test(f)) return false;
  return f.endsWith('.md') || IMAGE.test(f);
}

export function changeClass(files: readonly string[]): 'docs' | 'code' {
  return files.length > 0 && files.every(isDocs) ? 'docs' : 'code';
}

const ROOT = path.resolve(import.meta.dirname, '../..');

// Relative specifiers a file may load: static and dynamic imports, re-exports, side-effect imports and
// `new URL('…', import.meta.url)` (workers, forks, files read by URL). A directory URL (`../seeds/`) is not a module.
const LOADS = /(?:\bfrom\s*|\bimport\s*\(?\s*|\bnew\s+URL\s*\(\s*)(['"`])(\.{1,2}\/[^'"`$]*?)(?:\?[\w&=]*)?\1/g;
export function relativeLoads(source: string): string[] {
  return [...source.matchAll(LOADS)].map((m) => m[2]!).filter((s) => !s.endsWith('/'));
}

/** Every repo file (relative, posix) the roots reach through relative loads, the roots included. */
export function importClosure(roots: readonly string[], root = ROOT): Set<string> {
  const seen = new Set<string>();
  const queue = [...roots];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file) || !fs.existsSync(path.join(root, file))) continue;
    seen.add(file);
    if (!/\.[mc]?[jt]s$/.test(file)) continue;
    const dir = path.posix.dirname(file);
    for (const spec of relativeLoads(fs.readFileSync(path.join(root, file), 'utf8')))
      queue.push(path.posix.normalize(path.posix.join(dir, spec)));
  }
  return seen;
}

function filesUnder(dir: string, root = ROOT): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return (fs.readdirSync(abs, { recursive: true, withFileTypes: true }) as fs.Dirent[])
    .filter((d) => d.isFile())
    .map((d) => path.posix.join(path.relative(root, d.parentPath).split(path.sep).join('/'), d.name));
}

// What every job also depends on and no import shows: packages, Node's version, the job definitions, this classifier.
const SHARED_FALLBACK = ['package.json', 'package-lock.json', '.nvmrc', '.github/workflows/ci.yml', 'dev/ci/'];
/** Per job: the directory whose files are its roots, and the paths a walk cannot see. A path ending in / is a prefix. */
export const JOBS = {
  // server/ whole: its package files, fixtures read from disk, the Dockerfile.
  server: { roots: 'server/test', fallback: [...SHARED_FALLBACK, 'server/'] },
  // esbuild bundles ws-page.ts by name and reads tsconfig.json; playwright's browser comes from the lock.
  net: {
    roots: 'dev/peer-test',
    fallback: [
      ...SHARED_FALLBACK,
      'dev/peer-test/',
      'tsconfig.json',
      'server/package.json',
      'server/package-lock.json',
    ],
  },
} as const;
// The image build and boot: what the image carries and how it is booted.
const IMAGE_PATHS = [...SERVER_IMAGE_PATHS, 'server/Dockerfile', 'scripts/server-boot-check.sh', ...SHARED_FALLBACK];

const under = (entry: string, file: string) =>
  entry.endsWith('/') ? file.startsWith(entry) : file === entry || file.startsWith(`${entry}/`);

export function jobClosure(job: keyof typeof JOBS, root = ROOT): Set<string> {
  return importClosure(filesUnder(JOBS[job].roots, root), root);
}

/** Which code jobs a diff needs. Docs-only and empty diffs never get here (CI runs everything for an empty one). */
export function codeJobs(files: readonly string[], root = ROOT): { server: boolean; image: boolean; net: boolean } {
  const hits = (job: keyof typeof JOBS) => {
    const closure = jobClosure(job, root);
    return files.some((f) => closure.has(f) || JOBS[job].fallback.some((e) => under(e, f)));
  };
  return {
    server: hits('server'),
    image: files.some((f) => IMAGE_PATHS.some((e) => under(e, f))),
    net: hits('net'),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = fs
    .readFileSync(0, 'utf8')
    .split(/[\0\n]/)
    .map((f) => f.trim())
    .filter(Boolean);
  if (process.argv.includes('--code')) {
    for (const f of files) if (!isDocs(f)) console.log(f);
  } else if (process.argv.includes('--jobs')) {
    // An empty diff (or one CI could not compute) is code with every job, as before.
    const docs = files.length > 0 && changeClass(files) === 'docs';
    const jobs = docs ? { server: false, image: false, net: false } : files.length ? codeJobs(files) : null;
    const out = {
      docs,
      heavy: !docs,
      server: jobs?.server ?? true,
      image: jobs?.image ?? true,
      net: jobs?.net ?? true,
    };
    for (const [k, v] of Object.entries(out)) console.log(`${k}=${v}`);
  } else console.log(changeClass(files));
}
