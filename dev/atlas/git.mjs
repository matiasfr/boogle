// Git helpers for the atlas tools, with no dependencies so `npm run atlas -- --gate` runs before `npm ci`:
// one git wrapper, the "since" ref the upkeep reads from, and the gate that decides whether the upkeep runs at all.
import { execFileSync } from 'node:child_process';

// Runs git in `root` and returns its trimmed output. Throws when git fails.
export function git(root, ...args) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

// The ref the upkeep reads from: the last commit that touched docs/atlas/, else HEAD~20, else the first commit.
export function sinceRef(root) {
  let ref = '';
  try {
    ref = git(root, 'log', '-1', '--format=%H', '--', 'docs/atlas/');
  } catch {
    // Not a git checkout with history: fall through.
  }
  if (ref) return ref;
  try {
    return git(root, 'rev-parse', 'HEAD~20');
  } catch {
    return git(root, 'rev-list', '--max-parents=0', 'HEAD').split('\n').pop();
  }
}

// The only paths whose changes make a non-scheduled event worth a run (the daily run reads everything).
const SYNC_PATHS = ['src/world/rules', 'src/net', 'src/netplay', 'server'];

// -> { last, go, why }. go is false when no src/ or server/ commit landed since `last` (citations only break through
// those), and, for any event but the daily `schedule`, unless a sync path changed or a src/features file was added
// or removed. Plain `git diff`, so it needs no install.
export function gate(root, last, event) {
  const lines = (...a) =>
    git(root, ...a)
      .split('\n')
      .filter(Boolean);
  const range = `${last}..HEAD`;
  if (git(root, 'rev-list', '--count', range, '--', 'src', 'server') === '0')
    return { last, go: false, why: 'No src or server commits since the last atlas update; nothing to do.' };
  if (event !== 'schedule') {
    const sync = lines('diff', '--name-only', range, '--', ...SYNC_PATHS);
    const feats = lines('diff', '--name-only', '--diff-filter=AD', range, '--', 'src/features');
    if (!sync.length && !feats.length)
      return {
        last,
        go: false,
        why: 'No sync-code change or added or removed feature since the last atlas update; waiting for the daily run.',
      };
  }
  return { last, go: true, why: `Changes since ${last.slice(0, 7)} are worth a run.` };
}
