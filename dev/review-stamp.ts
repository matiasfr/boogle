// npm run review-stamp -- <worktree> [--id] [--files] [--no-fetch] [--base <ref>]
// Which files of a branch need an independent review, and the fingerprint that review names (owner, 28 November,
// docs/decisions-process.md#d-2026-11-28-faster-reviews and #d-2026-11-28-process-audit-six-fixes):
// - Always `review`: files that can directly desync players or lose saves (`server/src/`, `src/net/`, and wire, sync,
//   replication, namespace or rule-registration files under `src/world/`).
// - Conditionally `review`: `src/sim/`, `src/ecs/` and other `src/world/` source files when the branch also alters
//   `WORLD_NS`, a golden/fixture, wire/save/server code, or a review-path test assertion; otherwise `read` (a pure
//   query or refactor with goldens and WORLD_NS unchanged — the orchestrator reads it and ships with --orchestrator-read).
// - Review-path tests: `read` when the diff only touches import bindings (same module), comments, `{ timeout }` options,
//   a removed skip or lines moved verbatim between test files; `review` on any other assertion change or added skip.
// The stamp: `git patch-id --stable` of the branch's diff from its merge base with origin/main, restricted to the files
// the gate classed (`review` and `read`) when any needs review, first 12 hex. Line numbers are not part of a patch id, so rebasing onto main commits that touch other
// files keeps it; any change to those files' diff (a fix pushed after the review) changes it. Prints each file with the
// rule that fired and the stamp; --id prints the stamp alone (empty when nothing needs review); --files prints one
// `review <file>: <rule>` or `read <file>: <rule>` line per file, for dev/ship-queue.sh, which recomputes the stamp and
// refuses a --reviewed note that does not start with it.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importClosure, isDocs, relativeLoads } from './ci/change-class.ts';

/** Lockstep, wire and server source: the one review list (dev/ci/unit-select.ts and dev/ship-queue.sh read it here). */
export const REVIEW_PATHS = ['src/sim', 'src/net', 'src/world', 'src/ecs', 'server/src'] as const;

const underReview = (f: string) => REVIEW_PATHS.some((p) => f === p || f.startsWith(`${p}/`));
/** Files that can directly desync players or lose saves: always require an independent review. */
const alwaysReviewSource = (f: string) =>
  f === 'server/src' ||
  f.startsWith('server/src/') ||
  f === 'src/net' ||
  f.startsWith('src/net/') ||
  f.startsWith('src/world/rules/') ||
  /^src\/world\/(?:namespace|railway-namespace|railway-wire|sync|server-ops|railway-server|game-world|.*replicate.*)\.ts$/.test(
    f,
  );
const isGoldenOrFixture = (f: string) => f.startsWith('test/fixtures/');
// Tests and the harnesses that assert: unit tests and their helpers, the server tests, the net test.
const isTest = (f: string) => /(?:^|\/)test\/|\.test\.ts$/.test(f) || f.startsWith('dev/peer-test/');

export type FileChange = { file: string; patch: string; text: string };
export type Verdict = { file: string; review: boolean; rule: string };

// A test file is a sim, net or server test when it lives with the server or net tests or under a review path, is a
// shared test helper or fixture (what they assert with: test/helpers/fuzz.ts sets every sweep's stride), or reaches a
// review-path file through its imports (test/railway-set-down.test.ts through test/helpers/rail.ts). `root` is the
// checkout the imports are walked in; without it only the file's own loads count.
function assertsReviewCode(c: FileChange, root?: string): boolean {
  if (underReview(c.file) || /^(?:server\/|dev\/peer-test\/|test\/(?:helpers|fixtures)\/)/.test(c.file)) return true;
  const dir = path.posix.dirname(c.file);
  const targets = relativeLoads(c.text).map((s) => path.posix.normalize(path.posix.join(dir, s)));
  if (targets.some(underReview)) return true;
  return root !== undefined && [...importClosure(targets, root)].some(underReview);
}

// A skip: a `{ skip: … }` / `{ todo: … }` option on a test, or a `t.skip()` / `t.todo()` / `test.skip(` call. Only
// removing one is ignorable; adding one turns coverage off, which is a review.
const SKIP_OPTION = /\{\s*(?:skip|todo)\s*:[^{}]*\}\s*,\s*/g;
const SKIP_CALL = /^(?:t|test|it|describe)\.(?:skip|todo)\s*\(/;
const unskipped = (line: string) => line.replace(SKIP_OPTION, '');
// A numeric `{ timeout: N }, ` test option: adding, raising or removing one alone is `read`, not `review`.
const TIMEOUT_OPTION = /\{\s*timeout\s*:\s*[\d_]+\s*\}\s*,\s*/g;
const withoutTimeout = (line: string) => line.replace(TIMEOUT_OPTION, '');
const IGNORED: [RegExp, string][] = [
  [/^$/, 'blank'],
  [/^(?:\/\/|\/\*|\*)/, 'comment'],
];
const IMPORT = /^(?:import\b|export\b.*\bfrom\s*['"]|\}\s*from\s*['"])/;
const importTarget = (line: string) => /['"]([^'"]+)['"]\s*(?:with\s*\{[^}]*\})?;?\s*$/.exec(line)?.[1] ?? line;

function changedLines(patch: string): { sign: '+' | '-'; line: string }[] {
  const out: { sign: '+' | '-'; line: string }[] = [];
  for (const l of patch.split('\n')) {
    if (/^(?:\+\+\+|---) /.test(l)) continue;
    if (l[0] === '+' || l[0] === '-') out.push({ sign: l[0], line: l.slice(1).trim() });
  }
  return out;
}

// What a test file's diff does beyond imports, comments, timeout options, removed skips and verbatim moves, or undefined.
function assertionChange(c: FileChange, pool: Record<'+' | '-', Map<string, number>>, kinds: Set<string>) {
  const left: { sign: '+' | '-'; line: string }[] = [];
  for (const { sign, line } of changedLines(c.patch)) {
    const other = sign === '+' ? '-' : '+';
    const moved = pool[other].get(line) ?? 0;
    if (moved > 0) {
      pool[other].set(line, moved - 1);
      kinds.add('moved lines');
    } else if (IGNORED.some(([re, kind]) => re.test(line) && kinds.add(kind))) continue;
    else left.push({ sign, line });
  }
  // A skip removed: the old line with its option, the new line without it (or a skip call deleted outright).
  for (const minus of left.filter((l) => l.sign === '-')) {
    const bare = unskipped(minus.line);
    const plus = bare !== minus.line && left.find((l) => l.sign === '+' && l.line === bare);
    if (plus || SKIP_CALL.test(minus.line)) {
      left.splice(left.indexOf(minus), 1);
      if (plus) left.splice(left.indexOf(plus), 1);
      kinds.add('skip removed');
    }
  }
  const added = left.find((l) => l.sign === '+' && (unskipped(l.line) !== l.line || SKIP_CALL.test(l.line)));
  if (added) return `adds a skip: ${added.line.slice(0, 80)}`;
  // A numeric `{ timeout: N }` option added, changed or removed on a test line without changing anything else.
  for (const minus of left.filter((l) => l.sign === '-')) {
    const baseMinus = withoutTimeout(minus.line);
    const plus = left.find(
      (l) =>
        l.sign === '+' &&
        withoutTimeout(l.line) === baseMinus &&
        (baseMinus !== minus.line || withoutTimeout(l.line) !== l.line),
    );
    if (plus) {
      left.splice(left.indexOf(minus), 1);
      left.splice(left.indexOf(plus), 1);
      kinds.add('timeout');
    }
  }
  // Imports: bindings may change, the modules they come from may not (a fake swapped in for the real server).
  const imports = left.filter((l) => IMPORT.test(l.line));
  const targets = (sign: string) =>
    imports
      .filter((l) => l.sign === sign)
      .map((l) => importTarget(l.line))
      .sort()
      .join('\n');
  if (targets('-') !== targets('+')) {
    const changed = imports.find(
      (l) =>
        !targets(l.sign === '+' ? '-' : '+')
          .split('\n')
          .includes(importTarget(l.line)),
    );
    return `an import's module changed: ${changed?.sign} ${changed?.line.slice(0, 80)}`;
  }
  if (imports.length) kinds.add('import');
  const rest = left.find((l) => !IMPORT.test(l.line));
  return rest && `${rest.sign} ${rest.line.slice(0, 80)}`;
}

/** One verdict per file under a review path or asserting on one; other files get none. */
export function reviewVerdicts(changes: readonly FileChange[], root?: string): Verdict[] {
  // Lines moved verbatim between test files cancel out (a helper moved into test/helpers/, a reordered block).
  const pool = { '+': new Map<string, number>(), '-': new Map<string, number>() };
  for (const c of changes)
    if (isTest(c.file))
      for (const { sign, line } of changedLines(c.patch)) pool[sign].set(line, (pool[sign].get(line) ?? 0) + 1);
  const testVerdicts = new Map<FileChange, Verdict>();
  let touchesRiskyCompanion = false;
  for (const c of changes) {
    if (isDocs(c.file)) continue;
    if (!isTest(c.file)) {
      if (alwaysReviewSource(c.file)) touchesRiskyCompanion = true;
      continue;
    }
    if (!assertsReviewCode(c, root)) continue;
    let v: Verdict;
    if (/^--- \/dev\/null$/m.test(c.patch))
      v = { file: c.file, review: true, rule: 'a new test file (new assertions)' };
    else if (/^\+\+\+ \/dev\/null$/m.test(c.patch))
      v = { file: c.file, review: true, rule: 'a deleted test file (assertions removed)' };
    else {
      const kinds = new Set<string>();
      const fired = assertionChange(c, pool, kinds);
      v = fired
        ? { file: c.file, review: true, rule: `assertion change (first: ${fired})` }
        : { file: c.file, review: false, rule: `tests only: ${[...kinds].sort().join(', ') || 'mode change'}` };
    }
    testVerdicts.set(c, v);
    if (v.review || isGoldenOrFixture(c.file)) touchesRiskyCompanion = true;
  }
  const out: Verdict[] = [];
  for (const c of changes) {
    if (isDocs(c.file)) continue;
    if (isTest(c.file)) {
      const v = testVerdicts.get(c);
      if (v) out.push(v);
      continue;
    }
    if (!underReview(c.file)) continue;
    if (alwaysReviewSource(c.file))
      out.push({ file: c.file, review: true, rule: 'source or wire under a desync/save-loss review path' });
    else if (touchesRiskyCompanion)
      out.push({
        file: c.file,
        review: true,
        rule: 'source under a review path (paired with wire, save, golden or assertion change)',
      });
    else
      out.push({
        file: c.file,
        review: false,
        rule: 'query or refactor under a review path (goldens, WORLD_NS and wire/save paths unchanged)',
      });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const wt = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--base');
  if (!wt) {
    console.error('usage: npm run review-stamp -- <worktree> [--id] [--files] [--no-fetch] [--base <ref>]');
    process.exit(1);
  }
  const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/main';
  if (!base) throw new Error('--base needs a ref');
  const git = (a: string[], input?: string) =>
    execFileSync('git', ['-C', wt, ...a], { encoding: 'utf8', input, maxBuffer: 256 << 20, stdio: 'pipe' });

  if (!args.includes('--no-fetch')) git(['fetch', '-q', 'origin']);
  const range = `${base}...HEAD`;
  const files = git(['diff', '--no-renames', '--name-only', range]).split('\n').filter(Boolean);
  const show = (f: string) => {
    try {
      return git(['show', `HEAD:${f}`]);
    } catch {
      return git(['show', `${base}:${f}`]); // deleted on the branch: what it loaded before
    }
  };
  const changes = files
    .filter((f) => !isDocs(f) && (underReview(f) || isTest(f)))
    .map((file) => ({
      file,
      patch: git(['diff', '--no-renames', '--no-color', '-U0', range, '--', file]),
      text: show(file),
    }));
  const verdicts = reviewVerdicts(changes, path.resolve(wt));
  const review = verdicts.filter((v) => v.review).map((v) => v.file);
  // Once anything needs review, the stamp covers every file the gate classed, `read` ones too: a skip or import added
  // to a test after the review changes the stamp, and nothing rides along unread.
  const stamped = review.length ? verdicts.map((v) => v.file) : [];
  const diff = stamped.length ? git(['diff', '--no-color', '--no-ext-diff', '--binary', range, '--', ...stamped]) : '';
  // A diff of mode changes alone has no patch id; hash its text so a reviewed change never goes unstamped.
  const id = diff && (git(['patch-id', '--stable'], diff).trim() || createHash('sha1').update(diff).digest('hex'));
  const stamp = id ? id.slice(0, 12) : '';

  if (args.includes('--id')) {
    if (stamp) console.log(stamp);
  } else if (args.includes('--files')) {
    for (const v of verdicts) console.log(`${v.review ? 'review' : 'read'} ${v.file}: ${v.rule}`);
  } else {
    for (const v of verdicts) console.log(`  ${v.review ? 'review' : 'read  '} ${v.file}: ${v.rule}`);
    if (stamp) {
      console.log(`review stamp ${stamp} (${stamped.length} file${stamped.length === 1 ? '' : 's'} since ${base}).`);
      console.log(`Ship with: npm run ship-queue -- ${wt} --reviewed "${stamp} <who, what they found>"`);
    } else if (verdicts.length) {
      console.log(
        'No independent review needed (read-only / refactor / timeout-only). The orchestrator reads and ships with',
      );
      console.log(`  npm run ship-queue -- ${wt} --orchestrator-read "<what changed>"`);
    } else
      console.log(`Nothing under ${REVIEW_PATHS.join(', ')} or their tests since ${base}: no review stamp needed.`);
  }
}
