// npm run test:unit: every test/**/*.test.ts under node --test.
// The glob is expanded here, not by the shell: cmd.exe keeps single quotes, so a quoted glob in package.json
// reached Node literally on Windows, matched nothing and passed with 0 tests. An empty match now fails.
// Extra arguments (npm run test:unit -- --test-name-pattern=x) go to node --test ahead of the files.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const files = fs.globSync('test/**/*.test.ts').sort();
if (!files.length) {
  console.error('test:unit: no files match test/**/*.test.ts (run it from the repository root)');
  process.exit(1);
}
const result = spawnSync(process.execPath, ['--test', '--test-timeout=5000', ...process.argv.slice(2), ...files], {
  stdio: 'inherit',
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
