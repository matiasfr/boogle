// Identify the build a worker actually tested, and snapshot a caller without touching its index or branch.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim();

export function buildAt(cwd: string) {
  const commit = git(cwd, 'rev-parse', 'HEAD');
  const dirty = !!git(cwd, 'status', '--porcelain');
  const tree = dirty ? workingTree(cwd) : git(cwd, 'rev-parse', 'HEAD^{tree}');
  return { commit, tree, dirty };
}
export type Build = ReturnType<typeof buildAt>;
export const sameBuild = (a: Build, b: Build) => a.tree === b.tree;

/** Includes tracked edits/deletions and nonignored untracked files. Never stages, stashes or commits the caller's index. */
function workingTree(cwd: string): string {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-codex-index-'));
  const env = { ...process.env, GIT_INDEX_FILE: path.join(temp, 'index') };
  const run = (...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
  try {
    const head = run('rev-parse', 'HEAD');
    run('read-tree', head);
    run('add', '-A', '--', '.');
    return run('write-tree');
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export function snapshot(cwd: string): string {
  const before = buildAt(cwd);
  if (!before.dirty) return before.commit;
  const commit = git(
    cwd,
    'commit-tree',
    before.tree,
    '-p',
    before.commit,
    '-m',
    'Snapshot caller working files for Codex',
  );
  if (!sameBuild(before, buildAt(cwd))) throw new Error('Caller changed while snapshotting; retry when edits stop');
  return commit;
}
