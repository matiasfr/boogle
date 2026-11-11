// Stops a harness run whose node_modules doesn't match the checkout's package-lock.json: a stale Rapier once showed up as
// page errors and a missed landing that weren't the game's. It only reports. `npm ci` deletes node_modules, and something
// may be running from it.
// CLI, for dev/codex/ship-branch.sh: `node dev/look/install-check.ts [dir]` exits 1 with the drift, 0 when in step.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Lock = { packages?: Record<string, { version?: string; optional?: boolean }> };
const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8')) as Lock;

/** Each package that differs, as `name: installed, lock wants`. Optional packages for other platforms are never installed. */
function installDrift(lock: Lock, installed: Lock) {
  const want = lock.packages ?? {};
  const have = installed.packages ?? {};
  const name = (key: string) => key.replace(/^.*node_modules\//, '');
  const drift: string[] = [];
  for (const [key, pkg] of Object.entries(want)) {
    if (!key.startsWith('node_modules/')) continue; // the project itself, and any workspace folder
    const got = have[key]?.version;
    if (got === undefined ? !pkg.optional : got !== pkg.version)
      drift.push(`${name(key)}: ${got ?? 'missing'}, lock wants ${pkg.version}`);
  }
  for (const [key, pkg] of Object.entries(have))
    if (key.startsWith('node_modules/') && !want[key]) drift.push(`${name(key)}: ${pkg.version}, not in the lock`);
  return drift;
}

export function checkInstall(dir: string) {
  const modules = path.join(dir, 'node_modules');
  const lockFile = path.join(dir, 'package-lock.json');
  // A symlink is on purpose: before-after plays an old commit on this checkout's packages.
  if (!fs.existsSync(lockFile) || fs.lstatSync(modules, { throwIfNoEntry: false })?.isSymbolicLink()) return;
  const hidden = path.join(modules, '.package-lock.json');
  const drift = fs.existsSync(hidden) ? installDrift(read(lockFile), read(hidden)) : ['node_modules: not installed'];
  if (!drift.length) return;
  const shown = drift.slice(0, 5).join('\n  ');
  const more = drift.length > 5 ? `\n  and ${drift.length - 5} more` : '';
  throw new Error(
    `${dir} is out of step with its package-lock.json:\n  ${shown}${more}\nRun npm ci there, then try again.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    checkInstall(path.resolve(process.argv[2] ?? '.'));
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
