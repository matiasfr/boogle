// npm run check (lint, typecheck, unit tests, registry, level, assets, build) and `npm run check:full` (`--full`: then
// the server tests and the headless network test), one step after another, stopping at the first that fails. Under
// the pinned Node (./node-version.ts), so every step below runs on it too.
import './node-version.ts'; // first: re-runs under the pinned Node
import { spawnSync } from 'node:child_process';

const steps = [
  ['run', 'lint'],
  ['run', 'typecheck'],
  ['run', 'test:unit'],
  ['run', 'registry'],
  ['run', 'level-check'],
  ['run', 'assets', '--', '--check'],
  ['run', 'build'],
  ...(process.argv.includes('--full')
    ? [
        ['--prefix', 'server', 'test'],
        ['run', 'test:net'],
      ]
    : []),
];
// npm's own script when started by `npm run` (works on Windows without a shell); else `npm` on PATH.
const npm = process.env.npm_execpath;
for (const step of steps) {
  const r = npm
    ? spawnSync(process.execPath, [npm, ...step], { stdio: 'inherit' })
    : spawnSync('npm', step, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}
