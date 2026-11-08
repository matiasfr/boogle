// Read-only disk inventory. No room contents are loaded and no cleanup mode is acted on here.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

type Namespace = { world: string; rail: string };
type Count = { count: number; bytes: number };
type Classification = 'current' | 'old-ns' | 'legacy' | 'tmp' | 'dir' | 'unknown';
export type Inventory = {
  ns: string;
  rail: string;
  current: Count & { idle: Count };
  candidates: {
    oldNs: Record<string, Count & { newest: string }>;
    legacy: Count;
    tmp: Count;
  };
  dirs: Record<string, number>;
  unknown: string[];
  files: string[];
  legacyFiles: string[];
  digest: string;
  digestWithLegacy: string;
};

const ROOM = /^[a-z0-9-]{1,32}\.json$/;
const OLD_NS = /^(rail-)?v\d{2}-/;
const TMP = /^[a-z0-9-]{1,32}\.json\.\d+\.[0-9a-f]{8}\.tmp$/;
const DIRS = new Set(['reports', 'playdata', 'reviews', '.trash']);
const currentPrefix = (name: string, ns: Namespace) =>
  name.startsWith(`${ns.world}-`) || name.startsWith(`${ns.rail}-`);

export function classify(name: string, ns: Namespace): Classification {
  if (DIRS.has(name)) return 'dir';
  if (ROOM.test(name)) {
    if (currentPrefix(name, ns)) return 'current';
    return OLD_NS.test(name) ? 'old-ns' : 'legacy';
  }
  return TMP.test(name) ? 'tmp' : 'unknown';
}

// Independent of classify: future cleanup callers must never be able to move a current room save.
export function assertNotCurrent(name: string, ns: Namespace): void {
  if (name.endsWith('.json') && currentPrefix(name, ns)) throw new Error(`Current world save: ${name}`);
}

async function statIfPresent(file: string) {
  try {
    return await fs.stat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; // A live temp write may just have completed.
    throw error;
  }
}

async function directoryBytes(dir: string): Promise<number> {
  let bytes = 0;
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) bytes += await directoryBytes(file);
    else if (entry.isFile()) bytes += (await statIfPresent(file))?.size ?? 0;
    // Do not follow symlinks, including ones pointing outside DATA_DIR.
  }
  return bytes;
}

const count = (): Count => ({ count: 0, bytes: 0 });
const add = (total: Count, bytes: number) => {
  total.count++;
  total.bytes += bytes;
};
const digest = (files: string[]) => crypto.createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 16);

export async function inventorySaves(
  dataDir: string,
  {
    ns,
    now = Date.now(),
    tmpAgeMs = 3_600_000,
    idleDays = 30,
  }: {
    ns: Namespace;
    now?: number;
    tmpAgeMs?: number;
    idleDays?: number;
  },
): Promise<Inventory> {
  const inv: Inventory = {
    ns: ns.world,
    rail: ns.rail,
    current: { ...count(), idle: count() },
    candidates: { oldNs: {}, legacy: count(), tmp: count() },
    dirs: {},
    unknown: [],
    files: [],
    legacyFiles: [],
    digest: '',
    digestWithLegacy: '',
  };
  const entries = (await fs.readdir(dataDir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const name = entry.name;
    const file = path.join(dataDir, name);
    const kind = classify(name, ns);
    if (entry.isDirectory() && kind === 'dir') {
      inv.dirs[name] = await directoryBytes(file);
      continue;
    }
    if (!entry.isFile() || kind === 'unknown' || kind === 'dir') {
      inv.unknown.push(name);
      continue;
    }
    const stat = await statIfPresent(file);
    if (!stat) continue;
    if (kind === 'current') {
      add(inv.current, stat.size);
      if (stat.mtimeMs < now - idleDays * 86_400_000) add(inv.current.idle, stat.size);
    } else if (kind === 'old-ns') {
      const namespace = OLD_NS.exec(name)![0].slice(0, -1);
      const group = (inv.candidates.oldNs[namespace] ??= { ...count(), newest: stat.mtime.toISOString() });
      add(group, stat.size);
      if (stat.mtime.toISOString() > group.newest) group.newest = stat.mtime.toISOString();
      inv.files.push(name);
    } else if (kind === 'legacy') {
      add(inv.candidates.legacy, stat.size);
      inv.legacyFiles.push(name);
    } else if (kind === 'tmp' && stat.mtimeMs < now - tmpAgeMs) {
      add(inv.candidates.tmp, stat.size);
      inv.files.push(name);
    }
  }
  inv.files.sort();
  inv.legacyFiles.sort();
  inv.unknown.sort();
  inv.digest = digest(inv.files);
  inv.digestWithLegacy = digest([...inv.files, ...inv.legacyFiles].sort());
  return inv;
}

export function inventoryLine(inv: Inventory): string {
  const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(2)} MB`;
  const old = Object.entries(inv.candidates.oldNs).map(([ns, group]) => `${ns} ${group.count} (${mb(group.bytes)})`);
  return (
    `save inventory ${inv.digest}: keep ${inv.current.count} (${mb(inv.current.bytes)}); ` +
    `old-ns ${old.join(', ') || '0'}; legacy ${inv.candidates.legacy.count}; tmp ${inv.candidates.tmp.count}; ` +
    `idle-current ${inv.current.idle.count}; unknown ${inv.unknown.length}; digest-with-legacy ${inv.digestWithLegacy}`
  );
}
