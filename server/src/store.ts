// Room snapshots on disk: one JSON file per room in cfg.dataDir, written atomically (temp file + rename) one write at a
// time per room. Used by the snapshot endpoints (server.ts) and, later, the server host (docs/plans/server-host.md).
//
//   const store = createStore({ dataDir, maxRooms })
//   await store.init()                    create the directory and learn the rooms already saved
//   await store.read(id)                  the room's document, or null
//   store.readSync(id)                    the same, synchronously (startup only)
//   await store.write(id, doc, { ifNewer })  { status: 200 | 409 | 507, body }: 409 when ifNewer and the saved tick is
//                                         higher, 507 when a new room would pass maxRooms
//   await store.create(id, doc)           a new room's first save only: 409 if it has a file, 507 past maxRooms
//   store.known(id), store.count()        rooms with a file
//   store.forget(id)                      after boot cleanup or a reset moved its file, under withLock(id)
//   store.born(id)                        the id of this room's world, new when it starts over (a reset; a restore
//                                         brings the backup's back); null if the save is unreadable. The client starts
//                                         the player over when it changes (src/player/world-reset.ts)
//   store.withLock(key, fn)               run fn after every earlier call with the same key has settled
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { currentRoomId, roomNamespaces } from './room-ids.ts';

export type RoomDoc = { tick: number; writerId: string; data: unknown; updatedAt: string; born?: string };
/** A save from before worlds had a birth id: the same for every reader until the room is reset. */
const BORN_LEGACY = '0';
const okBorn = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9]{1,16}$/.test(v);
export type WriteResult = { status: 200 | 409 | 507; body: Record<string, unknown> };

export function createStore(cfg: { dataDir: string; maxRooms: number; serverRooms?: readonly string[] }) {
  const ns = roomNamespaces(cfg.serverRooms);
  const knownRooms = new Set<string>();
  const locks = new Map<string, Promise<unknown>>(); // key -> promise chain
  const fileFor = (id: string) => path.join(cfg.dataDir, `${id}.json`);
  // A world with no save yet keeps one birth id until its first write records it (or a reset forgets it).
  const unborn = new Map<string, string>();
  const newBorn = (id: string) => {
    let born = unborn.get(id);
    if (!born) unborn.set(id, (born = crypto.randomBytes(6).toString('hex')));
    return born;
  };
  // The file's birth id stays; a first save (a fresh world, or a backup put back) takes its own or a new one.
  const stamp = (id: string, doc: RoomDoc, current: RoomDoc | null): RoomDoc => {
    const born = current ? current.born : okBorn(doc.born) ? doc.born : newBorn(id);
    const { born: _, ...rest } = doc;
    return okBorn(born) ? { ...rest, born } : rest;
  };

  // A file's text, or null if it does not exist.
  async function readIfExists(file: string) {
    try {
      return await fs.readFile(file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = locks.get(key) || Promise.resolve();
    const next = prev.then(fn, fn);
    const tail = next.catch(() => {});
    locks.set(key, tail);
    tail.then(() => {
      if (locks.get(key) === tail) locks.delete(key);
    });
    return next;
  }

  return {
    readIfExists,
    withLock,
    async init() {
      await fs.mkdir(cfg.dataDir, { recursive: true });
      for (const f of await fs.readdir(cfg.dataDir)) {
        const m = /^([a-z0-9-]{1,32})\.json$/.exec(f);
        if (m) knownRooms.add(m[1]!);
      }
    },
    async read(id: string): Promise<RoomDoc | null> {
      const text = await readIfExists(fileFor(id));
      return text === null ? null : JSON.parse(text);
    },
    readSync(id: string): RoomDoc | null {
      try {
        return JSON.parse(fsSync.readFileSync(fileFor(id), 'utf8'));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw e;
      }
    },
    write(id: string, doc: RoomDoc, { ifNewer = false } = {}): Promise<WriteResult> {
      return withLock(id, async () => {
        if (!currentRoomId(id, ns)) throw new Error(`Cannot write obsolete or invalid room: ${id}`);
        const current = await this.read(id);
        if (ifNewer && current && current.tick > doc.tick)
          return { status: 409, body: { error: 'stale tick', tick: current.tick } };
        if (!current && !knownRooms.has(id) && knownRooms.size >= cfg.maxRooms)
          return { status: 507, body: { error: 'room limit reached' } };
        const tmp = `${fileFor(id)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(stamp(id, doc, current)));
        await fs.rename(tmp, fileFor(id));
        knownRooms.add(id);
        unborn.delete(id);
        return { status: 200, body: { ok: true, tick: doc.tick } };
      });
    },
    /** Caller holds withLock(id) and has taken the host offline. Whole-save replacement, including its birth. */
    async replace(id: string, doc: RoomDoc, { restoreBorn = false } = {}): Promise<void> {
      if (!currentRoomId(id, ns)) throw new Error(`Cannot replace obsolete or invalid room: ${id}`);
      if (!knownRooms.has(id) && knownRooms.size >= cfg.maxRooms) throw new Error('room limit reached');
      const born = restoreBorn ? (okBorn(doc.born) ? doc.born : BORN_LEGACY) : crypto.randomBytes(6).toString('hex');
      const tmp = `${fileFor(id)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
      try {
        await fs.writeFile(tmp, JSON.stringify({ ...doc, born }));
        await fs.rename(tmp, fileFor(id));
      } finally {
        await fs.rm(tmp, { force: true });
      }
      knownRooms.add(id);
      unborn.delete(id);
    },
    /** A new room's first save, never over one: the temp file is hard-linked into place, so an existing file (or a
     * write racing this one) refuses rather than replaces. Jump-in seeds only (./jump.ts). */
    create(id: string, doc: RoomDoc): Promise<WriteResult> {
      return withLock(id, async () => {
        if (!currentRoomId(id, ns)) throw new Error(`Cannot write obsolete or invalid room: ${id}`);
        if (knownRooms.has(id)) return { status: 409, body: { error: 'room exists' } };
        if (knownRooms.size >= cfg.maxRooms) return { status: 507, body: { error: 'room limit reached' } };
        const tmp = `${fileFor(id)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(stamp(id, doc, null)));
        try {
          await fs.link(tmp, fileFor(id));
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code === 'EEXIST') return { status: 409, body: { error: 'room exists' } };
          throw e;
        } finally {
          await fs.rm(tmp, { force: true });
        }
        knownRooms.add(id);
        unborn.delete(id);
        return { status: 200, body: { ok: true, tick: doc.tick } };
      });
    },
    /** Null for a save that cannot be read: it loads as a fresh fallback that is never saved (noSave), and naming
     * that world would start its players over now and again once the file is repaired. */
    born(id: string): string | null {
      let doc: RoomDoc | null;
      try {
        doc = this.readSync(id);
      } catch {
        return null;
      }
      return doc ? (okBorn(doc.born) ? doc.born : BORN_LEGACY) : newBorn(id);
    },
    known: (id: string) => knownRooms.has(id),
    count: () => knownRooms.size,
    forget: (id: string) => (unborn.delete(id), knownRooms.delete(id)),
  };
}
export type Store = ReturnType<typeof createStore>;
