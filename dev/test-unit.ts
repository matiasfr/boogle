// npm run test:unit: every test/**/*.test.ts under node --test.
// The glob is expanded here, not by the shell: cmd.exe keeps single quotes, so a quoted glob in package.json
// reached Node literally on Windows, matched nothing and passed with 0 tests. An empty match now fails.
// Extra arguments (npm run test:unit -- --test-name-pattern=x) go to node --test ahead of the files. `--ci` (CI's unit
// job), `--ship` (a non-review ship's CI) and `--long` (npm run test:long, nightly) pick the run's settings
// (./test-env.ts). UNIT_ONLY selects files in every mode (space-separated; dev/ci/unit-select.ts picks them).
// `--ship` requires UNIT_ONLY and
// refuses to run with none, so a missing selection cannot pass having tested nothing.
import './node-version.ts'; // first: re-runs under the pinned Node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { testEnv } from './test-env.ts';

const given = process.argv.slice(2);
const ship = given.includes('--ship');
const only = (process.env.UNIT_ONLY ?? '').split(/\s+/).filter(Boolean);
if (ship && !only.length) {
  console.error('test:unit --ship: UNIT_ONLY lists no test files (dev/ci/unit-select.ts prints them)');
  process.exit(1);
}
const files = only.length ? only.sort() : fs.globSync('test/**/*.test.ts').sort();
if (!files.length) {
  console.error('test:unit: no files match test/**/*.test.ts (run it from the repository root)');
  process.exit(1);
}
const args = given.filter((a) => !['--ci', '--long', '--ship'].includes(a));
const { env, flags } = testEnv(
  given.includes('--long') ? 'long' : given.includes('--ci') ? 'ci' : ship ? 'ship' : 'local',
);
const result = spawnSync(process.execPath, ['--test', ...flags, ...args, ...files], {
  stdio: 'inherit',
  env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
