// Operator replacements have their own journal and pins, outside jump-room expiry and ordinary backup pruning.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { WORLD_NS } from '../../src/world/namespace.ts';
import { RAILWAY_PLAY_NS } from '../../src/world/railway-namespace.ts';
import type { RoomDoc, Store } from './store.ts';

export const BACKUP_RE = /^([a-z0-9-]{1,32})@(\d{8}T\d{9}Z)\.json$/;

// Every ordinary-backup creation path shares this budget. Never descend into the pinned directory.
export async function pruneBackups(dataDir: string) {
  const dir = path.join(dataDir, '.backups');
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const names = entries
    .filter((entry) => entry.isFile() && BACKUP_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => BACKUP_RE.exec(b)![2]!.localeCompare(BACKUP_RE.exec(a)![2]!) || b.localeCompare(a));
  // Concurrent creators/pruners may already have removed an old file; each snapshot deletes only its oldest.
  for (const name of names.slice(30)) await fs.rm(path.join(dir, name), { force: true });
}

export type ReplacementRecord = {
  stage: string;
  at: string;
  build: string;
  ns: string;
  born: string;
  bornBefore: string;
  backup: string;
  players: number;
  docHash: string;
  restore: string;
};
type Journal = Omit<ReplacementRecord, 'born'> & { room: string };

export function createReplacements(
  cfg: { dataDir: string; build: string; log: (...a: unknown[]) => void; replaceFailAt?: 'backup' | 'save' | 'record' },
  store: Store,
) {
  const dir = path.join(cfg.dataDir, 'replacements');
  const pinDir = path.join(cfg.dataDir, '.backups', 'pinned');
  const records = new Map<string, ReplacementRecord>();
  const pending = new Set<string>();
  const recordFile = (id: string) => path.join(dir, `${id}.json`);
  const journalFile = (id: string) => path.join(dir, `${id}.pending.json`);
  async function atomic(file: string, value: unknown) {
    const tmp = `${file}.${crypto.randomBytes(6).toString('hex')}.tmp`;
    try {
      await fs.writeFile(tmp, JSON.stringify(value));
      await fs.rename(tmp, file);
    } finally {
      await fs.rm(tmp, { force: true });
    }
  }
  async function finish(journal: Journal, born: string) {
    const { room, ...rest } = journal;
    const record = { ...rest, born };
    await atomic(recordFile(room), record);
    records.set(room, record);
    await fs.appendFile(path.join(dir, 'log.jsonl'), `${JSON.stringify({ room, ...record })}\n`);
    cfg.log(`replace: ${JSON.stringify({ room, ...record })}`);
    await fs.rm(journalFile(room), { force: true });
    return record;
  }
  // Caller holds the room lock. A crash before rename preserves the old world; after rename completes the record.
  async function recoverLocked(id: string) {
    const text = await store.readIfExists(journalFile(id));
    if (text === null) return;
    const journal = JSON.parse(text) as Journal;
    const born = store.born(id);
    if (!born) throw new Error(`replacement ${id}: unreadable save during recovery`);
    if (born === journal.bornBefore) await fs.rm(journalFile(id), { force: true });
    else await finish(journal, born);
  }
  async function pins() {
    const names = await fs.readdir(pinDir).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return [];
      throw error;
    });
    return Promise.all(
      names
        .filter((name) => BACKUP_RE.test(name))
        .sort()
        .reverse()
        .map(async (name) => ({
          name,
          room: BACKUP_RE.exec(name)![1]!,
          bytes: (await fs.stat(path.join(pinDir, name))).size,
          pinned: true as const,
        })),
    );
  }
  return {
    async init() {
      const names = await fs.readdir(dir).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });
      for (const name of names) {
        const id = /^([a-z0-9-]{1,32})\.pending\.json$/.exec(name)?.[1];
        if (id) await store.withLock(id, () => recoverLocked(id));
      }
      for (const name of names) {
        const id = /^([a-z0-9-]{1,32})\.json$/.exec(name)?.[1];
        if (id) records.set(id, JSON.parse(await fs.readFile(recordFile(id), 'utf8')) as ReplacementRecord);
      }
    },
    read: (id: string) => records.get(id),
    recover: (id: string) => store.withLock(id, () => recoverLocked(id)),
    busy: (id: string) => pending.has(id),
    begin(id: string) {
      if (pending.has(id)) return false;
      pending.add(id);
      return true;
    },
    end: (id: string) => pending.delete(id),
    pins,
    async release(name: string) {
      if (!BACKUP_RE.test(name)) throw new Error('invalid backup name');
      // Releasing the pin makes it subject to the ordinary newest-30 retention pool immediately.
      await fs.rename(path.join(pinDir, name), path.join(cfg.dataDir, '.backups', name));
      await pruneBackups(cfg.dataDir);
      cfg.log(`release: ${name}`);
    },
    async replace(id: string, doc: RoomDoc, meta: { stage: string; players: number; docHash: string }) {
      return store.withLock(id, async () => {
        await recoverLocked(id);
        const before = await store.read(id);
        const bornBefore = store.born(id);
        if (!before || !bornBefore) throw new Error(`replacement ${id}: no verified source save`);
        const at = new Date().toISOString();
        const backup = `${id}@${at.replace(/[-:.]/g, '')}.json`;
        const plain = id.startsWith(`${RAILWAY_PLAY_NS}-`) ? id.slice(RAILWAY_PLAY_NS.length + 1) : id;
        const journal: Journal = {
          ...meta,
          room: id,
          at,
          build: cfg.build,
          ns: WORLD_NS,
          bornBefore,
          backup,
          restore: `npm run server -- restore ${plain} ${backup} --force`,
        };
        await fs.mkdir(dir, { recursive: true });
        await atomic(journalFile(id), journal);
        if (cfg.replaceFailAt === 'backup') throw new Error('injected replacement backup failure');
        const text = JSON.stringify(before);
        await fs.mkdir(pinDir, { recursive: true });
        await fs.writeFile(path.join(pinDir, backup), text, { flag: 'wx' });
        const copied = await fs.readFile(path.join(pinDir, backup), 'utf8');
        if (copied !== text) throw new Error('replacement backup verification failed');
        if (cfg.replaceFailAt === 'save') throw new Error('injected replacement save failure');
        await store.replace(id, doc);
        if (cfg.replaceFailAt === 'record') throw new Error('injected replacement record failure');
        return finish(journal, store.born(id)!);
      });
    },
    async logRestore(id: string, backup: string) {
      const event = { room: id, restored: backup, at: new Date().toISOString(), born: store.born(id) };
      await fs.mkdir(dir, { recursive: true });
      await fs.appendFile(path.join(dir, 'log.jsonl'), `${JSON.stringify(event)}\n`);
      cfg.log(`restore: ${JSON.stringify(event)}`);
    },
  };
}
export type Replacements = ReturnType<typeof createReplacements>;
