// `npm run sim -- <name> [args]`: runs dev/sim/<name>.ts headless, with no browser or GPU. See ./README.md.
import fs from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname;
const NOT_RUNS = new Set(['hooks', 'run', 'world', 'ball-browser', 'ball-course']);
const runs = fs
  .readdirSync(here)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => path.basename(f, '.ts'))
  .filter((name) => !NOT_RUNS.has(name));

const name = process.argv[2];
if (!name || !runs.includes(name)) {
  console.error(`npm run sim -- <name>, one of: ${runs.join(', ')}`);
  process.exit(2);
}
await import(path.join(here, `${name}.ts`));
