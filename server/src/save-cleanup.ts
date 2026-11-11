// Boot only, before loading rooms. Recheck each file under the writer's lock; never read room contents.
import fs from 'node:fs/promises';
import path from 'node:path';
import { assertNotCurrent, classify, type Inventory } from './save-inventory.ts';
import type { Store } from './store.ts';
import { roomIdFromFile } from './room-ids.ts';

const TMP_AGE_MS = 3_600_000;
const TRASH_AGE_MS = 7 * 86_400_000;
type MovedFile = { name: string; bytes: number; reason: 'old-ns' | 'legacy' | 'tmp' };
export type Cleanup = {
  at: string;
  enabled: boolean;
  trash: string | null;
  moved: MovedFile[];
  purged: string[];
  skipped: { name: string; reason: string }[];
  unknown: string[];
  errors: string[];
};

async function lstat(file: string) {
  try {
    return await fs.lstat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

// Run folders are named `<UTC ISO time with ':' as '-'>-<6 random>`, e.g. `2026-10-31T00-00-00.000Z-a1B2c3`:
// Windows forbids ':' in file names. Fixed width, so names still sort by time.
export function trashStamp(ms: number): string {
  return new Date(ms).toISOString().replaceAll(':', '-');
}

// Accepts that form and the colon form (`2026-10-31T00:00:00.000Z-a1B2c3`) older builds wrote, which
// remain on Linux saves. Builds before the dash form report a dash-form folder as unknown and keep it.
export function trashTime(name: string): number | null {
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2})([:-])(\d{2})\2(\d{2}\.\d{3}Z)(?:-[a-zA-Z0-9]{6})?$/.exec(name);
  if (!m) return null;
  const stamp = `${m[1]}:${m[3]}:${m[4]}`;
  const ms = Date.parse(stamp);
  return Number.isFinite(ms) && new Date(ms).toISOString() === stamp ? ms : null;
}

export async function cleanupSaves(
  dataDir: string,
  inv: Inventory,
  store: Store,
  {
    enabled = true,
    now = Date.now(),
    isLive = () => false,
  }: {
    enabled?: boolean;
    now?: number;
    isLive?: (id: string) => boolean;
  } = {},
): Promise<Cleanup> {
  const result: Cleanup = {
    at: new Date(now).toISOString(),
    enabled,
    trash: null,
    moved: [],
    purged: [],
    skipped: [],
    unknown: [...inv.unknown],
    errors: [],
  };
  if (!enabled) return result; // The kill switch disables both moves and purging.
  const ns = { world: inv.ns, rail: inv.rail, currentRooms: inv.currentRooms };
  const trashRoot = path.join(dataDir, '.trash');
  const protectedFile = (name: string) => {
    try {
      assertNotCurrent(name, ns);
    } catch {
      return 'current';
    }
    const id = roomIdFromFile(name);
    return id && isLive(id) ? 'live' : null;
  };
  const unknown = (name: string) => {
    if (!result.unknown.includes(name)) result.unknown.push(name);
  };
  async function keepArchive(dir: string, relative: string, inFiles = false): Promise<boolean> {
    let keep = false;
    for (const child of await fs.readdir(dir, { withFileTypes: true })) {
      const name = `${relative}/${child.name}`;
      if (!inFiles && child.name === 'files' && child.isDirectory()) {
        if (await keepArchive(path.join(dir, 'files'), name, true)) keep = true;
        continue;
      }
      const kind = classify(child.name, ns);
      const metadata = !inFiles && (child.name === 'manifest.json' || child.name === 'manifest.json.tmp');
      const reason = metadata ? null : protectedFile(child.name);
      if (reason) {
        result.skipped.push({ name, reason });
        keep = true;
      } else if (!child.isFile() || (!metadata && kind !== 'old-ns' && kind !== 'legacy' && kind !== 'tmp')) {
        unknown(name);
        keep = true;
      }
    }
    return keep;
  }

  // Only UTC-stamped run folders and their files/ payload are eligible; never follow unknown dirs or symlinks.
  try {
    const root = await lstat(trashRoot);
    if (root && !root.isDirectory()) throw new Error('.trash is not a regular directory');
    if (root) {
      for (const entry of await fs.readdir(trashRoot, { withFileTypes: true })) {
        const relative = `.trash/${entry.name}`;
        const time = trashTime(entry.name);
        if (!entry.isDirectory() || time === null) {
          unknown(relative);
          continue;
        }
        if (time >= now - TRASH_AGE_MS) continue;
        const dir = path.join(trashRoot, entry.name);
        if (await keepArchive(dir, relative)) continue;
        await fs.rm(dir, { recursive: true });
        result.purged.push(relative);
      }
    }
  } catch (error) {
    result.errors.push(`purge: ${String(error)}`);
    return result; // Do not start new moves when the trash directory cannot be safely inspected.
  }

  let destination: string | null = null;
  const manifest = async (files: MovedFile[]) => {
    if (!destination) {
      await fs.mkdir(trashRoot, { recursive: true });
      if (!(await fs.lstat(trashRoot)).isDirectory()) throw new Error('.trash is not a regular directory');
      destination = await fs.mkdtemp(path.join(trashRoot, `${trashStamp(now)}-`));
      result.trash = `.trash/${path.basename(destination)}`;
      await fs.mkdir(path.join(destination, 'files'));
    }
    const file = path.join(destination, 'manifest.json');
    await fs.writeFile(
      `${file}.tmp`,
      JSON.stringify({ at: result.at, ns: inv.ns, rail: inv.rail, files }, null, 2) + '\n',
    );
    await fs.rename(`${file}.tmp`, file);
  };

  for (const name of [...new Set([...inv.files, ...inv.legacyFiles])].sort()) {
    // Do not trust the inventory's file list to authorize arbitrary paths or a different file kind.
    const kind = classify(name, ns);
    const id = roomIdFromFile(name);
    if (!id || (kind !== 'old-ns' && kind !== 'legacy' && kind !== 'tmp')) {
      result.skipped.push({ name, reason: 'not a candidate' });
      continue;
    }
    try {
      await store.withLock(id, async () => {
        const reason = protectedFile(name);
        if (reason) {
          result.skipped.push({ name, reason });
          return;
        }
        const source = path.join(dataDir, name);
        const stat = await lstat(source);
        if (!stat) return; // A temp write may have finished after inventory.
        if (!stat.isFile()) {
          unknown(name);
          return;
        }
        if (kind === 'tmp' && stat.mtimeMs >= now - TMP_AGE_MS) {
          result.skipped.push({ name, reason: 'fresh temp' });
          return;
        }
        const moved = { name, bytes: stat.size, reason: kind };
        // Record the next rename first. Even a crash between these operations leaves a recovery record.
        await manifest([...result.moved, moved]);
        const lateProtection = protectedFile(name);
        try {
          if (lateProtection) {
            result.skipped.push({ name, reason: lateProtection });
            return;
          }
          await fs.rename(source, path.join(destination!, 'files', name));
          result.moved.push(moved);
          if (kind !== 'tmp') store.forget(id);
        } finally {
          if (!result.moved.includes(moved)) await manifest(result.moved);
        }
      });
    } catch (error) {
      result.errors.push(`${name}: ${String(error)}`);
    }
  }
  result.unknown.sort();
  return result;
}

export function cleanupLine(result: Cleanup): string {
  const n = (reason: MovedFile['reason']) => result.moved.filter((file) => file.reason === reason).length;
  const bytes = result.moved.reduce((sum, file) => sum + file.bytes, 0);
  return (
    `save cleanup${result.enabled ? '' : ' off'}: moved ${result.moved.length} (${bytes} bytes; ` +
    `old-ns ${n('old-ns')}, legacy ${n('legacy')}, tmp ${n('tmp')}) to ${result.trash ?? 'none'}; ` +
    `purged ${result.purged.length} folders; skipped ${result.skipped.length}; ` +
    `unknown ${result.unknown.length} ${JSON.stringify(result.unknown)}; errors ${result.errors.length} ${JSON.stringify(result.errors)}`
  );
}
