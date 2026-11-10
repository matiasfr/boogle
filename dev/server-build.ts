// The commit owning the deployed server sources. Pages may deploy without a server change.
import { execFileSync } from 'node:child_process';

export function serverBuild() {
  return execFileSync(
    'git',
    [
      'log',
      '-1',
      '--format=%H',
      '--',
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
    ],
    { encoding: 'utf8' },
  ).trim();
}
