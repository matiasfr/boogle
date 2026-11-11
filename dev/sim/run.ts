// `npm run sim -- <name> [args]`: runs dev/sim/<name>.ts headless, with no browser or GPU. See ./README.md.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const here = import.meta.dirname;
const NOT_RUNS = new Set(['hooks', 'run', 'world', 'inspect']);
const runs = fs
  .readdirSync(here)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => path.basename(f, '.ts'))
  .filter((name) => !NOT_RUNS.has(name));

const name = process.argv[2];
if (!name || !runs.includes(name)) {
  console.error(
    runs.length
      ? `npm run sim -- <name>, one of: ${runs.join(', ')}`
      : 'npm run sim: no runs in dev/sim/ (the ball and player runs were retired; see ./README.md)',
  );
  process.exit(2);
}
await import(pathToFileURL(path.join(here, `${name}.ts`)).href);
