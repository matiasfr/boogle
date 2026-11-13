import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createStore } from './store.ts';
import { inventorySaves, inventoryLine } from './save-inventory.ts';
import { cleanupSaves, cleanupLine, type Cleanup } from './save-cleanup.ts';
import { roomNamespaces } from './room-ids.ts';
import { addPlaydata } from './playdata.ts';
import { addReviews } from './reviews.ts';
import { addAdmin } from './admin.ts';
import { addJump, type JumpConfig } from './jump.ts';
import { addReplace, type ReplaceConfig } from './replace.ts';
import { createReplacements } from './replacements.ts';
import { routeUpgrades } from './host/upgrade.ts';
import { createRoomHost } from './host/rooms.ts';
import type { RoomHost } from './host/rooms.ts';
import { RAIL_AWAY } from '../../src/sim/railway-away.ts';

const ROOM_ID_RE = /^[a-z0-9-]{1,32}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const REPORT_KINDS = new Set<unknown>(['error', 'desync', 'snapshot', 'connect']);
const REPORT_BATCH = 10; // reports per POST
const REPORT_KEEP_DAYS = 30;

// POST /report (wire shape): one report, or an array of up to REPORT_BATCH, as sent by the client's telemetry
// (navigator.sendBeacon, text/plain JSON). Stored as JSON lines with `at` added.
export type ReportKind = 'error' | 'desync' | 'snapshot' | 'connect';
export type ReportDetail = string | Record<string, string | number | boolean | null> | null;
export type Report = {
  room: string;
  kind: ReportKind;
  detail: ReportDetail;
  tick?: number;
  build?: string;
  ua?: string;
};
function parseTrustProxy(v: string | undefined): boolean | number | string {
  if (v === undefined || v === '') return 1; // one hop: Fly / Render / Railway
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

function list(v: string | undefined) {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Read config from env, with overrides (used by tests). */
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
  overrides: Partial<ServerConfig> = {},
): ServerConfig {
  const origins = list(env.ALLOWED_ORIGINS);
  return {
    port: Number(env.PORT ?? 9000),
    build: env.BOOGLE_BUILD || 'dev',
    dataDir: env.DATA_DIR || './data',
    allowedOrigins: origins.length ? origins : ['*'],
    maxRooms: Number(env.MAX_ROOMS ?? 1000),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    reportRatePerMin: Number(env.REPORT_RATE_PER_MIN ?? 12),
    reportMaxBytesPerDay: Number(env.REPORT_MAX_BYTES_PER_DAY ?? 5 * 1024 * 1024),
    reportToken: env.REPORT_TOKEN || '',
    advanceKey: env.ADVANCE_KEY || '',
    advanceShared: env.ADVANCE_SHARED === '1',
    replaceRatePerMin: Number(env.REPLACE_RATE_PER_MIN) || 6,
    saveCleanup: env.SAVE_CLEANUP === 'off' ? 'off' : 'trash',
    serverRooms: env.SERVER_ROOMS ? list(env.SERVER_ROOMS) : ['*'], // rooms it hosts (docs/plans/server-host.md); default all
    tuneControllerKey: env.TUNE_CONTROLLER_KEY || '',
    maxPlayers: Number(env.MAX_PLAYERS ?? 8),
    serverSaveMs: Number(env.SERVER_SAVE_MS ?? 2000),
    roomIdleMs: Number(env.ROOM_IDLE_MS ?? 600000), // with SERVER_ROOMS=*: unload a room this long after it emptied
    roomPauseMs: Number(env.ROOM_PAUSE_MS) || RAIL_AWAY.pauseMs, // a railway room stops simulating this long after it empties
    maxHostedRooms: Number(env.MAX_HOSTED_ROOMS ?? 20), // with SERVER_ROOMS=*: rooms loaded at once
    upgradesPerMin: Number(env.UPGRADES_PER_MIN) || 20, // room sockets per IP
    // || so a malformed value falls back rather than a NaN turning a cap off.
    playRatePerMin: Number(env.PLAY_RATE_PER_MIN) || 240, // POST /playdata per IP: 8 friends on one network, batching
    playNewSessionsPerHour: Number(env.PLAY_NEW_SESSIONS_PER_HOUR) || 40, // per IP; each page load is a session
    playMaxSessionBytes: Number(env.PLAY_MAX_SESSION_BYTES) || 4 * 1024 * 1024,
    playMaxTotalBytes: Number(env.PLAY_MAX_TOTAL_BYTES) || 200 * 1024 * 1024,
    playMaxSessions: Number(env.PLAY_MAX_SESSIONS) || 2000,
    // POST /jump (./jump.ts): per IP, per UTC day for everyone and per address, and where seeds come from (the image
    // sets JUMP_BUILD=prebuilt: production never builds).
    jumpRatePerMin: Number(env.JUMP_RATE_PER_MIN) || 6,
    jumpMaxPerDay: Number(env.JUMP_MAX_PER_DAY) || 500,
    jumpMaxPerAddressDay: Number(env.JUMP_MAX_PER_ADDRESS_DAY) || 30,
    jumpBuild: env.JUMP_BUILD === 'prebuilt' ? 'prebuilt' : 'any',
    jumpIdleDays: Number(env.JUMP_IDLE_DAYS) || 3, // test rooms nobody touched this long are deleted
    jumpMaxRooms: Number(env.JUMP_MAX_ROOMS) || 200, // test rooms at once, well under maxRooms
    log: (...a: unknown[]) => console.log(new Date().toISOString(), ...a),
    ...overrides,
  };
}

export type ServerConfig = ReplaceConfig & {
  build: string;
  port: number;
  dataDir: string;
  allowedOrigins: string[];
  maxRooms: number;
  trustProxy: boolean | number | string;
  reportRatePerMin: number;
  reportMaxBytesPerDay: number;
  reportToken: string;
  saveCleanup: 'trash' | 'off';
  serverRooms: string[];
  tuneControllerKey: string;
  maxPlayers: number;
  upgradesPerMin: number;
  playRatePerMin: number;
  playNewSessionsPerHour: number;
  playMaxSessionBytes: number;
  playMaxTotalBytes: number;
  playMaxSessions: number;
  jumpRatePerMin: number;
  jumpMaxPerDay: number;
  jumpMaxPerAddressDay: number;
  jumpBuild: 'any' | 'prebuilt';
  jumpIdleDays: number;
  jumpMaxRooms: number;
  jumpSeedsDir?: string; // test override: where prebuilt seeds live (default server/seeds)
  jumpBuildDoc?: JumpConfig['jumpBuildDoc']; // test seam: builds a seed in place of the worker
  replaceFailAt?: 'backup' | 'save' | 'record'; // test-only crash seam
  serverSaveMs: number;
  roomIdleMs: number;
  roomPauseMs?: number;
  maxHostedRooms: number;
  log: (...a: unknown[]) => void;
  // Test-only timing overrides, passed through to the room host (./host/hosted-room.ts, HostCfg).
  reconnectGraceMs?: number;
  deadMs?: number;
  leadHiddenMs?: number;
  housekeepMs?: number;
};

/** Simple in-memory token bucket keyed by string. */
function createRateLimiter({ perMinute }: { perMinute: number }) {
  const buckets = new Map<string, { tokens: number; t: number }>();
  const refillPerMs = perMinute / 60000;
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (now - b.t > 120000) buckets.delete(k);
  }, 60000);
  sweep.unref();
  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = req.ip || 'unknown';
    let b = buckets.get(key);
    if (!b) b = { tokens: perMinute, t: now };
    b.tokens = Math.min(perMinute, b.tokens + (now - b.t) * refillPerMs);
    b.t = now;
    buckets.set(key, b);
    if (b.tokens < 1) {
      res.set('Retry-After', String(Math.ceil((1 - b.tokens) / refillPerMs / 1000)));
      return res.status(429).json({ error: 'rate limited' });
    }
    b.tokens -= 1;
    next();
  };
  return Object.assign(middleware, { stop: () => clearInterval(sweep) });
}

// One client report, cleaned: known kind, short strings, `detail` a string or a flat object of primitives.
// Returns null if it can't be salvaged. Nothing from the request itself (IP, headers) is kept.
const cut = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, checked field by field
function cleanReport(r: any): Report | null {
  if (!r || typeof r !== 'object' || Array.isArray(r) || !REPORT_KINDS.has(r.kind)) return null;
  if (typeof r.room !== 'string' || !ROOM_ID_RE.test(r.room)) return null;
  let detail: ReportDetail | undefined = cut(r.detail, 500);
  if (r.detail && typeof r.detail === 'object' && !Array.isArray(r.detail)) {
    const flat: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(r.detail).slice(0, 12)) {
      if (typeof v === 'string') flat[k.slice(0, 32)] = v.slice(0, 200);
      else if (typeof v === 'boolean' || v === null || (typeof v === 'number' && Number.isFinite(v)))
        flat[k.slice(0, 32)] = v;
    }
    detail = flat;
  }
  const out: Report = { room: r.room, kind: r.kind, detail: detail ?? null };
  if (Number.isSafeInteger(r.tick)) out.tick = r.tick;
  if (typeof r.build === 'string') out.build = cut(r.build, 40);
  if (typeof r.ua === 'string') out.ua = cut(r.ua, 60);
  return out;
}

/**
 * Build (but don't start listening) the service.
 * Returns { app, server, listen(port), close({ save }), config, roomHost(), jumps }.
 */
export function createService(cfg: ServerConfig) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', cfg.trustProxy);

  // ---- CORS (all endpoints) ----
  const anyOrigin = cfg.allowedOrigins.includes('*');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin');
    if (anyOrigin) {
      res.set('Access-Control-Allow-Origin', '*');
    } else if (origin && cfg.allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.append('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', req.get('access-control-request-headers') || 'Content-Type');
      res.set('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    next();
  });

  // ---- health ----
  app.get('/healthz', (_req: Request, res: Response) => res.type('text/plain').send('ok'));
  // Read-only deployment identity; healthz stays plain text for Fly's existing health checks.
  app.get('/version', (_req: Request, res: Response) =>
    res.set('Cache-Control', 'no-store').json({ build: cfg.build }),
  );

  // ---- snapshot storage (./store.ts) ----
  const store = createStore(cfg);
  const replacements = createReplacements(cfg, store);
  const { readIfExists, withLock } = store;
  let roomHost: RoomHost | null = null; // the server-hosted rooms (./host/rooms.ts), made in listen() once the store is ready
  let lastCleanup: Cleanup | null = null;

  const validRoom = (req: Request<{ roomId: string }>, res: Response, next: NextFunction) => {
    if (!ROOM_ID_RE.test(req.params.roomId)) return res.status(400).json({ error: 'invalid roomId' });
    next();
  };

  app.get('/rooms/:roomId/snapshot', validRoom, async (req, res, next) => {
    try {
      const snap = await store.read(req.params.roomId);
      if (!snap) return res.status(404).json({ error: 'not found' });
      res.set('Cache-Control', 'no-store');
      res.json(snap);
    } catch (e) {
      next(e);
    }
  });

  // A hosted room's state: { mode: 'server', tick, players, max, ... } (404 for a room this server doesn't host).
  app.get('/rooms/:roomId/host', validRoom, (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (!roomHost?.hosts(req.params.roomId)) return res.status(404).json({ error: 'not hosted' });
    const seed = jumps.seedOf(req.params.roomId); // a jump room's stage (./jump.ts)
    const record = replacements.read(req.params.roomId);
    const replaced = record ? { stage: record.stage, at: record.at, born: record.born } : null;
    res.json({ ...roomHost.status(req.params.roomId), ...(seed && { seed }), ...(replaced && { replaced }) });
  });

  // ---- reports (errors, desyncs, snapshot and connection failures from players' browsers) ----
  // Appended as JSON lines to DATA_DIR/reports/YYYY-MM-DD.jsonl (UTC day), capped per day. Clients send text/plain
  // (navigator.sendBeacon) so no CORS preflight is needed. The first write of a new day deletes files older than
  // REPORT_KEEP_DAYS.
  const reportDir = path.join(cfg.dataDir, 'reports');
  const daySizes = new Map<string, number>(); // day -> bytes written (read from disk on first use)
  const reportFile = (day: string) => path.join(reportDir, `${day}.jsonl`);

  async function pruneReports(day: string) {
    const oldest = new Date(Date.parse(day) - REPORT_KEEP_DAYS * 86400000).toISOString().slice(0, 10);
    for (const name of await fs.readdir(reportDir).catch((): string[] => [])) {
      const d = /^(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(name)?.[1];
      if (d && d < oldest) await fs.rm(path.join(reportDir, name), { force: true });
    }
  }

  async function daySize(day: string): Promise<number> {
    if (!daySizes.has(day)) {
      daySizes.clear(); // only today's counter matters
      await pruneReports(day).catch((e: Error) => cfg.log('report prune failed', e.message));
      try {
        daySizes.set(day, (await fs.stat(reportFile(day))).size);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
        daySizes.set(day, 0);
      }
    }
    return daySizes.get(day)!;
  }

  app.post(
    '/report',
    createRateLimiter({ perMinute: cfg.reportRatePerMin }),
    express.json({ limit: '8kb', type: ['application/json', 'text/plain'] }),
    async (req: Request, res: Response, next: NextFunction) => {
      if (req.body?.kind === 'review-v1') return reviewReport(req, res);
      const list: (Report | null)[] = (Array.isArray(req.body) ? req.body : [req.body])
        .slice(0, REPORT_BATCH)
        .map(cleanReport);
      if (!list.length || list.includes(null)) {
        return res.status(400).json({ error: `body must be a report { room, kind, detail } or an array of them` });
      }
      const at = new Date().toISOString();
      const day = at.slice(0, 10);
      const text = list.map((r) => JSON.stringify({ at, ...r }) + '\n').join('');
      try {
        const status = await withLock(`reports:${day}`, async () => {
          const size = await daySize(day);
          const bytes = Buffer.byteLength(text);
          if (size + bytes > cfg.reportMaxBytesPerDay) return 507;
          await fs.mkdir(reportDir, { recursive: true });
          await fs.appendFile(reportFile(day), text);
          daySizes.set(day, size + bytes);
          return 204;
        });
        if (status === 507) return res.status(507).json({ error: 'report storage full for today' });
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  );

  // The reads of what players sent exist only when REPORT_TOKEN is set and need `Authorization: Bearer <token>`. False
  // when it answered the request.
  const authed = (req: Request, res: Response) => {
    if (!cfg.reportToken) {
      res.status(404).json({ error: 'not found' });
      return false;
    }
    const given = Buffer.from(req.get('authorization') || '');
    const want = Buffer.from(`Bearer ${cfg.reportToken}`);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
      res.status(401).json({ error: 'unauthorized' });
      return false;
    }
    return true;
  };

  const saveInventory = () => inventorySaves(cfg.dataDir, { ns: roomNamespaces(cfg.serverRooms) });
  app.get('/admin/saves', async (req: Request, res: Response, next: NextFunction) => {
    if (!authed(req, res)) return;
    try {
      res.set('Cache-Control', 'no-store');
      res.json({ ...(await saveInventory()), lastCleanup });
    } catch (error) {
      next(error);
    }
  });

  addAdmin(app, cfg, { authed, store, roomHost: () => roomHost, replacements });

  const reviewReport = addReviews(app, cfg, {
    authed,
    withLock,
    readLimit: createRateLimiter({ perMinute: 60 }),
    uploadLimit: createRateLimiter({ perMinute: 6 }),
  });

  // Read back one day's reports.
  app.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
    if (!authed(req, res)) return;
    const day = req.query.day ?? new Date().toISOString().slice(0, 10);
    if (typeof day !== 'string' || !DAY_RE.test(day)) return res.status(400).json({ error: 'day must be YYYY-MM-DD' });
    try {
      const text = (await readIfExists(reportFile(day))) ?? '';
      res.set('Cache-Control', 'no-store');
      res.type('application/x-ndjson').send(text);
    } catch (e) {
      next(e);
    }
  });

  // ---- playtest data (./playdata.ts) ----
  addPlaydata(app, cfg, { limit: createRateLimiter({ perMinute: cfg.playRatePerMin }), authed, withLock });
  // ---- playtest jump-ins (./jump.ts) ----
  const jumps = addJump(app, cfg, {
    store,
    roomHost: () => roomHost,
    replaced: (id) => !!replacements.read(id),
    reserved: (id) => replacements.busy(id),
    limit: createRateLimiter({ perMinute: cfg.jumpRatePerMin }),
  });
  const replace = addReplace(app, cfg, {
    store,
    roomHost: () => roomHost,
    jumps,
    replacements,
    limit: createRateLimiter({ perMinute: cfg.replaceRatePerMin }),
  });

  // ---- room sockets (./host/upgrade.ts) ----
  const server = http.createServer(app);
  routeUpgrades(server, { roomHost: () => roomHost });

  // ---- errors ----
  app.use((_req: Request, res: Response) => res.status(404).json({ error: 'not found' }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- express needs 4 params
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'payload too large' });
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError)
      return res.status(400).json({ error: 'invalid JSON' });
    if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
    cfg.log('[error]', err);
    res.status(500).json({ error: 'internal error' });
  });

  return {
    app,
    server,
    config: cfg,
    roomHost: () => roomHost,
    jumps,
    async listen(port = cfg.port) {
      if (server.listening) throw new Error('Service is already listening');
      await store.init();
      await replacements.init();
      lastCleanup = null;
      try {
        const inventory = await saveInventory();
        cfg.log(inventoryLine(inventory));
        lastCleanup = await cleanupSaves(cfg.dataDir, inventory, store, {
          enabled: cfg.saveCleanup !== 'off',
          isLive: (id) => !!roomHost?.room(id),
        });
        cfg.log(cleanupLine(lastCleanup));
      } catch (error) {
        cfg.log(`save inventory/cleanup failed: ${String(error)}`);
      }
      // Before any room loads: old-namespace sidecars and idle test rooms go.
      await jumps.boot().catch((error: unknown) => cfg.log(`jump boot failed: ${String(error)}`));
      roomHost ??= createRoomHost(cfg, store);
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => resolve());
      });
      return (server.address() as AddressInfo).port;
    },
    // The hosted rooms first (bye, save, close 1012), so index.ts's shutdown needs nothing else. A room host failure is
    // logged the moment it arrives (by 7.5 s, rooms.ts close), then rethrown after the HTTP close (at most 1 s more).
    async close({ save = true } = {}) {
      try {
        // Seed preparation may still be finishing. Checkpoint live rooms immediately, before the process deadline.
        await Promise.all([replace.close(), roomHost?.close({ save })]);
      } catch (error) {
        const inner = error instanceof AggregateError ? error.errors.map(String) : [];
        cfg.log('rooms failed to close:', String(error), ...inner);
        throw error;
      } finally {
        await new Promise<void>((resolve) => {
          const force = setTimeout(() => {
            server.closeAllConnections?.();
            resolve();
          }, 1000);
          force.unref();
          server.close(() => {
            clearTimeout(force);
            resolve();
          });
          server.closeIdleConnections?.();
        });
      }
    },
  };
}

export type Service = ReturnType<typeof createService>;
