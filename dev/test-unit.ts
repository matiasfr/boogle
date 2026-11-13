// npm run test:unit: every test/**/*.test.ts under node --test.
// The glob is expanded here, not by the shell: cmd.exe keeps single quotes, so a quoted glob in package.json
// reached Node literally on Windows, matched nothing and passed with 0 tests. An empty match now fails.
// Extra arguments (npm run test:unit -- --test-name-pattern=x) go to node --test ahead of the files. `--ci` (CI's unit
// job), `--ship` (a non-review ship's CI) and `--long` (npm run test:long, nightly) pick the run's settings
// (./test-env.ts). UNIT_ONLY selects files in every mode (space-separated; dev/ci/unit-select.ts picks them).
// `--ship` requires UNIT_ONLY and
// refuses to run with none, so a missing selection cannot pass having tested nothing.
// In --ci mode, --test-shard selects measured-duration bins (./ci/unit-shards.ts), rather than Node's sorted deal.
import './node-version.ts'; // first: re-runs under the pinned Node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { testEnv } from './test-env.ts';
import { unitShards } from './ci/unit-shards.ts';

const given = process.argv.slice(2);
const ship = given.includes('--ship');
const only = (process.env.UNIT_ONLY ?? '').split(/\s+/).filter(Boolean);
if (ship && !only.length) {
  console.error('test:unit --ship: UNIT_ONLY lists no test files (dev/ci/unit-select.ts prints them)');
  process.exit(1);
}
let files = only.length ? only.sort() : fs.globSync('test/**/*.test.ts').sort();
if (!files.length) {
  console.error('test:unit: no files match test/**/*.test.ts (run it from the repository root)');
  process.exit(1);
}
const args = given.filter((a) => !['--ci', '--long', '--ship'].includes(a));
const shardAt = args.findIndex((a) => a === '--test-shard' || a.startsWith('--test-shard='));
const shard = shardAt < 0 ? '1/1' : (args[shardAt]!.split('=')[1] ?? args[shardAt + 1] ?? '');
if (given.includes('--ci') && !given.includes('--long') && shardAt >= 0) {
  const parts = shard.split('/').map(Number);
  const [index, total] = parts;
  if (
    parts.length !== 2 ||
    index === undefined ||
    total === undefined ||
    !Number.isInteger(index) ||
    !Number.isInteger(total) ||
    index < 1 ||
    index > total ||
    total < 1
  )
    throw new Error(`invalid unit shard: ${shard}`);
  files = unitShards(files, total)[index - 1]!;
  if (!files.length) throw new Error(`unit shard ${shard} has no files`);
  // We selected the files; leaving this flag would make Node shard the selection a second time.
  args.splice(shardAt, args[shardAt]!.includes('=') ? 1 : 2);
}
const { env, flags } = testEnv(
  given.includes('--long') ? 'long' : given.includes('--ci') ? 'ci' : ship ? 'ship' : 'local',
);
// Keep Node's normal output and expose the file summaries it hides, for shard balancing.
const reporters = args.some((a) => a.startsWith('--test-reporter'))
  ? []
  : [
      '--test-reporter=spec',
      '--test-reporter-destination=stdout',
      '--test-reporter=./dev/ci/unit-timing.ts',
      '--test-reporter-destination=stdout',
    ];
const start = performance.now();
const result = spawnSync(process.execPath, ['--test', ...flags, ...reporters, ...args, ...files], {
  stdio: 'inherit',
  env,
});
const seconds = (performance.now() - start) / 1000;
console.log(`unit shard ${shard}: ${seconds.toFixed(1)}s`);
if (seconds > 420)
  console.warn(
    `::warning::Unit shard ${shard} took ${seconds.toFixed(1)}s (>7 min); rebalance before the 10 min limit.`,
  );
if (result.error) throw result.error;
process.exit(result.status ?? 1);
