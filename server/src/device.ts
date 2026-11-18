// Device runs' stills (docs/plans/remote-device-tests.md, step 3): the one thing playdata cannot hold, a JPEG per scene
// of a device run, and runs the server knows about in advance. The numbers stay in playdata (./playdata.ts).
//
//   POST /device/runs                     register a run: Bearer REPORT_TOKEN, JSON { id, suite, label }. 201 made,
//                                         200 already known; 400 bad shape; 401/404 token; 507 a cap.
//   POST /device/runs/:id/still/:scene    one still: the run id is the credential, the body raw `image/jpeg`. 204
//                                         stored; 400 bad id, scene or not a JPEG; 404 expired; 413 over 400 kB; 429
//                                         rate; 507 a cap or the thirteenth still. An id the server has not seen is
//                                         registered by its first valid still (a self-minted `?device=new` run).
//   GET  /device/runs/:id/stills          the run and its stills' scenes (Bearer REPORT_TOKEN)
//   GET  /device/runs/:id/still/:scene    one still's bytes, application/octet-stream, no-store (Bearer REPORT_TOKEN)
//
// The endpoint is public, so everything is bounded: 400 kB a still, 12 stills a run, uploads for 7 days after a run is
// made, DEVICE_MAX_RUNS runs (50) and DEVICE_MAX_BYTES on disk (20 MB) in all, and a free-volume reserve (128 MiB, as
// reviews keep); past those it answers 507, it never evicts. Runs past 30 days are deleted on the first write of a UTC
// day. The server keeps only sha256(id): a run's folder is DATA_DIR/device/<sha256 hex>, its stills `<n>.jpg` by the
// server's own slot number, and the scene names live inside run.json. Neither an id nor a scene ever becomes a path.
// Stills are stored as opaque bytes, checked only for the JPEG start and end markers, never decoded. No IP or header is
// kept. Imports nothing from src/ (the server image, test/server-image.test.ts).
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { Express, NextFunction, Request, RequestHandler, Response } from 'express';

export type DeviceConfig = {
  dataDir: string;
  deviceMaxRuns: number;
  deviceMaxBytes: number;
  deviceFreeReserve: number;
  /** Test seam: the server's clock (ms). */
  deviceNow?: () => number;
  log: (...a: unknown[]) => void;
};

/** POST /device/runs (wire shape). */
export type DeviceRegister = { id: string; suite: string; label: string };
/** GET /device/runs/:id/stills (wire shape). */
export type DeviceStills = {
  suite: string;
  label: string;
  self: boolean;
  made: string;
  expires: string;
  stills: { scene: string; bytes: number; at: string }[];
};

/** run.json on disk. `hash` is sha256(id); the id itself is never stored. */
type RunFile = {
  v: 1;
  hash: string;
  suite: string;
  label: string;
  self: boolean;
  made: string;
  expires: string;
  stills: { scene: string; slot: number; bytes: number; at: string }[];
};

// The page's run id (src/debug/device/id.ts RUN_ID_RE; repeated here: the server imports nothing from src/).
const RUN_ID_RE = /^dv-[a-z0-9]{26}$/;
const SCENE_RE = /^[a-z0-9-]{1,24}$/;
const SUITE_RE = /^[a-z0-9-]{1,24}$/;
const LABEL_RE = /^[a-z0-9-]{0,40}$/;
const HASH_RE = /^[0-9a-f]{64}$/;
export const STILL_BYTES = 400 * 1024;
export const MAX_STILLS = 12;
const UPLOAD_DAYS = 7;
const KEEP_DAYS = 30;
const DAY_MS = 86_400_000;
const RUN_FILE_BYTES = 4096; // a run.json at its largest, reserved against the caps

const hashOf = (id: string) => crypto.createHash('sha256').update(id).digest('hex');
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isJpeg = (b: Buffer) =>
  b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff && b.at(-2) === 0xff && b.at(-1) === 0xd9;

function parseRun(text: string, hash: string): RunFile | null {
  try {
    const r = JSON.parse(text) as RunFile;
    return object(r) && r.v === 1 && r.hash === hash && Array.isArray(r.stills) ? r : null;
  } catch {
    return null;
  }
}

async function names(dir: string) {
  try {
    return await fs.readdir(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

/** Writes beside the target and renames over it, so a crash leaves the old file or the new one. */
async function replaceFile(file: string, data: string | Buffer) {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temp, data, { flag: 'wx' });
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true });
  }
}

/** Adds the routes. `limit` bounds the public writes per IP, `readLimit` the token reads, `authed` the token check. */
export function addDevice(
  app: Express,
  cfg: DeviceConfig,
  opts: {
    limit: RequestHandler;
    readLimit: RequestHandler;
    authed: (req: Request, res: Response) => boolean;
    withLock: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  },
) {
  const root = path.join(cfg.dataDir, 'device');
  const now = () => (cfg.deviceNow ? cfg.deviceNow() : Date.now());
  const runDir = (hash: string) => path.join(root, hash);
  const runFile = (hash: string) => path.join(runDir(hash), 'run.json');
  const stillFile = (hash: string, slot: number) => path.join(runDir(hash), `${slot}.jpg`);
  let sweptDay = '';
  const lock = <T>(fn: () => Promise<T>) => opts.withLock('device', fn);

  async function readRun(hash: string): Promise<RunFile | null> {
    try {
      return parseRun(await fs.readFile(runFile(hash), 'utf8'), hash);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  /** The run folders on disk and their bytes in all. */
  async function usage() {
    let bytes = 0;
    let runs = 0;
    for (const name of await names(root)) {
      if (!HASH_RE.test(name)) continue;
      runs++;
      for (const f of await names(runDir(name))) bytes += (await fs.lstat(path.join(runDir(name), f))).size;
    }
    return { runs, bytes };
  }

  /** Whether `bytes` more (and a new run if `fresh`) fit under the caps and the free-volume reserve. */
  async function fits(bytes: number, fresh: boolean) {
    const u = await usage();
    if (fresh && u.runs >= cfg.deviceMaxRuns) return false;
    if (u.bytes + bytes > cfg.deviceMaxBytes) return false;
    const stat = await fs.statfs(cfg.dataDir);
    return stat.bavail * stat.bsize - bytes >= cfg.deviceFreeReserve;
  }

  // The first write of a UTC day deletes runs made more than KEEP_DAYS ago, and folders a crash left without a run.
  async function sweep() {
    const day = new Date(now()).toISOString().slice(0, 10);
    if (day === sweptDay) return;
    sweptDay = day;
    for (const name of await names(root)) {
      if (!HASH_RE.test(name)) continue;
      const run = await readRun(name);
      if (run && now() - Date.parse(run.made) <= KEEP_DAYS * DAY_MS) continue;
      await fs.rm(runDir(name), { recursive: true, force: true });
      cfg.log('device: deleted old run', name.slice(0, 12));
    }
  }

  function freshRun(hash: string, suite: string, label: string, self: boolean): RunFile {
    const t = now();
    return {
      v: 1,
      hash,
      suite,
      label,
      self,
      made: new Date(t).toISOString(),
      expires: new Date(t + UPLOAD_DAYS * DAY_MS).toISOString(),
      stills: [],
    };
  }

  async function createRun(run: RunFile) {
    await fs.mkdir(runDir(run.hash), { recursive: true });
    await replaceFile(runFile(run.hash), JSON.stringify(run));
  }

  app.post(
    '/device/runs',
    opts.limit,
    (req: Request, res: Response, next: NextFunction) => {
      if (opts.authed(req, res)) next();
    },
    express.json({ limit: '2kb' }),
    async (req: Request, res: Response, next: NextFunction) => {
      const b: unknown = req.body;
      if (
        !object(b) ||
        typeof b.id !== 'string' ||
        !RUN_ID_RE.test(b.id) ||
        typeof b.suite !== 'string' ||
        !SUITE_RE.test(b.suite) ||
        typeof (b.label ?? '') !== 'string' ||
        !LABEL_RE.test((b.label ?? '') as string)
      )
        return res.status(400).json({ error: 'body must be { id: "dv-" + 26 of [a-z0-9], suite, label }' });
      const hash = hashOf(b.id);
      const run = freshRun(hash, b.suite, (b.label ?? '') as string, false);
      try {
        const status = await lock(async () => {
          await sweep();
          if (await readRun(hash)) return 200;
          if (!(await fits(RUN_FILE_BYTES, true))) return 507;
          await createRun(run);
          return 201;
        });
        if (status === 507) return res.status(507).json({ error: 'device storage full' });
        res.status(status).json({ expires: run.expires });
      } catch (e) {
        next(e);
      }
    },
  );

  // Checks the id and scene before the body is read, so a malformed one writes nothing and costs no upload.
  const validStill = (req: Request<{ id: string; scene: string }>, res: Response, next: NextFunction) => {
    if (!RUN_ID_RE.test(req.params.id) || !SCENE_RE.test(req.params.scene))
      return res.status(400).json({ error: 'invalid run id or scene' });
    next();
  };

  app.post(
    '/device/runs/:id/still/:scene',
    opts.limit,
    validStill,
    express.raw({ type: 'image/jpeg', limit: STILL_BYTES }),
    async (req: Request<{ id: string; scene: string }>, res: Response, next: NextFunction) => {
      const body: unknown = req.body;
      if (!Buffer.isBuffer(body) || !isJpeg(body))
        return res.status(400).json({ error: 'body must be a JPEG (Content-Type: image/jpeg)' });
      const hash = hashOf(req.params.id);
      const scene = req.params.scene;
      try {
        const status = await lock(async () => {
          await sweep();
          const was = await readRun(hash);
          if (was && now() > Date.parse(was.expires)) return 404;
          const run = was ?? freshRun(hash, '', '', true);
          const same = run.stills.find((s) => s.scene === scene);
          if (!same && run.stills.length >= MAX_STILLS) return 507;
          const extra = body.length - (same?.bytes ?? 0) + (was ? 0 : RUN_FILE_BYTES);
          if (!(await fits(Math.max(0, extra), !was))) return 507;
          if (!was) await createRun(run);
          const slot = same?.slot ?? run.stills.length;
          await replaceFile(stillFile(hash, slot), body);
          const entry = { scene, slot, bytes: body.length, at: new Date(now()).toISOString() };
          run.stills = same ? run.stills.map((s) => (s === same ? entry : s)) : [...run.stills, entry];
          await replaceFile(runFile(hash), JSON.stringify(run));
          return 204;
        });
        if (status === 404) return res.status(404).json({ error: 'this run no longer takes stills' });
        if (status === 507) return res.status(507).json({ error: 'device storage full, or the run has 12 stills' });
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/device/runs/:id/stills',
    opts.readLimit,
    async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
      if (!opts.authed(req, res)) return;
      if (!RUN_ID_RE.test(req.params.id)) return res.status(400).json({ error: 'invalid run id' });
      try {
        const run = await lock(() => readRun(hashOf(req.params.id)));
        if (!run) return res.status(404).json({ error: 'not found' });
        const out: DeviceStills = {
          suite: run.suite,
          label: run.label,
          self: run.self,
          made: run.made,
          expires: run.expires,
          stills: run.stills.map((s) => ({ scene: s.scene, bytes: s.bytes, at: s.at })),
        };
        res.set('Cache-Control', 'no-store').json(out);
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/device/runs/:id/still/:scene',
    opts.readLimit,
    async (req: Request<{ id: string; scene: string }>, res: Response, next: NextFunction) => {
      if (!opts.authed(req, res)) return;
      if (!RUN_ID_RE.test(req.params.id) || !SCENE_RE.test(req.params.scene))
        return res.status(400).json({ error: 'invalid run id or scene' });
      const hash = hashOf(req.params.id);
      try {
        const bytes = await lock(async () => {
          const still = (await readRun(hash))?.stills.find((s) => s.scene === req.params.scene);
          return still ? fs.readFile(stillFile(hash, still.slot)) : null;
        });
        if (!bytes) return res.status(404).json({ error: 'not found' });
        res.set({
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        });
        res.send(bytes);
      } catch (e) {
        next(e);
      }
    },
  );
}
