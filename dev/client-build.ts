// The commit the game's pages are built as: the newest commit on this branch's first-parent history that changed a
// file the site's code reads. deploy.yml passes it to the build as VITE_BUILD, so a docs-only merge
// (dev/ci/change-class.ts) still deploys, and /development and the atlas stay current, but the build id stays put:
// open tabs see no newer build in version.json and nobody is asked to reload (owner, 27 November 2026:
// docs/decisions-process.md, "docs-only merges reload nobody"). dev/server-build.ts is the same idea for the server.
//
//   node dev/client-build.ts          prints the 40-character commit
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDocs } from './ci/change-class.ts';

/** The first of `commits` (newest first) that changed a file which is not docs. Null when none did. */
export function newestCodeCommit(commits: readonly string[], filesOf: (sha: string) => readonly string[]) {
  for (const sha of commits) if (filesOf(sha).some((file) => !isDocs(file))) return sha;
  return null;
}

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** What a commit changed against its first parent (a ship lands as a merge commit); a root commit lists every file. */
const changed = (sha: string) =>
  git(
    'diff-tree',
    '--diff-merges=first-parent',
    '--no-commit-id',
    '--name-only',
    '-r',
    '--no-renames',
    '--root',
    '-z',
    sha,
  )
    .split('\0')
    .filter(Boolean);

export function clientBuild(ref = 'HEAD') {
  const commits = git('rev-list', '--first-parent', ref).split('\n').filter(Boolean);
  // Every history has a code commit; with none readable (a shallow clone of docs merges), name the tip as before.
  return newestCodeCommit(commits, changed) ?? commits[0]!;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(clientBuild(process.argv[2]));
