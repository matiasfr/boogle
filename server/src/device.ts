// Device runs' stills (docs/plans/remote-device-tests.md, step 3): the one thing playdata cannot hold, a JPEG per scene
// of a device run, and runs the server knows about in advance. The numbers stay in playdata (./playdata.ts).
//
//   POST /device/runs                     register a run: Bearer REPORT_TOKEN, JSON { id, suite, label }. 201 made,
//                                         200 already known; 400 bad shape; 401/404 token; 507 a cap.
//   POST /device/runs/:id/still/:scene    one still of a registered run: the run id is the credential, the body raw
//                                         `image/jpeg`. 204 stored; 400 bad id, scene or not a JPEG; 404 a run the
//                                         server does not know, one past its 7 days, or no REPORT_TOKEN; 408 a body
//                                         slower than 30 s; 413 over 400 kB; 429 rate; 507 a cap or the thirteenth.
//   GET  /device/runs/:id/stills          the run and its stills' scenes (Bearer REPORT_TOKEN)
//   GET  /device/runs/:id/still/:scene    one still's bytes, application/octet-stream, no-store (Bearer REPORT_TOKEN)
//
// Only `npm run device -- new` (with the token) makes a run, so a self-minted `?device=new` run's stills are refused
// (404). Deferred: a flood of self-minted runs would fill the caps for 30 days (docs/plans/remote-device-tests.md, step
// 3). The upload is public all the same, so everything is bounded: 400 kB a still, 12 stills a run, uploads for 7 days
// after a run is made, DEVICE_MAX_RUNS runs (50) and DEVICE_MAX_BYTES on disk (20 MB) in all, and a free-volume reserve
// (128 MiB, as reviews keep); past those it answers 507, it never evicts. A still's body goes through a small streaming
// reader: a declared length over 400 kB is refused before a byte is read, and a body that passes 400 kB while it
// streams is answered 413 with `Connection: close` and its socket closed, so neither is read to its end. Runs past 30 days are deleted on the first write of a UTC
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
  reportToken: string;
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
const BODY_MS = 30_000; // a still's body must arrive within this

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

/** Answers and closes the connection, so an unread body is never read off (and a body that never ends is answered). */
function refuse(req: Request, res: Response, status: number, error: string) {
  if (res.headersSent) return;
  res.set('Connection', 'close');
  res.once('finish', () => req.socket.destroy());
  res.status(status).json({ error });
}

/** Reads a still's body into `req.body`: image/jpeg only, at most STILL_BYTES, within BODY_MS; else answers itself. */
function readStill(req: Request, res: Response, next: NextFunction) {
  if (!req.is('image/jpeg')) return refuse(req, res, 400, 'body must be a JPEG (Content-Type: image/jpeg)');
  const declared = req.get('content-length');
  if (declared !== undefined && !(Number(declared) <= STILL_BYTES)) return refuse(req, res, 413, 'payload too large');
  const chunks: Buffer[] = [];
  let size = 0;
  const stop = () => {
    clearTimeout(timer);
    req.off('data', onData);
    req.off('end', onEnd);
    req.off('error', stop);
    req.off('close', stop);
  };
  const timer = setTimeout(() => {
    stop();
    refuse(req, res, 408, 'the still took too long');
  }, BODY_MS);
  function onData(c: Buffer) {
    size += c.length;
    if (size <= STILL_BYTES) return void chunks.push(c);
    stop();
    req.pause();
    refuse(req, res, 413, 'payload too large');
  }
  function onEnd() {
    stop();
    req.body = Buffer.concat(chunks, size);
    next();
  }
  req.on('data', onData);
  req.on('end', onEnd);
  req.on('error', stop); // the client went away: nobody to answer
  req.on('close', stop);
}

/** Adds the routes. `limit` bounds the public still uploads per IP, `tokenLimit` the token routes (register and the
 * reads), `authed` the token check. */
export function addDevice(
  app: Express,
  cfg: DeviceConfig,
  opts: {
    limit: RequestHandler;
    tokenLimit: RequestHandler;
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
  const lock = <T>(fn: () => Promise<T>) => opts.withLock('device:storage', fn);

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

  // The first write of a UTC day deletes runs made more than KEEP_DAYS ago, folders a crash left without a run, and
  // temp files a crash left mid-write (every write holds the lock, so none is in flight).
  async function sweep() {
    const day = new Date(now()).toISOString().slice(0, 10);
    if (day === sweptDay) return;
    sweptDay = day;
    for (const name of await names(root)) {
      if (!HASH_RE.test(name)) {
        if (name.endsWith('.tmp')) await fs.rm(path.join(root, name), { recursive: true, force: true });
        continue;
      }
      const run = await readRun(name);
      if (run && now() - Date.parse(run.made) <= KEEP_DAYS * DAY_MS) {
        for (const f of await names(runDir(name)))
          if (f.endsWith('.tmp')) await fs.rm(path.join(runDir(name), f), { force: true });
        continue;
      }
      await fs.rm(runDir(name), { recursive: true, force: true });
      cfg.log('device: deleted old run', name.slice(0, 12));
    }
  }

  function freshRun(hash: string, suite: string, label: string): RunFile {
    const t = now();
    return {
      v: 1,
      hash,
      suite,
      label,
      made: new Date(t).toISOString(),
      expires: new Date(t + UPLOAD_DAYS * DAY_MS).toISOString(),
      stills: [],
    };
  }

  app.post(
    '/device/runs',
    opts.tokenLimit,
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
      const run = freshRun(hash, b.suite, (b.label ?? '') as string);
      try {
        const status = await lock(async () => {
          await sweep();
          if (await readRun(hash)) return 200;
          if (!(await fits(RUN_FILE_BYTES, true))) return 507;
          await fs.mkdir(runDir(hash), { recursive: true });
          await replaceFile(runFile(hash), JSON.stringify(run));
          return 201;
        });
        if (status === 507) return res.status(507).json({ error: 'device storage full' });
        res.status(status).json({ expires: run.expires });
      } catch (e) {
        next(e);
      }
    },
  );

  // Checks the id and scene before the body is read, so a malformed one writes nothing and costs no upload. With no
  // REPORT_TOKEN nobody could read a still back (or register a run), so none is taken: 404, as the other routes answer.
  const validStill = (req: Request<{ id: string; scene: string }>, res: Response, next: NextFunction) => {
    if (!cfg.reportToken) return refuse(req, res, 404, 'not found');
    if (!RUN_ID_RE.test(req.params.id) || !SCENE_RE.test(req.params.scene))
      return refuse(req, res, 400, 'invalid run id or scene');
    next();
  };

  app.post(
    '/device/runs/:id/still/:scene',
    opts.limit,
    validStill,
    readStill,
    async (req: Request<{ id: string; scene: string }>, res: Response, next: NextFunction) => {
      const body: unknown = req.body;
      if (!Buffer.isBuffer(body) || !isJpeg(body))
        return res.status(400).json({ error: 'body must be a JPEG (Content-Type: image/jpeg)' });
      const hash = hashOf(req.params.id);
      const scene = req.params.scene;
      try {
        const status = await lock(async () => {
          await sweep();
          const run = await readRun(hash);
          if (!run || now() > Date.parse(run.expires)) return 404;
          const same = run.stills.find((s) => s.scene === scene);
          if (!same && run.stills.length >= MAX_STILLS) return 507;
          if (!(await fits(Math.max(0, body.length - (same?.bytes ?? 0)), false))) return 507;
          const slot = same?.slot ?? run.stills.length;
          await replaceFile(stillFile(hash, slot), body);
          const entry = { scene, slot, bytes: body.length, at: new Date(now()).toISOString() };
          run.stills = same ? run.stills.map((s) => (s === same ? entry : s)) : [...run.stills, entry];
          await replaceFile(runFile(hash), JSON.stringify(run));
          return 204;
        });
        if (status === 404)
          return res.status(404).json({ error: 'no such run, or it no longer takes stills (npm run device -- new)' });
        if (status === 507) return res.status(507).json({ error: 'device storage full, or the run has 12 stills' });
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    '/device/runs/:id/stills',
    opts.tokenLimit,
    async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
      if (!opts.authed(req, res)) return;
      if (!RUN_ID_RE.test(req.params.id)) return res.status(400).json({ error: 'invalid run id' });
      try {
        const run = await lock(() => readRun(hashOf(req.params.id)));
        if (!run) return res.status(404).json({ error: 'not found' });
        const out: DeviceStills = {
          suite: run.suite,
          label: run.label,
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
    opts.tokenLimit,
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
