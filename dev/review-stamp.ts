// npm run review-stamp -- <worktree> [--id] [--files] [--no-fetch] [--base <ref>]
// Which files of a branch need an independent review, and the fingerprint that review names. The trigger is the one list
// below (owner-calls.md, "Build more, test less", rule (c), plus src/ecs): source and wire files under REVIEW_PATHS, and
// a sim, net or server test whose assertions changed. A test or test helper whose diff only touches imports, skip
// conditions, comments or lines moved verbatim (within the branch) is the orchestrator's to read instead. Anything the
// diff cannot cheaply show as one of those counts as an assertion change: review.
// The stamp: `git patch-id --stable` of the branch's diff from its merge base with origin/main, restricted to the files
// that need review, first 12 hex. Line numbers are not part of a patch id, so rebasing onto main commits that touch other
// files keeps it; any change to those files' diff (a fix pushed after the review) changes it. Prints each file with the
// rule that fired and the stamp; --id prints the stamp alone (empty when nothing needs review); --files prints one
// `review <file>: <rule>` or `read <file>: <rule>` line per file, for dev/ship-queue.sh, which recomputes the stamp and
// refuses a --reviewed note that does not start with it.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDocs, relativeLoads } from './ci/change-class.ts';

/** Lockstep, wire and server source: the one review list (dev/ship-queue.sh reads it through this file). */
export const REVIEW_PATHS = ['src/sim', 'src/net', 'src/world', 'src/ecs', 'server/src'] as const;

const underReview = (f: string) => REVIEW_PATHS.some((p) => f === p || f.startsWith(`${p}/`));
// Tests and the harnesses that assert: unit tests and their helpers, the server tests, the net test.
const isTest = (f: string) => /(?:^|\/)test\/|\.test\.ts$/.test(f) || f.startsWith('dev/peer-test/');

export type FileChange = { file: string; patch: string; text: string };
export type Verdict = { file: string; review: boolean; rule: string };

// A test file is a sim, net or server test when it lives with the server or net tests, under a review path, or loads a
// review-path file itself.
function assertsReviewCode(c: FileChange): boolean {
  if (underReview(c.file) || c.file.startsWith('server/') || c.file.startsWith('dev/peer-test/')) return true;
  const dir = path.posix.dirname(c.file);
  return relativeLoads(c.text).some((s) => underReview(path.posix.normalize(path.posix.join(dir, s))));
}

// `{ skip: … }` or `{ todo: … }` options, so a test whose only change is gaining or losing one compares equal.
const SKIP_OPTION = /\{\s*(?:skip|todo)\s*:[^{}]*\}\s*,\s*/g;
const normal = (line: string) => line.replace(SKIP_OPTION, '').trim();
const IGNORED: [RegExp, string][] = [
  [/^$/, 'blank'],
  [/^(?:\/\/|\/\*|\*)/, 'comment'],
  [/^(?:import\b|export\b.*\bfrom\s*['"]|\}\s*from\s*['"])/, 'import'],
  [/\b(?:skip|todo)\s*[:(]|\.(?:skip|todo)\b/, 'skip condition'],
];

function changedLines(patch: string): { sign: '+' | '-'; line: string }[] {
  const out: { sign: '+' | '-'; line: string }[] = [];
  for (const l of patch.split('\n')) {
    if (/^(?:\+\+\+|---) /.test(l)) continue;
    if (l[0] === '+' || l[0] === '-') out.push({ sign: l[0], line: normal(l.slice(1)) });
  }
  return out;
}

/** One verdict per file under a review path or asserting on one; other files get none. */
export function reviewVerdicts(changes: readonly FileChange[]): Verdict[] {
  // Lines moved verbatim anywhere in the branch cancel out (a helper moved between files, a reordered block).
  const pool = { '+': new Map<string, number>(), '-': new Map<string, number>() };
  for (const c of changes)
    for (const { sign, line } of changedLines(c.patch)) pool[sign].set(line, (pool[sign].get(line) ?? 0) + 1);
  const out: Verdict[] = [];
  for (const c of changes) {
    if (isDocs(c.file)) continue;
    if (!isTest(c.file)) {
      if (underReview(c.file)) out.push({ file: c.file, review: true, rule: 'source or wire under a review path' });
      continue;
    }
    if (!assertsReviewCode(c)) continue;
    if (/^--- \/dev\/null$/m.test(c.patch)) {
      out.push({ file: c.file, review: true, rule: 'a new test file (new assertions)' });
      continue;
    }
    if (/^\+\+\+ \/dev\/null$/m.test(c.patch)) {
      out.push({ file: c.file, review: true, rule: 'a deleted test file (assertions removed)' });
      continue;
    }
    const kinds = new Set<string>();
    let fired: string | undefined;
    for (const { sign, line } of changedLines(c.patch)) {
      const other = sign === '+' ? '-' : '+';
      const moved = pool[other].get(line) ?? 0;
      if (moved > 0) {
        pool[other].set(line, moved - 1);
        kinds.add('moved lines');
        continue;
      }
      const ignored = IGNORED.find(([re]) => re.test(line));
      if (ignored) kinds.add(ignored[1]);
      else {
        fired = `${sign} ${line.slice(0, 80)}`;
        break;
      }
    }
    out.push(
      fired
        ? { file: c.file, review: true, rule: `assertion change (first: ${fired})` }
        : { file: c.file, review: false, rule: `tests only: ${[...kinds].sort().join(', ') || 'mode change'}` },
    );
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
  // Moves are judged across the whole branch: include every other file's patch as the pool's other side.
  const rest = files
    .filter((f) => !changes.some((c) => c.file === f) && !isDocs(f))
    .map((file) => ({ file, patch: git(['diff', '--no-renames', '--no-color', '-U0', range, '--', file]), text: '' }));
  const verdicts = reviewVerdicts([...changes, ...rest]);
  const review = verdicts.filter((v) => v.review).map((v) => v.file);
  const diff = review.length ? git(['diff', '--no-color', '--no-ext-diff', '--binary', range, '--', ...review]) : '';
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
      console.log(`review stamp ${stamp} (${review.length} file${review.length === 1 ? '' : 's'} since ${base}).`);
      console.log(`Ship with: npm run ship-queue -- ${wt} --reviewed "${stamp} <who, what they found>"`);
    } else if (verdicts.length) {
      console.log('No review needed: tests only, no assertion change. The orchestrator reads them and ships with');
      console.log(`  npm run ship-queue -- ${wt} --orchestrator-read "<what changed in them>"`);
    } else
      console.log(`Nothing under ${REVIEW_PATHS.join(', ')} or their tests since ${base}: no review stamp needed.`);
  }
}
