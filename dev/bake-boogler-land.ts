// node dev/bake-boogler-land.ts: pin the initialized game's land, including obstacles added during startup.
// Under run.ts use its trusted broker; otherwise reuse the existing look tool. Nothing opens a
// second/custom browser. Both paths read dev/boogler-land-input.ts; only a completed healthy run may write a bake.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import type { BooglerLandBake } from '../src/world/boogler-land.ts';

const root = path.resolve(import.meta.dirname, '..');
const target = path.join(root, 'src/world/boogler-land.json');
const check = process.argv.includes('--check');
const broker = fs.existsSync(path.join(root, '.look/see/ready.json'));
// see-client exits immediately after printing. A regular file keeps its large snapshot output synchronous;
// a pipe can lose its tail at process.exit even though the broker itself retained the complete evidence.
fs.mkdirSync(path.join(root, '.look'), { recursive: true });
const log = path.join(root, '.look/boogler-land-bake.log');
const fd = fs.openSync(log, 'w');
const result = spawnSync(
  process.execPath,
  [
    ...(broker ? ['.look/see-client.ts', 'look'] : ['dev/look/look.ts']),
    '--eval',
    'dev/look/evals/boogler-land.ts',
    '--real',
    '--warm',
    '0',
    '--frames',
    '2',
    '--seconds',
    '0.1',
    '--size',
    '192x120',
    '--name',
    'boogler-land-bake',
  ],
  { cwd: root, stdio: ['ignore', fd, fd] },
);
fs.closeSync(fd);
const output = fs.readFileSync(log, 'utf8');
console.log(output.replace(/^BOOGLER LAND .*$/gm, '[land snapshot retained in broker evidence]'));
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Boogler land capture failed (${result.status}); bake unchanged`);
const raw = /^BOOGLER LAND (\{.*\})$/m.exec(output)?.[1];
if (!raw) throw new Error('Boogler land capture did not return its snapshot; bake unchanged');
const bake = JSON.parse(raw) as BooglerLandBake;
if (check) {
  const pinned = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null;
  if (JSON.stringify(bake) !== JSON.stringify(pinned))
    throw new Error('Boogler land differs from the island; re-bake: node dev/bake-boogler-land.ts');
} else fs.writeFileSync(target, JSON.stringify(bake, null, 2) + '\n');
console.log(`${check ? 'Verified' : 'Baked'} ${path.relative(root, target)}: ${fs.statSync(target).size} bytes`);
