// The commit owning the deployed server sources. Pages may deploy without a server change.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The server image's sources (server/Dockerfile's COPY lines; test/server-image.test.ts keeps them in step). */
export const SERVER_IMAGE_PATHS = [
  'server',
  'src/world',
  'src/sim',
  'src/ecs',
  'src/math-pure.ts',
  'src/net/ids.ts',
  'src/net/ws-wire.ts',
  'src/net/rtc-wire.ts',
  'package.json',
  '.dockerignore',
  '.github/workflows/deploy-server.yml',
] as const;

export function serverBuild() {
  return execFileSync('git', ['log', '-1', '--format=%H', '--', ...SERVER_IMAGE_PATHS], { encoding: 'utf8' }).trim();
}

/** True when a path is one of the image's sources or under one (what decides a server deploy after a merge). */
const touchesServerImage = (file: string) => SERVER_IMAGE_PATHS.some((p) => file === p || file.startsWith(`${p}/`));

// CLI, for automerge.yml: `node dev/server-build.ts --touches` reads paths on stdin (one per line) and exits 0 when any
// is an image source, 1 when none is. Imports nothing outside node:, so it runs before `npm ci`.
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--touches')) {
  const files = fs
    .readFileSync(0, 'utf8')
    .split('\n')
    .map((f) => f.trim());
  process.exit(files.some((f) => f && touchesServerImage(f)) ? 0 : 1);
}
