// What others are building right now, and where it overlaps yours.
//
//   npm run inflight            lists unmerged wip/, ship/ and claude/ branches on origin from the last week with the
//                               files each touches, overlaps with this checkout's changes first
//   npm run wip -- <topic>      pushes HEAD to wip/<you>/<topic> so others see it (no CI runs on wip/; npm run ship
//                               deletes your wip branches it carries)
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...a) => {
  try {
    return git(...a);
  } catch {
    return '';
  }
};
const lines = (s) => s.split('\n').filter(Boolean);
const PREFIXES = ['wip', 'ship', 'claude'];
const WEEK = 7 * 24 * 3600;

export const who = () =>
  (tryGit('config', 'user.name') || 'someone')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20) || 'someone';

function wip(topic) {
  const slug = (topic || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new Error('usage: npm run wip -- <topic>');
  git('fetch', '-q', 'origin', 'main');
  if (!lines(git('rev-list', 'origin/main..HEAD')).length) throw new Error('no commits ahead of main to show yet');
  const branch = `wip/${who()}/${slug}`;
  // Replace, never force-push: delete the old marker, push the new one.
  if (tryGit('ls-remote', '--heads', 'origin', branch)) git('push', '-q', 'origin', '--delete', branch);
  git('push', '-q', 'origin', `HEAD:refs/heads/${branch}`);
  console.log(`wip: ${branch} shows your work in npm run inflight; npm run ship removes it.`);
}

function inflight() {
  git(
    'fetch',
    '-q',
    '--prune',
    'origin',
    'main',
    ...PREFIXES.map((p) => `+refs/heads/${p}/*:refs/remotes/origin/${p}/*`),
  );
  const mine = new Set([
    ...lines(tryGit('diff', '--name-only', 'origin/main...HEAD')),
    ...lines(tryGit('diff', '--name-only', 'HEAD')),
  ]);
  const me = tryGit('rev-parse', 'HEAD');
  const now = Date.now() / 1000;
  const refs = lines(
    git(
      'for-each-ref',
      '--format=%(refname:short)\t%(committerdate:unix)\t%(authorname)',
      ...PREFIXES.map((p) => `refs/remotes/origin/${p}/`),
    ),
  );
  const rows = [];
  for (const ref of refs) {
    const [name, at, author] = ref.split('\t');
    if (now - Number(at) > WEEK) continue;
    const tip = git('rev-parse', name);
    if (tip === me || isAncestor(tip, 'origin/main')) continue;
    if (isAncestor(tip, 'HEAD')) continue; // already in this checkout
    const files = lines(git('diff', '--name-only', `origin/main...${tip}`));
    if (!files.length || landed(tip, files)) continue;
    rows.push({
      name: name.replace(/^origin\//, ''),
      author,
      at: Number(at),
      files,
      overlap: files.filter((f) => mine.has(f)),
    });
  }
  rows.sort((a, b) => b.overlap.length - a.overlap.length || b.at - a.at);
  if (!rows.length) return console.log('inflight: nothing unmerged on wip/, ship/ or claude/ this week.');
  for (const r of rows) {
    const age = Math.round((now - r.at) / 3600);
    console.log(`${r.overlap.length ? '!' : ' '} ${r.name}  (${r.author}, ${age} h ago, ${r.files.length} files)`);
    const show = r.overlap.length ? r.overlap : r.files.slice(0, 6);
    for (const f of show) console.log(`    ${r.overlap.length ? 'also yours: ' : ''}${f}`);
    if (!r.overlap.length && r.files.length > show.length) console.log(`    ... ${r.files.length - show.length} more`);
  }
  const n = rows.filter((r) => r.overlap.length).length;
  if (n) console.log(`\ninflight: ${n} branch(es) touch files you changed (!). Coordinate, or keep your edits apart.`);
}

// Already on main under other hashes: every commit has an equal patch there (a rebased ship/), or main has the
// branch's files exactly as the branch left them (a squash-merged claude/ PR).
function landed(tip, files) {
  if (!lines(git('cherry', 'origin/main', tip)).some((l) => l.startsWith('+'))) return true;
  try {
    execFileSync('git', ['diff', '--quiet', tip, 'origin/main', '--', ...files], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isAncestor(a, b) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', a, b], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

try {
  if (process.argv[2] === 'wip') wip(process.argv.slice(3).join(' '));
  else inflight();
} catch (e) {
  console.error(e.stderr?.toString().trim() || e.message);
  process.exit(1);
}
