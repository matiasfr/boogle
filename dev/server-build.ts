// The commit owning the deployed server sources. Pages may deploy without a server change.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { isDocs } from './ci/docs-path.ts';
import { fileURLToPath } from 'node:url';

/** The server image's sources (server/Dockerfile's COPY lines; test/server-image.test.ts keeps them in step). */
export const SERVER_IMAGE_PATHS = [
  'server',
  'src/world',
  'src/sim',
  'src/ecs',
  'src/math-pure.ts',
  'src/math.ts',
  'src/place/town-plan.ts',
  'src/place/home-station.ts',
  'src/place/rotunda.ts',
  'src/net/ids.ts',
  'src/net/ws-wire.ts',
  'src/net/account-wire.ts',
  'src/net/rtc-wire.ts',
  'package.json',
  '.dockerignore',
  '.github/workflows/deploy-server.yml',
  'dev/server-build.ts',
  'dev/ci/docs-path.ts',
] as const;

export function serverBuild() {
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  let ref = 'HEAD';
  // Keep the source commit used by Fly. Skip prose within image directories even when a
  // later client-only commit follows it: both the old and new page still require the same host.
  for (;;) {
    const sha = git('log', '-1', '--format=%H', ref, '--', ...SERVER_IMAGE_PATHS);
    if (!sha) return '';
    const files = git(
      'diff-tree',
      '--diff-merges=first-parent',
      '--root',
      '--no-commit-id',
      '--name-only',
      '--no-renames',
      '-r',
      '-z',
      sha,
      '--',
      ...SERVER_IMAGE_PATHS,
    );
    if (files.split('\0').some((file) => file && !isDocs(file))) return sha;
    const parent = git('log', '-1', '--format=%P', sha).split(' ')[0];
    if (!parent) return sha;
    ref = parent;
  }
}

/** True when a path is one of the image's sources or under one (what decides a server deploy after a merge). */
const touchesServerImage = (file: string) =>
  !isDocs(file) && SERVER_IMAGE_PATHS.some((p) => file === p || file.startsWith(`${p}/`));

// CLI, for automerge.yml: `node dev/server-build.ts --touches` reads paths on stdin (one per line) and exits 0 when any
// is an image source, 1 when none is. Needs no installed packages, so it runs before `npm ci`.
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--touches')) {
  const files = fs
    .readFileSync(0, 'utf8')
    .split('\n')
    .map((f) => f.trim());
  process.exit(files.some((f) => f && touchesServerImage(f)) ? 0 : 1);
}
