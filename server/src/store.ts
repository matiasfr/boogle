// Room snapshots on disk: one JSON file per room in cfg.dataDir, written atomically (temp file + rename) one write at a
// time per room. Used by the snapshot endpoints (server.js) and, later, the server host (docs/plans/server-host.md).
//
//   const store = createStore({ dataDir, maxRooms })
//   await store.init()                    create the directory and learn the rooms already saved
//   await store.read(id)                  the room's document, or null
//   store.readSync(id)                    the same, synchronously (startup only)
//   await store.write(id, doc, { ifNewer })  { status: 200 | 409 | 507, body }: 409 when ifNewer and the saved tick is
//                                         higher, 507 when a new room would pass maxRooms
//   store.known(id), store.count()        rooms with a file
//   store.withLock(key, fn)               run fn after every earlier call with the same key has settled
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

export type RoomDoc = { tick: number; writerId: string; data: unknown; updatedAt: string };
export type WriteResult = { status: 200 | 409 | 507; body: Record<string, unknown> };

export function createStore(cfg: { dataDir: string; maxRooms: number }) {
  const knownRooms = new Set<string>();
  const locks = new Map<string, Promise<unknown>>(); // key -> promise chain
  const fileFor = (id: string) => path.join(cfg.dataDir, `${id}.json`);

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
        if (m) knownRooms.add(m[1]);
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
        const current = await this.read(id);
        if (ifNewer && current && current.tick > doc.tick)
          return { status: 409, body: { error: 'stale tick', tick: current.tick } };
        if (!current && !knownRooms.has(id) && knownRooms.size >= cfg.maxRooms)
          return { status: 507, body: { error: 'room limit reached' } };
        const tmp = `${fileFor(id)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(doc));
        await fs.rename(tmp, fileFor(id));
        knownRooms.add(id);
        return { status: 200, body: { ok: true, tick: doc.tick } };
      });
    },
    known: (id: string) => knownRooms.has(id),
    count: () => knownRooms.size,
  };
}
export type Store = ReturnType<typeof createStore>;
