// The commit owning the deployed server sources. Pages may deploy without a server change.
import { execFileSync } from 'node:child_process';

/** The server image's sources (server/Dockerfile's COPY lines; test/server-image.test.ts keeps them in step). */
export const SERVER_IMAGE_PATHS = [
  'server',
  'src/world',
  'src/sim',
  'src/ecs',
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
