// Which unit tests a ship's CI runs (docs/plans/ci-diet.md, Batch 2). Paths come on stdin, NUL- or newline-separated, as
// for dev/ci/change-class.ts:
//   node dev/ci/unit-select.ts   prints CI's outputs: unit_full=, unit_shards=, unit_only= (space-separated test files)
//
// Either the FULL suite (eight balanced shards, the audit on, every offset and seed: `test:unit -- --ci`) or the SELECTION
// (one job, `test:unit -- --ship`): the tests whose closure holds a changed file, plus the always-on core.
// A ship takes the full suite when the owner's call says so (lockstep and review-path ships "keep the unit suite for
// now", 11 November), when the change is something review-path code loads, or when it can reach any test without a
// load showing it. Main, an empty diff and a deleted file are full too.
//
// A test's closure (createWalker) is change-class.ts's import walk plus what tests hand to something else to load: a
// repo-rooted path literal (an esbuild entry, a script spawned with --check, a source evaluated by dev/level/source.ts,
// a --import hook), a folder URL (every file under it) and import.meta.glob. A load no walk can follow is listed in
// UNFOLLOWED with what it reaches; test/unit-select.test.ts parses every test's closure and fails on one not listed.
// Runs in CI's `changes` job before `npm ci`: Node only, no packages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importClosure, relativeLoads } from './change-class.ts';
import { REVIEW_PATHS } from '../review-stamp.ts';
import { CI_UNIT_SHARDS } from './unit-shards.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const posix = (f: string) => f.split(path.sep).join('/');

/** Light tests that read source, docs or tool files rather than import them, so no closure shows what they depend on.
 * Each runs in about a second or less (measured 11 November, one file at a time; unit-select.test.ts's guard, which
 * parses every test's closure, about 2 s); a ship always runs them. */
export const CORE_TESTS = [
  'test/change-class.test.ts',
  'test/controls.test.ts',
  'test/decisions.test.ts',
  'test/device-compare.test.ts',
  'test/economy-trade.test.ts',
  'test/entity-state-node.test.ts',
  'test/greybox-works.test.ts',
  'test/lint-determinism.test.ts',
  'test/models.test.ts',
  'test/railway-census.test.ts',
  'test/railway-schema.test.ts',
  'test/railway-works-layout.test.ts',
  'test/review-m12c.test.ts',
  'test/review-stamp.test.ts',
  'test/server-image.test.ts',
  'test/world-rules.test.ts',
  'test/unit-modes.test.ts',
  'test/unit-select.test.ts',
  'test/unit-select-review.test.ts',
] as const;

/** Loads a test's closure makes that no walk can follow, keyed `<file>: <call>` as test/unit-select.test.ts's guard
 * names them. `reaches` (files, or prefixes ending in /) joins the closure of every test that reaches the file, so a
 * change there selects them; empty when the load reaches no repo file beyond what the walk already has, and `why`
 * says what covers it. `count` (default 1) is how many such sites the file has: one more, unlisted, fails the guard.
 * The guard also counts an fs read whose path is built into src/, dev/, server/, protos/ or test/fixtures and that the
 * walk does not follow, in a file a non-core test reaches (its call name: `readFileSync`, `readdir`, ...). */
export const UNFOLLOWED: Record<string, { reaches: readonly string[]; why: string; count?: number }> = {
  'test/round-grounding.test.ts: sourceModule': {
    reaches: ['src/entities/finds/secrets-view.ts'],
    why: 'executes the actual yard dressing block selected from this source-owned boundary',
  },
  'test/prefab-seats.test.ts: sourceModule': {
    reaches: ['src/entities/railway/track-machine.ts', 'src/entities/railway/train-view.ts'],
    why: 'executes the seat construction blocks selected from these source-owned boundaries',
  },
  'test/prefab-seats.test.ts: readFileSync': {
    count: 2,
    reaches: ['test/fixtures/prefab-seat-ids.json', 'test/fixtures/prefab-seat-poses.json'],
    why: 'the golden loop constructs these two fixture names; source block inputs are rooted literals already followed',
  },
  'dev/sim/hooks.ts: registerHooks': {
    reaches: [],
    why: 'expands import.meta.glob in the files it loads; the walk expands the same globs itself',
  },
  'test/helpers/rail-no-audit.ts: registerHooks': {
    reaches: ['src/sim/railway-drive.ts'],
    why: 'rewrites the audit flag in the driver as it loads (src/sim: the full suite anyway)',
  },
  'test/entity-state-node.test.ts: import': {
    reaches: ['src/entities/'],
    why: "imports every entity's state.ts and headless.ts, found by listing src/entities",
  },
  'test/railway-census.test.ts: import': {
    reaches: ['src/sim/'],
    why: 'imports each file in src/sim through the folder URL the walk follows (src/sim: the full suite anyway)',
  },
  'test/unit-modes.test.ts: new URL': {
    reaches: ['src/sim/railway-drive.ts', 'test/helpers/rail-no-audit.ts'],
    why: 'its url() helper resolves the probe modules it runs and the preload it passes to --import (src/sim: the full suite anyway; a core test)',
  },
  'test/lint-determinism.test.ts: new URL': {
    reaches: [],
    why: "checks that each of dev/lint/policy.ts's lockstep files exists; reads none of them (a core test)",
  },
  'dev/registry/debt.ts: import': {
    reaches: [],
    why: 'imports DEBT_FILES[2], dev/level/allow.ts, a rooted literal in the same file that the walk follows',
  },
  'dev/peer-test/harness.ts: build': {
    reaches: ['dev/peer-test/'],
    why: 'bundles dev/peer-test/<entry> for the net job; only core tests reach it, by naming it',
  },
  'dev/peer-test/worker-source.ts: registerHooks': {
    reaches: [],
    why: 'redirects src/ to a worker tree for the net job (change-class.test.ts lists it too); no unit test runs it',
  },
  'dev/peer-test/node-player.ts: build': { reaches: [], why: 'bundles a dev/peer-test entry for the net job' },
  'dev/peer-test/node-player.ts: import': { reaches: [], why: 'imports the bundle it just built, for the net job' },
  'test/unit-modes.test.ts: spawnSync': {
    reaches: [],
    why: 'runs probe modules written inline, which load what its url() entry lists (its second spawn names its preload, which the walk follows)',
  },
  'dev/look/lib.ts: spawn': {
    count: 2,
    reaches: [],
    why: 'run(cmd, args) runs ffmpeg; the look server runs vite from node_modules; only core tests reach it, by name',
  },
  'dev/lint/runner.ts: spawnSync': {
    reaches: [],
    why: 'runs the oxlint package (package-lock.json is full) over the files its caller passes',
  },
  'dev/migrate/rail-mutants.ts: spawnSync': {
    reaches: [],
    why: 'runs the test files its caller names; railway-lint-review passes a probe written to a temp dir',
  },
  'dev/test-unit.ts: spawnSync': { reaches: [], why: 'runs the unit suite itself (in FULL_ON)' },
  'dev/node-version.ts: spawnSync': {
    reaches: [],
    why: 're-runs the current script under the pinned Node (in FULL_ON)',
  },
};

/** A change here may reach any test: the full suite. A prefix when it ends in /, else the file or a name that starts with it. */
export const FULL_ON: readonly string[] = [
  ...REVIEW_PATHS.map((p) => `${p}/`),
  'test/helpers/',
  'test/fixtures/',
  'dev/ci/',
  // The selector decides its own run: whatever it loads (REVIEW_PATHS from dev/review-stamp.ts, change-class.ts's
  // server image paths) is computed, not listed, so a new import cannot slip out.
  ...[...importClosure([posix(path.relative(ROOT, fileURLToPath(import.meta.url)))], ROOT)].sort(),
  'dev/test-env.ts',
  'dev/test-unit.ts',
  'dev/node-version.ts',
  'package.json',
  'package-lock.json',
  '.nvmrc',
  'tsconfig',
  'vite.config',
  '.github/workflows/ci.yml',
];
const isFullPath = (f: string) => FULL_ON.some((e) => (e.endsWith('/') ? f.startsWith(e) : f === e || f.startsWith(e)));
const underReview = (f: string) => REVIEW_PATHS.some((p) => f === p || f.startsWith(`${p}/`));

/** Files under a directory below the root (never the root itself or above it, never node_modules). */
function filesUnder(dir: string, root: string): string[] {
  const rel = path.posix.normalize(dir).replace(/\/$/, '');
  if (rel === '.' || rel === '' || rel.startsWith('..')) return [];
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return [];
  return (fs.readdirSync(abs, { recursive: true, withFileTypes: true }) as fs.Dirent[])
    .filter((d) => d.isFile())
    .map((d) => path.posix.join(posix(path.relative(root, d.parentPath)), d.name))
    .filter((f) => !f.split('/').includes('node_modules'));
}

// A path from the checkout's root, as tests and tools hand them on (cwd is the root): 'src/boot/sw-worker.ts',
// './dev/sim/hooks.ts'. Only an existing file under a top-level directory counts.
const ROOTED = /(['"`])(?:\.\/)?([A-Za-z][\w.-]*\/[^'"`$\s*?]*[^'"`$\s*?/])\1/g;
// Files whose rooted strings name paths as data (lint scopes), never a load; the guard holds any load site in them to
// the same rule, so a load added here still fails it.
const NAMES_ONLY: readonly string[] = ['dev/lint/policy.ts'];
// A folder URL (`new URL('../src/entities/railway/', import.meta.url)`), or a computed one with a literal folder
// (`new URL(`../src/entities/railway/${f}.ts`, …)`): the code reads that folder, so every file in it. One that names
// the root or above is a base for rooted paths (ROOTED follows those), not a folder anything reads whole.
const DIR_URL = /\bnew\s+URL\s*\(\s*(?:(['"`])(\.{1,2}\/[^'"`$]*\/)\1|`(\.{1,2}\/[^`$]*\/)[^`/$]*\$\{)/g;
// import.meta.glob('<pattern>') or (['<pattern>', '!<excluded>']), expanded by Vite and by dev/sim/hooks.ts; a leading /
// is the root. Exclusions are ignored: a wider closure only selects more.
const GLOB = /import\.meta\.glob(?:<[^(]*>)?\(\s*(\[[^\]]*\]|(['"`])[^'"`$]+\2)/g;
const QUOTED = /(['"`])([^'"`$]+)\1/g;

/** A walker over test closures for one checkout; it caches each file's direct loads, so many closures cost one read. */
export function createWalker(root = ROOT) {
  const top = new Set(
    fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== 'node_modules')
      .map((d) => d.name),
  );
  const unfollowed = new Map<string, string[]>();
  for (const [key, { reaches }] of Object.entries(UNFOLLOWED)) {
    const file = key.slice(0, key.indexOf(': '));
    unfollowed.set(file, [...(unfollowed.get(file) ?? []), ...reaches]);
  }
  const files = new Map<string, boolean>();
  const isFile = (f: string) => {
    let yes = files.get(f);
    if (yes === undefined) {
      const abs = path.join(root, f);
      files.set(f, (yes = fs.existsSync(abs) && fs.statSync(abs).isFile()));
    }
    return yes;
  };
  const edges = new Map<string, string[]>();
  /** The files one file loads directly (the files it names that exist). */
  function loads(file: string): string[] {
    let out = edges.get(file);
    if (out) return out;
    out = [];
    if (/\.[mc]?[jt]s$/.test(file)) {
      const src = fs.readFileSync(path.join(root, file), 'utf8');
      const dir = path.posix.dirname(file);
      for (const spec of relativeLoads(src)) out.push(path.posix.normalize(path.posix.join(dir, spec)));
      for (const m of NAMES_ONLY.includes(file) ? [] : src.matchAll(ROOTED)) {
        const f = m[2]!;
        if (top.has(f.slice(0, f.indexOf('/'))) && isFile(f)) out.push(f);
      }
      for (const m of src.matchAll(DIR_URL)) out.push(...filesUnder(path.posix.join(dir, (m[2] ?? m[3])!), root));
      for (const m of src.matchAll(GLOB))
        for (const [, , pattern] of m[1]!.matchAll(QUOTED)) {
          if (pattern!.startsWith('!')) continue;
          const base = pattern!.startsWith('/') ? '' : dir;
          for (const f of fs.globSync(pattern!.replace(/^\//, ''), { cwd: path.join(root, base) }))
            out.push(path.posix.normalize(path.posix.join(base, posix(f))));
        }
    }
    for (const r of unfollowed.get(file) ?? []) out.push(...(r.endsWith('/') ? filesUnder(r, root) : [r]));
    edges.set(file, (out = out.filter(isFile)));
    return out;
  }
  /** Every repo file the roots reach, the roots included. */
  function closure(roots: readonly string[]): Set<string> {
    const seen = new Set<string>();
    const queue = [...roots];
    while (queue.length > 0) {
      const file = queue.pop()!;
      if (seen.has(file) || !isFile(file)) continue;
      seen.add(file);
      queue.push(...loads(file));
    }
    return seen;
  }
  return { closure, isFile, loads };
}

/** Every unit test file, repo-relative posix, sorted. */
export function unitTests(root = ROOT): string[] {
  return fs.globSync('test/**/*.test.ts', { cwd: root }).map(posix).sort();
}

/** What review-path code loads from outside REVIEW_PATHS (src/constants.ts, protos/review-types.ts): a change there is
 * a change to what lockstep and the server run, so the full suite. */
function reviewClosure(root = ROOT, walker = createWalker(root)): Set<string> {
  return walker.closure(REVIEW_PATHS.flatMap((p) => filesUnder(p, root)));
}

/** Tests whose closure holds a changed file, plus CORE_TESTS (what still exists of them). For ship-check too. */
export function affectedTests(files: readonly string[], root = ROOT, walker = createWalker(root)): string[] {
  const changed = new Set(files);
  const hit = new Set<string>(CORE_TESTS);
  for (const test of unitTests(root)) if ([...walker.closure([test])].some((f) => changed.has(f))) hit.add(test);
  return [...hit].filter(walker.isFile).sort();
}

export type UnitPlan = { full: true; why: string } | { full: false; tests: string[] };

/** The unit run a diff needs. `files` are repo-relative posix paths (both sides of a rename); `root` the checkout. */
export function unitPlan(files: readonly string[], root = ROOT): UnitPlan {
  if (files.length === 0) return { full: true, why: 'empty diff' };
  for (const f of files) {
    if (isFullPath(f)) return { full: true, why: `${f}: lockstep, review path, the selector, or shared by every test` };
    if (!fs.existsSync(path.join(root, f))) return { full: true, why: `${f}: deleted or renamed` };
  }
  const walker = createWalker(root);
  const review = reviewClosure(root, walker);
  for (const f of files) if (review.has(f)) return { full: true, why: `${f}: loaded by review-path code` };
  // A test that asserts review-path code and changes is a review-path change (ci-diet.md: the conservative pick).
  for (const f of files)
    if (/^test\/.*\.test\.ts$/.test(f) && [...walker.closure([f])].some(underReview))
      return { full: true, why: `${f}: asserts review-path code` };
  return { full: false, tests: affectedTests(files, root, walker) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = fs
    .readFileSync(0, 'utf8')
    .split(/[\0\n]/)
    .map((f) => f.trim())
    .filter(Boolean);
  const plan = unitPlan(files);
  if (plan.full) console.error(`unit-select: full suite (${plan.why})`);
  console.log(`unit_full=${plan.full}`);
  console.log(
    `unit_shards=${JSON.stringify(plan.full ? Array.from({ length: CI_UNIT_SHARDS }, (_, i) => i + 1) : [1])}`,
  );
  console.log(`unit_only=${plan.full ? '' : plan.tests.join(' ')}`);
}
