import http from 'node:http';
import type { AddressInfo } from 'node:net';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createStore } from './store.ts';
import { routeUpgrades } from './host/upgrade.ts';
import { createRoomHost } from './host/rooms.ts';
import type { RoomHost } from './host/rooms.ts';

const ROOM_ID_RE = /^[a-z0-9-]{1,32}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const REPORT_KINDS = new Set<unknown>(['error', 'desync', 'snapshot', 'connect', 'playtest']);
const REPORT_BATCH = 10; // reports per POST
const REPORT_KEEP_DAYS = 30;

// POST /report (wire shape): one report, or an array of up to REPORT_BATCH, as sent by the client's telemetry
// (navigator.sendBeacon, text/plain JSON) and the prototype bar. Stored as one JSON line each, with `at` added.
export type ReportKind = 'error' | 'desync' | 'snapshot' | 'connect' | 'playtest';
export type ReportDetail = string | Record<string, string | number | boolean | null> | PlaytestDetail | null;
export type Report = {
  room: string;
  kind: ReportKind;
  detail: ReportDetail;
  tick?: number;
  build?: string;
  ua?: string;
};
export type PlaytestVerdict = 'yes' | 'no' | 'cant';
export type PlaytestDetail = {
  proto: string;
  verdict: PlaytestVerdict;
  variant: string;
  note: string;
  trace?: string;
  values?: string;
  build?: string;
  counts?: Record<string, number>;
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
    dataDir: env.DATA_DIR || './data',
    allowedOrigins: origins.length ? origins : ['*'],
    maxRooms: Number(env.MAX_ROOMS ?? 1000),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    reportRatePerMin: Number(env.REPORT_RATE_PER_MIN ?? 12),
    reportMaxBytesPerDay: Number(env.REPORT_MAX_BYTES_PER_DAY ?? 5 * 1024 * 1024),
    reportToken: env.REPORT_TOKEN || '',
    serverRooms: env.SERVER_ROOMS ? list(env.SERVER_ROOMS) : ['*'], // rooms it hosts (docs/plans/server-host.md); default all
    maxPlayers: Number(env.MAX_PLAYERS ?? 8),
    serverSaveMs: Number(env.SERVER_SAVE_MS ?? 2000),
    roomIdleMs: Number(env.ROOM_IDLE_MS ?? 600000), // with SERVER_ROOMS=*: unload a room this long after it emptied
    maxHostedRooms: Number(env.MAX_HOSTED_ROOMS ?? 20), // with SERVER_ROOMS=*: rooms loaded at once
    log: (...a: unknown[]) => console.log(new Date().toISOString(), ...a),
    ...overrides,
  };
}

export type ServerConfig = {
  port: number;
  dataDir: string;
  allowedOrigins: string[];
  maxRooms: number;
  trustProxy: boolean | number | string;
  reportRatePerMin: number;
  reportMaxBytesPerDay: number;
  reportToken: string;
  serverRooms: string[];
  maxPlayers: number;
  serverSaveMs: number;
  roomIdleMs: number;
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
  if (r.kind === 'playtest') {
    detail = cleanPlaytest(r.detail);
    if (!detail) return null;
  } else if (r.detail && typeof r.detail === 'object' && !Array.isArray(r.detail)) {
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

// A playtest verdict from the prototype bar (src/proto/bar/), read back by `npm run verdicts`. Its own shape: the
// verdict is one of the bar's three, the note may run to 1000 chars, and `counts` is the one nested object (the bar's
// behaviour counters, name -> number). `proto` (the card id in protos/protos.ts) and `verdict` are required.
const PLAYTEST_VERDICTS = new Set<unknown>(['yes', 'no', 'cant']);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, checked field by field
function cleanPlaytest(d: any): PlaytestDetail | null {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  if (typeof d.proto !== 'string' || !/^[a-z0-9-]{1,40}$/.test(d.proto) || !PLAYTEST_VERDICTS.has(d.verdict))
    return null;
  const out: PlaytestDetail = {
    proto: d.proto,
    verdict: d.verdict,
    variant: cut(d.variant, 40) ?? '',
    note: cut(d.note, 1000) ?? '',
  };
  if (typeof d.trace === 'string') out.trace = cut(d.trace, 300);
  if (typeof d.values === 'string') out.values = cut(d.values, 300);
  if (typeof d.build === 'string') out.build = cut(d.build, 40);
  if (d.counts && typeof d.counts === 'object' && !Array.isArray(d.counts)) {
    const counts: Record<string, number> = {};
    for (const [k, v] of Object.entries(d.counts).slice(0, 12))
      if (typeof v === 'number' && Number.isFinite(v)) counts[k.slice(0, 32)] = v;
    out.counts = counts;
  }
  return out;
}

/**
 * Build (but don't start listening) the service.
 * Returns { app, server, listen(port), close({ save }), config, roomHost() }.
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
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', req.get('access-control-request-headers') || 'Content-Type');
      res.set('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    next();
  });

  // ---- health ----
  app.get('/healthz', (_req: Request, res: Response) => res.type('text/plain').send('ok'));

  // ---- snapshot storage (./store.ts) ----
  const store = createStore(cfg);
  const { readIfExists, withLock } = store;
  let roomHost: RoomHost | null = null; // the server-hosted rooms (./host/rooms.ts), made in listen() once the store is ready

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
    res.json(roomHost.status(req.params.roomId));
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

  // Read back one day's reports. Exists only when REPORT_TOKEN is set; needs `Authorization: Bearer <token>`.
  app.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
    if (!cfg.reportToken) return res.status(404).json({ error: 'not found' });
    const given = Buffer.from(req.get('authorization') || '');
    const want = Buffer.from(`Bearer ${cfg.reportToken}`);
    if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
      return res.status(401).json({ error: 'unauthorized' });
    }
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
    async listen(port = cfg.port) {
      await store.init();
      roomHost ??= createRoomHost(cfg, store);
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => resolve());
      });
      return (server.address() as AddressInfo).port;
    },
    // The hosted rooms first (bye, save, close 1012), so index.ts's shutdown needs nothing else.
    async close({ save = true } = {}) {
      await roomHost?.close({ save });
      return new Promise<void>((resolve) => {
        const force = setTimeout(() => {
          server.closeAllConnections?.();
          resolve();
        }, 5000);
        force.unref();
        server.close(() => {
          clearTimeout(force);
          resolve();
        });
        server.closeIdleConnections?.();
      });
    },
  };
}

export type Service = ReturnType<typeof createService>;
