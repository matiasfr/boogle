// The Node the repo pins (.nvmrc, package.json "engines"), for the entry points an agent runs from a default shell whose
// `node` may be older (`npm run` only warns about "engines"). Imported first, it re-runs the current command under
// nvm's newest Node of that major, with that Node's bin first on PATH so every `node` and `npm` below it is the same
// one; with none installed it exits 1 with one line saying what to use. On the pinned Node (CI's setup-node, HOTBOX)
// it does nothing. The one lookup: `node dev/node-version.ts --bin` prints that bin directory (dev/ship-queue.sh).
//
// Imported by dev/test-unit.ts, dev/check.ts (check, check:full), dev/ship-check.ts (the pre-push gate),
// dev/level/check.ts and dev/daily/run.ts. It must stay the first import: modules evaluate in import order.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const NEED = Number(
  fs
    .readFileSync(new URL('../.nvmrc', import.meta.url), 'utf8')
    .trim()
    .replace(/^v/, '')
    .split('.')[0],
);
const major = (v: string) => Number(v.replace(/^v/, '').split('.')[0]);

/** nvm's newest installed Node of the pinned major: its bin directory, or null. */
export function pinnedNodeBin(): string | null {
  const root = path.join(process.env.NVM_DIR ?? path.join(os.homedir(), '.nvm'), 'versions', 'node');
  let names: string[];
  try {
    names = fs.readdirSync(root);
  } catch {
    return null;
  }
  const parts = (v: string) => v.slice(1).split('.').map(Number);
  const best = names
    .filter((n) => /^v\d+\.\d+\.\d+$/.test(n) && major(n) === NEED)
    .sort((a, b) => {
      const [x, y] = [parts(a), parts(b)];
      return y[0]! - x[0]! || y[1]! - x[1]! || y[2]! - x[2]!;
    })[0];
  const bin = best && path.join(root, best, 'bin');
  return bin && fs.existsSync(path.join(bin, 'node')) ? bin : null;
}

const self = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  // CLI: print the bin directory for a shell script.
  const bin = pinnedNodeBin();
  if (!bin) process.exit(1);
  console.log(bin);
} else if (major(process.version) < NEED) {
  const bin = process.env.BOOGLE_NODE_REEXEC ? null : pinnedNodeBin();
  if (!bin) {
    console.error(
      `boogle needs Node ${NEED} (.nvmrc); this is Node ${process.version} and nvm has no Node ${NEED}: run \`nvm install ${NEED} && nvm use ${NEED}\`.`,
    );
    process.exit(1);
  }
  const node = path.join(bin, 'node');
  console.error(`(Node ${process.version} is older than the pinned ${NEED}: re-running under ${node})`);
  const r = spawnSync(node, [...process.execArgv, ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: { ...process.env, BOOGLE_NODE_REEXEC: '1', PATH: `${bin}${path.delimiter}${process.env.PATH ?? ''}` },
  });
  if (r.error) throw r.error;
  process.exit(r.status ?? 1);
}
