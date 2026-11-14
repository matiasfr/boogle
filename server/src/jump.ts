// Playtest jump-ins (docs/plans/playtest-jump-in.md): POST /jump { stage, ns } makes a fresh private room seeded at a
// stage of the route and answers its plain name. The server names the room (the body can't), writes the seed as the
// room's first save through the store's never-overwrite create, and records the stage in a sidecar,
// DATA_DIR/jumps/<roomId>.json ({ stage, at, build }): room metadata outside the world, shown as `seed` on
// GET /rooms/:id/host. The shared `boogle` world can never be seeded: it fails the jump room pattern, and seedRoom
// refuses any room that is loaded or already has a save.
//
// Seeds come from the image's prebuilt docs (./seeds/prebuild.ts, `JUMP_BUILD=prebuilt` in production, which never
// builds at runtime), or, anywhere else, from a worker build (./seeds/worker.ts), one at a time, then cached in memory.
// Test rooms idle JUMP_IDLE_DAYS are deleted (boot and before each jump), and at most JUMP_MAX_ROOMS exist, so jumps
// can't fill the store's MAX_ROOMS. A UTC day allows JUMP_MAX_PER_DAY jump-ins, at most JUMP_MAX_PER_ADDRESS_DAY of them
// from one address (an IPv6 /64), so one visitor can't switch jump-ins off for everyone; only a jump that succeeds counts.
//
//   const jumps = addJump(app, cfg, { store, roomHost, limit })
//   await jumps.boot()            before rooms load: drop old-namespace sidecars, sweep idle test rooms
//   jumps.seedOf(id)              { stage, at } for a jump room, or null
//   await jumps.seedRoom(id, stage)   the guarded core (exported for tests): { status, error? }
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import express from 'express';
import type { Express, Request, RequestHandler, Response, NextFunction } from 'express';
import type { Store } from './store.ts';
import type { RoomHost } from './host/rooms.ts';
import type { SeedDoc } from './seeds/build.ts';
import type { SeedManifest } from './seeds/prebuild.ts';
import { currentRoomId, roomNamespaces } from './room-ids.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { RAILWAY_PLAY_NS, railwayRoomId } from '../../src/world/railway-namespace.ts';
import {
  JUMP_ADDRESS_ERROR,
  JUMP_DAY_ERROR,
  JUMP_ROOM_RE,
  jumpRoomName,
  type JumpReply,
  type RoomSeed,
} from '../../src/world/railway-jump.ts';
import { isSeedStage, type SeedStage } from '../../src/sim/railway-seeds.ts';
import { clientAddress, MAX_CLIENT_ADDRESSES, rememberAddress } from './client-address.ts';

export type JumpConfig = {
  replaceFlyProxy?: boolean;
  dataDir: string;
  build: string;
  serverRooms: string[];
  log: (...a: unknown[]) => void;
  /** Jump-ins a UTC day: for everyone, and for one address (an IPv6 /64), so one visitor can't use up the day. */
  jumpMaxPerDay: number;
  jumpMaxPerAddressDay: number;
  jumpBuild: 'any' | 'prebuilt';
  jumpIdleDays: number;
  jumpMaxRooms: number;
  /** Where prebuilt docs live (default server/seeds). */
  jumpSeedsDir?: string;
  /** Test seam: builds a doc in place of the worker. */
  jumpBuildDoc?: (stage: SeedStage) => Promise<SeedDoc>;
};
type Sidecar = RoomSeed & { build: string };
export type SeedResult = { status: 200 | 409 | 500 | 503 | 507; error?: string };

const BUILD_TIMEOUT_MS = 60_000;
const SUFFIX = 'abcdefghijklmnopqrstuvwxyz0123456789';
const suffix = () => [...crypto.randomBytes(6)].map((b) => SUFFIX[b % 36]).join('');
const okDoc = (doc: unknown): doc is SeedDoc =>
  !!doc &&
  typeof doc === 'object' &&
  Number.isSafeInteger((doc as SeedDoc).tick) &&
  (doc as SeedDoc).tick >= 0 &&
  !!(doc as SeedDoc).data &&
  typeof (doc as SeedDoc).data === 'object';

function workerBuild(stage: SeedStage): Promise<SeedDoc> {
  const worker = new Worker(new URL('./seeds/worker.ts', import.meta.url), {
    workerData: { stage },
    resourceLimits: { maxOldGenerationSizeMb: 192 },
  });
  return new Promise<SeedDoc>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`seed ${stage}: build timed out`)), BUILD_TIMEOUT_MS);
    const finish = (error: Error | null, doc?: SeedDoc) => {
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(doc!);
    };
    worker.once('message', (m: { ok: true; doc: SeedDoc } | { ok: false; error: string }) =>
      m.ok && okDoc(m.doc) ? finish(null, m.doc) : finish(new Error(m.ok ? 'invalid seed' : m.error)),
    );
    worker.once('error', (e: unknown) => finish(e instanceof Error ? e : new Error(String(e))));
    worker.once('exit', (code) => finish(new Error(`seed ${stage}: worker stopped (${code})`)));
  }).finally(() => void worker.terminate());
}

/** Whose budget a request spends: an IPv4 address, or an IPv6 address's /64 (one home network or phone hands out many). */
export function addressKey(ip: string | undefined): string {
  const a = (ip ?? '').toLowerCase().split('%')[0]!;
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(a);
  if (v4) return v4[1]!;
  if (!a.includes(':')) return a || 'unknown';
  const [head, tail = ''] = a.split('::');
  const parts = (s: string) => s.split(':').filter(Boolean);
  const h = parts(head!),
    t = parts(tail);
  const groups = a.includes('::') ? [...h, ...Array<string>(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
  return `${groups
    .slice(0, 4)
    .map((g) => (parseInt(g, 16) || 0).toString(16))
    .join(':')}::/64`;
}

export function addJump(
  app: Express,
  cfg: JumpConfig,
  {
    store,
    roomHost,
    limit,
    replaced = () => false,
    reserved = () => false,
  }: {
    store: Store;
    roomHost: () => RoomHost | null;
    limit: RequestHandler;
    replaced?: (id: string) => boolean;
    reserved?: (id: string) => boolean;
  },
) {
  const ns = roomNamespaces(cfg.serverRooms);
  const dir = path.join(cfg.dataDir, 'jumps');
  const sidecarFor = (id: string) => path.join(dir, `${id}.json`);
  const seedsDir = cfg.jumpSeedsDir ?? fileURLToPath(new URL('../seeds/', import.meta.url));
  const seeds = new Map<string, Sidecar>(); // roomId -> its sidecar, every one on disk
  const cache = new Map<SeedStage, SeedDoc>();
  const building = new Map<SeedStage, Promise<SeedDoc>>();
  let queue: Promise<unknown> = Promise.resolve();
  let manifest: SeedManifest | null | undefined;
  // Today's jump-ins, counted when one succeeds. A request in flight holds a reservation (taken synchronously after the
  // sweep, so concurrent jumps can't overshoot a cap) that counts against the room cap and both day budgets until it
  // either becomes a room or is refused.
  let day = '',
    today = 0;
  const byAddress = new Map<string, number>(); // address key -> today's jump-ins
  const pending = new Map<string, number>(); // address key -> reservations in flight
  let reserving = 0, // reservations in flight
    reservedRooms = 0; // of those, the ones not yet in `seeds`

  const loaded = (id: string) => !!roomHost()?.room(id) || reserved(id);
  async function prebuilt(): Promise<SeedManifest | null> {
    if (manifest !== undefined) return manifest;
    try {
      const m = JSON.parse(await fs.readFile(path.join(seedsDir, 'manifest.json'), 'utf8')) as SeedManifest;
      // A manifest from another world is ignored: its docs would load as the wrong namespace.
      manifest = m && m.ns === RAILWAY_PLAY_NS && Array.isArray(m.stages) ? m : null;
    } catch {
      manifest = null;
    }
    return manifest;
  }
  const hasPrebuilt = async (stage: SeedStage) => !!(await prebuilt())?.stages.includes(stage);
  /** The doc for a stage: the memory cache, then the image's prebuilt file, then (if allowed) a worker build. */
  async function docFor(stage: SeedStage): Promise<SeedDoc | SeedResult> {
    const hit = cache.get(stage);
    if (hit) return hit;
    if (await hasPrebuilt(stage)) {
      try {
        const doc: unknown = JSON.parse(await fs.readFile(path.join(seedsDir, `${stage}.json`), 'utf8'));
        if (!okDoc(doc)) throw new Error('invalid seed');
        cache.set(stage, doc);
        return doc;
      } catch (error) {
        cfg.log(`jump ${stage}: prebuilt seed unreadable`, String(error));
        return { status: 503, error: 'stage not built' };
      }
    }
    if (cfg.jumpBuild === 'prebuilt') return { status: 503, error: 'stage not built' };
    let job = building.get(stage);
    if (!job) {
      // One build at a time, with at most one more stage waiting.
      if (building.size >= 2) return { status: 503, error: 'busy' };
      const build = cfg.jumpBuildDoc ?? workerBuild;
      job = queue.then(() => build(stage));
      queue = job.catch(() => {});
      building.set(stage, job);
      void job.then(
        (doc) => cache.set(stage, doc),
        () => {},
      );
      void queue.then(() => building.delete(stage));
    }
    try {
      return await job;
    } catch (error) {
      cfg.log(`jump ${stage}: seed build failed`, String(error));
      return { status: 500, error: 'seed build failed' };
    }
  }

  /** Seed a new jump room: refuses (409) anything but an unloaded, unsaved, current room with a jump room's name. */
  async function seedRoom(id: string, stage: SeedStage | 'start'): Promise<SeedResult> {
    const name = id.startsWith(`${RAILWAY_PLAY_NS}-`) ? id.slice(RAILWAY_PLAY_NS.length + 1) : '';
    if (!JUMP_ROOM_RE.test(name) || railwayRoomId(name) !== id) return { status: 409, error: 'not a jump room' };
    if (!currentRoomId(id, ns)) return { status: 409, error: 'not a current room' };
    if (loaded(id)) return { status: 409, error: 'room is loaded' };
    if (store.known(id)) return { status: 409, error: 'room has a save' };
    if (stage === 'start') return { status: 200 };
    const doc = await docFor(stage);
    if ('status' in doc) return doc;
    if (loaded(id)) return { status: 409, error: 'room is loaded' };
    // Stamped now, never the build's time: the away credit counts from it, so a funded job doesn't finish by itself.
    const r = await store.create(id, {
      tick: doc.tick,
      writerId: SERVER_ID,
      data: doc.data,
      updatedAt: new Date().toISOString(),
    });
    return r.status === 200 ? { status: 200 } : { status: r.status, error: String(r.body.error) };
  }

  async function forget(id: string) {
    seeds.delete(id);
    await fs.rm(sidecarFor(id), { force: true });
  }
  /** Delete test rooms nobody has touched in jumpIdleDays (their save and sidecar), never a loaded one. */
  async function sweep(now = Date.now()) {
    const cutoff = now - cfg.jumpIdleDays * 86_400_000;
    for (const [id, seed] of [...seeds]) {
      if (replaced(id)) {
        await forget(id);
        continue;
      }
      const file = path.join(cfg.dataDir, `${id}.json`);
      const touched = Math.max(
        Date.parse(seed.at) || 0,
        fsSync.statSync(file, { throwIfNoEntry: false })?.mtimeMs ?? 0,
      );
      if (touched >= cutoff) continue;
      const gone = await store.withLock(id, async () => {
        // Checked and removed in one synchronous step, so a join can't load the room in between.
        if (loaded(id)) return false;
        fsSync.rmSync(file, { force: true });
        store.forget(id);
        return true;
      });
      if (!gone) continue;
      await forget(id);
      cfg.log(`jump room ${id} idle since ${new Date(touched).toISOString()}: deleted`);
    }
  }

  app.post(
    '/jump',
    limit,
    express.json({ limit: '1kb', type: ['application/json', 'text/plain'] }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body: unknown = req.body;
        if (!body || typeof body !== 'object' || Array.isArray(body))
          return res.status(400).json({ error: 'body must be { stage, ns }' });
        const { stage, ns: pageNs, ...rest } = body as Record<string, unknown>;
        if (Object.keys(rest).length || typeof stage !== 'string' || typeof pageNs !== 'string')
          return res.status(400).json({ error: 'body must be { stage, ns }' });
        if (stage !== 'start' && !isSeedStage(stage)) return res.status(400).json({ error: 'unknown stage' });
        if (stage !== 'start' && cfg.jumpBuild === 'prebuilt' && !(await hasPrebuilt(stage)))
          return res.status(503).json({ error: 'stage not built' });
        if (pageNs !== RAILWAY_PLAY_NS) return res.status(409).json({ error: 'world changed', ns: RAILWAY_PLAY_NS });
        await sweep();
        // From here to the reservation is synchronous: no await between the checks and taking the slot.
        const utc = new Date().toISOString().slice(0, 10);
        if (utc !== day) {
          [day, today] = [utc, 0];
          byAddress.clear();
        }
        const who = addressKey(clientAddress(req, cfg.replaceFlyProxy));
        const used = byAddress.get(who) ?? 0;
        if (used) rememberAddress(byAddress, who, used);
        if (today + reserving >= cfg.jumpMaxPerDay) return res.status(429).json({ error: JUMP_DAY_ERROR });
        // Never evict a live reservation: its completion must still release exactly its own count.
        if (!pending.has(who) && pending.size >= MAX_CLIENT_ADDRESSES)
          return res.status(429).json({ error: JUMP_DAY_ERROR });
        if (used + (pending.get(who) ?? 0) >= cfg.jumpMaxPerAddressDay)
          return res.status(429).json({ error: JUMP_ADDRESS_ERROR });
        if (seeds.size + reservedRooms >= cfg.jumpMaxRooms)
          return res.status(507).json({ error: 'too many test rooms' });
        reserving++;
        reservedRooms++;
        pending.set(who, (pending.get(who) ?? 0) + 1);
        let roomReserved = true; // still counted in reservedRooms, not yet in `seeds`
        let id = '';
        try {
          await fs.mkdir(dir, { recursive: true });
          let name = '';
          for (let tries = 0; tries < 3 && !id; tries++) {
            name = jumpRoomName(stage, suffix());
            const candidate = railwayRoomId(name);
            if (store.known(candidate) || seeds.has(candidate)) continue;
            const sidecar: Sidecar = { stage, at: new Date().toISOString(), build: cfg.build };
            try {
              // The sidecar names the room: `wx` refuses a name another request just took.
              await fs.writeFile(sidecarFor(candidate), JSON.stringify(sidecar), { flag: 'wx' });
            } catch (e) {
              if ((e as NodeJS.ErrnoException).code === 'EEXIST') continue;
              throw e;
            }
            seeds.set(candidate, sidecar);
            reservedRooms--;
            roomReserved = false;
            id = candidate;
          }
          if (!id) return res.status(503).json({ error: 'no free room name' });
          let result: SeedResult;
          try {
            result = await seedRoom(id, stage);
          } catch (e) {
            await forget(id); // a throw (the store's write) leaves no sidecar for a room with no save
            throw e;
          }
          if (result.status !== 200) {
            await forget(id);
            return res.status(result.status).json({ error: result.error });
          }
          today++;
          rememberAddress(byAddress, who, (byAddress.get(who) ?? 0) + 1);
          cfg.log(`jump ${stage} -> ${id}`);
          const reply: JumpReply = { room: name, stage };
          res.set('Cache-Control', 'no-store').json(reply);
        } finally {
          reserving--;
          if (roomReserved) reservedRooms--;
          const left = (pending.get(who) ?? 1) - 1;
          if (left > 0) pending.set(who, left);
          else pending.delete(who);
        }
      } catch (e) {
        next(e);
      }
    },
  );

  return {
    docFor,
    seedRoom,
    seedOf(id: string): RoomSeed | null {
      if (replaced(id)) return null;
      const s = seeds.get(id);
      return s ? { stage: s.stage, at: s.at } : null;
    },
    async boot(now = Date.now()) {
      seeds.clear();
      for (const file of await fs.readdir(dir).catch((): string[] => [])) {
        const id = /^([a-z0-9-]{1,32})\.json$/.exec(file)?.[1];
        if (!id) continue;
        if (replaced(id)) {
          await forget(id);
          continue;
        }
        // A sidecar for an old namespace goes with that world (boot cleanup trashes its room file).
        if (!currentRoomId(id, ns) || !id.startsWith(`${RAILWAY_PLAY_NS}-`)) {
          await fs.rm(path.join(dir, file), { force: true });
          continue;
        }
        // Only a jump room's name is ever indexed (and so ever swept): never `boogle` or a hand-named room.
        if (!JUMP_ROOM_RE.test(id.slice(RAILWAY_PLAY_NS.length + 1))) continue;
        try {
          const s = JSON.parse(await fs.readFile(path.join(dir, file), 'utf8')) as Sidecar;
          if (typeof s.stage === 'string' && typeof s.at === 'string') seeds.set(id, s);
        } catch (error) {
          cfg.log(`jump sidecar ${file} unreadable`, String(error));
        }
      }
      await sweep(now);
    },
  };
}
export type Jumps = ReturnType<typeof addJump>;
