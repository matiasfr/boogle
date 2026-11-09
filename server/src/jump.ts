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
// can't fill the store's MAX_ROOMS.
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
import { JUMP_ROOM_RE, jumpRoomName, type JumpReply, type RoomSeed } from '../../src/world/railway-jump.ts';
import { isSeedStage, type SeedStage } from '../../src/sim/railway-seeds.ts';

export type JumpConfig = {
  dataDir: string;
  build: string;
  serverRooms: string[];
  log: (...a: unknown[]) => void;
  jumpMaxPerDay: number;
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

export function addJump(
  app: Express,
  cfg: JumpConfig,
  { store, roomHost, limit }: { store: Store; roomHost: () => RoomHost | null; limit: RequestHandler },
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
  let day = '',
    today = 0;

  const loaded = (id: string) => !!roomHost()?.room(id);
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
        const utc = new Date().toISOString().slice(0, 10);
        if (utc !== day) [day, today] = [utc, 0];
        if (today >= cfg.jumpMaxPerDay) return res.status(429).json({ error: 'too many jump-ins today' });
        today++;
        await sweep();
        if (seeds.size >= cfg.jumpMaxRooms) return res.status(507).json({ error: 'too many test rooms' });
        await fs.mkdir(dir, { recursive: true });
        let id = '',
          name = '';
        for (let tries = 0; tries < 3 && !id; tries++) {
          name = jumpRoomName(stage, suffix());
          const candidate = railwayRoomId(name);
          if (store.known(candidate) || seeds.has(candidate)) continue;
          const sidecar: Sidecar = { stage, at: new Date().toISOString(), build: cfg.build };
          try {
            // The sidecar is the reservation: `wx` refuses a name another request just took.
            await fs.writeFile(sidecarFor(candidate), JSON.stringify(sidecar), { flag: 'wx' });
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code === 'EEXIST') continue;
            throw e;
          }
          seeds.set(candidate, sidecar);
          id = candidate;
        }
        if (!id) return res.status(503).json({ error: 'no free room name' });
        const result = await seedRoom(id, stage);
        if (result.status !== 200) {
          await forget(id);
          return res.status(result.status).json({ error: result.error });
        }
        cfg.log(`jump ${stage} -> ${id}`);
        const reply: JumpReply = { room: name, stage };
        res.set('Cache-Control', 'no-store').json(reply);
      } catch (e) {
        next(e);
      }
    },
  );

  return {
    seedRoom,
    seedOf(id: string): RoomSeed | null {
      const s = seeds.get(id);
      return s ? { stage: s.stage, at: s.at } : null;
    },
    async boot(now = Date.now()) {
      seeds.clear();
      for (const file of await fs.readdir(dir).catch((): string[] => [])) {
        const id = /^([a-z0-9-]{1,32})\.json$/.exec(file)?.[1];
        if (!id) continue;
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
