// What changed since the last video: `npm run video:changes [-- --since <ref>]`. Lists main's commits since the newest
// video-* tag (made by dev/video/publish.mjs) and flags the ones that touch what a player sees, so an agent can judge
// whether there's enough for a new patch video (.claude/skills/video/SKILL.md, "Patch video loop").
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const argv = process.argv.slice(2);
git('fetch', '-q', '--tags', 'origin');
const at = argv.indexOf('--since');
const since = at >= 0 ? argv[at + 1] : git('tag', '-l', 'video-*', '--sort=-creatordate').split('\n')[0];
if (!since) {
  console.log('No video-* tag yet: pass --since <ref> (a commit, tag or date like "@{2026-10-28}").');
  process.exit(2);
}
// Paths that change the game a player sees. Tooling, docs and tests don't count.
const PLAYER = /^(src\/|index\.html|public\/)/;
const log = git('log', '--no-merges', '--format=%h%x09%an%x09%s', `${since}..origin/main`);
const rows = log ? log.split('\n') : [];
console.log(`Since ${since}: ${rows.length} commits on origin/main\n`);
for (const row of rows) {
  const [hash, author, subject] = row.split('\t');
  const files = git('show', '--format=', '--name-status', hash).split('\n').filter(Boolean);
  const player = files.filter((f) => PLAYER.test(f.split('\t').at(-1)));
  const added = player.filter((f) => f.startsWith('A')).map((f) => f.split('\t').at(-1));
  const mark = player.length ? (added.length ? '+' : '*') : ' ';
  console.log(`${mark} ${hash} ${subject}  (${author})${added.length ? '\n    new: ' + added.join(', ') : ''}`);
}
console.log('\n+ adds game files   * changes game files   (blank) tooling, docs or tests only');
