// npm run review-stamp -- <worktree> [--id] [--no-fetch] [--base <ref>]
// The fingerprint an independent review names: `git patch-id --stable` of the branch's diff from its merge base with
// origin/main, restricted to the risky paths, first 12 hex. Line numbers are not part of a patch id, so rebasing onto
// main commits that touch other files keeps it; any change to a risky file's diff (a fix pushed after the review)
// changes it. Prints the stamp and the risky files; --id prints the stamp alone (empty when no risky file changed).
// dev/ship-queue.sh recomputes it and refuses a --reviewed note that does not start with it.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const riskyPaths = ['src/sim', 'src/net', 'src/world', 'server'];

const args = process.argv.slice(2);
const wt = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--base');
if (!wt) {
  console.error('usage: npm run review-stamp -- <worktree> [--id] [--no-fetch] [--base <ref>]');
  process.exit(1);
}
const base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'origin/main';
if (!base) throw new Error('--base needs a ref');
const git = (a: string[], input?: string) =>
  execFileSync('git', ['-C', wt, ...a], { encoding: 'utf8', input, maxBuffer: 256 << 20 });

if (!args.includes('--no-fetch')) git(['fetch', '-q', 'origin']);
const range = `${base}...HEAD`;
const scope = ['--', ...riskyPaths];
const files = git(['diff', '--name-only', range, ...scope])
  .split('\n')
  .filter(Boolean);
const diff = files.length ? git(['diff', '--no-color', '--no-ext-diff', '--binary', range, ...scope]) : '';
// A diff of mode changes alone has no patch id; hash its text so a risky change never goes unstamped.
const id = diff && (git(['patch-id', '--stable'], diff).trim() || createHash('sha1').update(diff).digest('hex'));
const stamp = id ? id.slice(0, 12) : '';

if (args.includes('--id')) {
  if (stamp) console.log(stamp);
} else if (!stamp) {
  console.log(`No changes under ${riskyPaths.join(', ')} since ${base}: no review stamp needed.`);
} else {
  console.log(`review stamp ${stamp} (${files.length} risky file${files.length === 1 ? '' : 's'} since ${base}):`);
  for (const f of files) console.log(`  ${f}`);
  console.log(`Ship with: npm run ship-queue -- ${wt} --reviewed "${stamp} <who, what they found>"`);
}
