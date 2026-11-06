// Rebuild disposable fixtures using the real route and current save machinery. No old-save conversion.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
if (args.some((a) => ['--from', '--to', '--eval', '--saves'].includes(a)))
  throw new Error('Regenerate the whole fixture set; options are --players 2, --real, --warp-speed and --query');
const broker = fs.existsSync('.look/see-client.ts');
const child = spawnSync(
  process.execPath,
  [
    ...(broker ? ['.look/see-client.ts', 'playthrough'] : ['dev/look/playthrough.ts']),
    '--regenerate',
    '--long',
    ...args,
  ],
  { stdio: 'inherit' },
);
if (child.error) throw child.error;
process.exit(child.status ?? 1);
