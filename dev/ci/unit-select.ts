// Which unit tests a ship's CI runs (docs/plans/ci-diet.md, Batch 2). Paths come on stdin, NUL- or newline-separated, as
// for dev/ci/change-class.ts:
//   node dev/ci/unit-select.ts   prints CI's outputs: unit_full=, unit_shards=, unit_only= (space-separated test files)
//
// Either the FULL suite (all four shards, the audit on, every offset and seed: `test:unit -- --ci`) or the SELECTION
// (one job, `test:unit -- --ship`): the tests whose import closure holds a changed file, plus the always-on core.
// A ship takes the full suite when the owner's call says so (lockstep and review-path ships "keep the unit suite for
// now", 11 November) or when a change can reach any test without an import showing it. Main, an empty diff and a
// deleted file are full too. A test reached only dynamically or by a file read outside the core is proven by main's CI
// a few minutes after the merge; that is the plan's accepted cost for ships that touch neither lockstep nor review paths.
// Runs in CI's `changes` job before `npm ci`: Node only, no packages.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importClosure } from './change-class.ts';
import { REVIEW_PATHS } from '../review-stamp.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');

/** Light tests that read source, docs or tool files rather than import them, so no closure shows what they depend on.
 * Each runs in about a second or less (measured 11 November, one file at a time); a ship always runs them. */
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
] as const;

/** A change here may reach any test: the full suite. A prefix when it ends in /, else the file or a name that starts with it. */
export const FULL_ON = [
  ...REVIEW_PATHS.map((p) => `${p}/`),
  'test/helpers/',
  'test/fixtures/',
  'dev/ci/',
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

export type UnitPlan = { full: true; why: string } | { full: false; tests: string[] };

/** The unit run a diff needs. `files` are repo-relative posix paths (both sides of a rename); `root` the checkout. */
export function unitPlan(files: readonly string[], root = ROOT): UnitPlan {
  if (files.length === 0) return { full: true, why: 'empty diff' };
  const changed = new Set(files);
  for (const f of files) {
    if (isFullPath(f)) return { full: true, why: `${f}: lockstep, review path, or shared by every test` };
    if (!fs.existsSync(path.join(root, f))) return { full: true, why: `${f}: deleted or renamed` };
  }
  const all = fs
    .globSync('test/**/*.test.ts', { cwd: root })
    .map((f) => f.split(path.sep).join('/'))
    .sort();
  const hit = new Set<string>(CORE_TESTS);
  for (const test of all) {
    const closure = importClosure([test], root);
    // A test that asserts review-path code and changes is a review-path change (ci-diet.md: the conservative pick).
    if (changed.has(test) && [...closure].some(underReview))
      return { full: true, why: `${test}: asserts review-path code` };
    if ([...closure].some((f) => changed.has(f))) hit.add(test);
  }
  return { full: false, tests: [...hit].filter((t) => fs.existsSync(path.join(root, t))).sort() };
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
  console.log(`unit_shards=${plan.full ? '[1,2,3,4]' : '[1]'}`);
  console.log(`unit_only=${plan.full ? '' : plan.tests.join(' ')}`);
}
