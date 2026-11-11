// A scratch git repository for a test, sealed off from the one the test runs in. Git hooks (pre-push runs
// dev/ship-check.ts) export GIT_DIR, GIT_WORK_TREE and friends, and those beat `git -C <dir>`: on 11 November a test's
// `git init` and `git config` in a temp dir wrote core.bare and user.* into the real repository's config, and every
// worktree broke. Everything here runs with every GIT_* variable removed, no global or system config, a ceiling at the
// temp dir's parent, author and committer from the environment (never `git config`), and refuses to go on unless the
// new repository's git dir is inside the temp dir.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** process.env without any GIT_* variable, for a process that must not see the caller's repository. */
export function withoutGit(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !k.startsWith('GIT_')));
}

export type ScratchRepo = {
  dir: string;
  /** The environment git (and any tool that runs git, given `-C dir`) must get inside this repository. */
  env: NodeJS.ProcessEnv;
  git: (...args: string[]) => string;
  write: (file: string, text: string) => void;
  remove: () => void;
};

export function scratchRepo(prefix = 'scratch-git-'): ScratchRepo {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  const env: NodeJS.ProcessEnv = {
    ...withoutGit(),
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CEILING_DIRECTORIES: path.dirname(dir),
    GIT_AUTHOR_NAME: 'scratch',
    GIT_AUTHOR_EMAIL: 'scratch@example.invalid',
    GIT_COMMITTER_NAME: 'scratch',
    GIT_COMMITTER_EMAIL: 'scratch@example.invalid',
  };
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, env, encoding: 'utf8', stdio: 'pipe' });
  const remove = () => fs.rmSync(dir, { recursive: true, force: true });
  try {
    git('init', '-q', '-b', 'main');
    const gitDir = fs.realpathSync(git('rev-parse', '--absolute-git-dir').trim());
    if (path.relative(dir, gitDir).startsWith('..') || path.isAbsolute(path.relative(dir, gitDir)))
      throw new Error(`scratch-git: the repository landed at ${gitDir}, outside ${dir}; nothing else was run`);
  } catch (error) {
    remove();
    throw error;
  }
  const write = (file: string, text: string) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  };
  return { dir, env, git, write, remove };
}
