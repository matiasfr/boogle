// npm run test:unit: every test/**/*.test.ts under node --test.
// The glob is expanded here, not by the shell: cmd.exe keeps single quotes, so a quoted glob in package.json
// reached Node literally on Windows, matched nothing and passed with 0 tests. An empty match now fails.
// Extra arguments (npm run test:unit -- --test-name-pattern=x) go to node --test ahead of the files.
// The rail audit is off unless RAIL_AUDIT is set (src/sim/railway-drive.ts): CI's unit job sets RAIL_AUDIT=1, and
// `npm run test:long` (--long) adds the exhaustive sweeps and the reviews' full save checks (docs/agents/tests.md).
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = fs.globSync('test/**/*.test.ts').sort();
if (!files.length) {
  console.error('test:unit: no files match test/**/*.test.ts (run it from the repository root)');
  process.exit(1);
}
const args = process.argv.slice(2).filter((a) => a !== '--long');
const long = args.length < process.argv.length - 2;
const env = long
  ? { ...process.env, RAIL_AUDIT: '1', FUZZ_STRIDE: '1', SAVE_TICKS: '2500' }
  : { RAIL_AUDIT: '0', ...process.env };
const result = spawnSync(process.execPath, ['--test', '--test-timeout=5000', ...args, ...files], {
  stdio: 'inherit',
  env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
