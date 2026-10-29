import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { ExpressPeerServer } from 'peer';

const ROOM_ID_RE = /^[a-z0-9-]{1,32}$/;
const STUN = 'stun:stun.l.google.com:19302';

function parseTrustProxy(v) {
  if (v === undefined || v === '') return 1; // one hop: Fly / Render / Railway
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

function list(v) {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Read config from env, with overrides (used by tests). */
export function loadConfig(env = process.env, overrides = {}) {
  const origins = list(env.ALLOWED_ORIGINS);
  return {
    port: Number(env.PORT ?? 9000),
    dataDir: env.DATA_DIR || './data',
    allowedOrigins: origins.length ? origins : ['*'],
    maxRooms: Number(env.MAX_ROOMS ?? 1000),
    putRatePerMin: Number(env.PUT_RATE_PER_MIN ?? 30),
    trustProxy: parseTrustProxy(env.TRUST_PROXY),
    turnUrls: list(env.TURN_URLS),
    turnUsername: env.TURN_USERNAME || '',
    turnCredential: env.TURN_CREDENTIAL || '',
    turnSecret: env.TURN_SECRET || '',
    turnTtl: Number(env.TURN_TTL ?? 86400),
    aliveTimeout: Number(env.PEER_ALIVE_TIMEOUT ?? 60000),
    log: (...a) => console.log(new Date().toISOString(), ...a),
    ...overrides,
  };
}

/** Simple in-memory token bucket keyed by string. */
function createRateLimiter({ perMinute }) {
  const buckets = new Map();
  const refillPerMs = perMinute / 60000;
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (now - b.t > 120000) buckets.delete(k);
  }, 60000);
  sweep.unref();
  const middleware = (req, res, next) => {
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
  middleware.stop = () => clearInterval(sweep);
  return middleware;
}

function iceServers(cfg) {
  const servers = [{ urls: STUN }];
  if (cfg.turnUrls.length) {
    if (cfg.turnUsername && cfg.turnCredential) {
      servers.push({ urls: cfg.turnUrls, username: cfg.turnUsername, credential: cfg.turnCredential });
    } else if (cfg.turnSecret) {
      const expiry = Math.floor(Date.now() / 1000) + cfg.turnTtl;
      const username = `${expiry}:boogle`;
      const credential = crypto.createHmac('sha1', cfg.turnSecret).update(username).digest('base64');
      servers.push({ urls: cfg.turnUrls, username, credential });
    }
  }
  return servers;
}

/**
 * Build (but don't start listening) the service.
 * Returns { app, server, listen(port), close(), config }.
 */
export function createService(config) {
  const cfg = config;
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', cfg.trustProxy);

  // ---- CORS (all endpoints) ----
  const anyOrigin = cfg.allowedOrigins.includes('*');
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (anyOrigin) {
      res.set('Access-Control-Allow-Origin', '*');
    } else if (origin && cfg.allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.append('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
      res.set('Access-Control-Allow-Headers', req.get('access-control-request-headers') || 'Content-Type');
      res.set('Access-Control-Max-Age', '600');
      return res.status(204).end();
    }
    next();
  });

  // ---- health / ICE ----
  app.get('/healthz', (_req, res) => res.type('text/plain').send('ok'));
  app.get('/ice', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ iceServers: iceServers(cfg) });
  });

  // ---- snapshot storage ----
  const knownRooms = new Set();
  const locks = new Map(); // roomId -> promise chain
  const fileFor = (id) => path.join(cfg.dataDir, `${id}.json`);

  async function init() {
    await fs.mkdir(cfg.dataDir, { recursive: true });
    for (const f of await fs.readdir(cfg.dataDir)) {
      const m = /^([a-z0-9-]{1,32})\.json$/.exec(f);
      if (m) knownRooms.add(m[1]);
    }
  }

  async function readSnapshot(id) {
    try {
      return JSON.parse(await fs.readFile(fileFor(id), 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e;
    }
  }

  function withLock(id, fn) {
    const prev = locks.get(id) || Promise.resolve();
    const next = prev.then(fn, fn);
    const tail = next.catch(() => {});
    locks.set(id, tail);
    tail.then(() => {
      if (locks.get(id) === tail) locks.delete(id);
    });
    return next;
  }

  const validRoom = (req, res, next) => {
    if (!ROOM_ID_RE.test(req.params.roomId)) return res.status(400).json({ error: 'invalid roomId' });
    next();
  };

  app.get('/rooms/:roomId/snapshot', validRoom, async (req, res, next) => {
    try {
      const snap = await readSnapshot(req.params.roomId);
      if (!snap) return res.status(404).json({ error: 'not found' });
      res.set('Cache-Control', 'no-store');
      res.json(snap);
    } catch (e) {
      next(e);
    }
  });

  app.put(
    '/rooms/:roomId/snapshot',
    validRoom,
    createRateLimiter({ perMinute: cfg.putRatePerMin }),
    express.json({ limit: '256kb' }),
    async (req, res, next) => {
      const id = req.params.roomId;
      const b = req.body;
      if (
        !b ||
        typeof b !== 'object' ||
        Array.isArray(b) ||
        typeof b.tick !== 'number' ||
        !Number.isFinite(b.tick) ||
        typeof b.writerId !== 'string' ||
        b.writerId.length < 1 ||
        b.writerId.length > 128 ||
        !('data' in b)
      ) {
        return res.status(400).json({ error: 'body must be { tick: number, writerId: string, data: any }' });
      }
      try {
        const result = await withLock(id, async () => {
          const current = await readSnapshot(id);
          if (current && current.tick > b.tick)
            return { status: 409, body: { error: 'stale tick', tick: current.tick } };
          if (!current && !knownRooms.has(id) && knownRooms.size >= cfg.maxRooms) {
            return { status: 507, body: { error: 'room limit reached' } };
          }
          const doc = { tick: b.tick, writerId: b.writerId, data: b.data, updatedAt: new Date().toISOString() };
          const tmp = `${fileFor(id)}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
          await fs.writeFile(tmp, JSON.stringify(doc));
          await fs.rename(tmp, fileFor(id));
          knownRooms.add(id);
          return { status: 200, body: { ok: true, tick: doc.tick } };
        });
        res.status(result.status).json(result.body);
      } catch (e) {
        next(e);
      }
    },
  );

  // ---- PeerJS signaling ----
  const server = http.createServer(app);
  let connected = 0;
  const peerApp = ExpressPeerServer(server, {
    path: '/',
    allow_discovery: false,
    alive_timeout: cfg.aliveTimeout,
    proxied: cfg.trustProxy,
    corsOptions: { origin: anyOrigin ? true : cfg.allowedOrigins },
  });
  peerApp.on('connection', () => {
    connected++;
    cfg.log(`[peer] connect, active=${connected}`);
  });
  peerApp.on('disconnect', () => {
    connected = Math.max(0, connected - 1);
    cfg.log(`[peer] disconnect, active=${connected}`);
  });
  // peer re-arms recursive housekeeping setTimeouts and has no stop API, which keeps the
  // event loop alive after close(). Tests opt in to unref'd timers; production exits explicitly.
  if (cfg.unrefTimers && !globalThis.__boogleUnref) {
    globalThis.__boogleUnref = true;
    const realSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (...a) => realSetTimeout(...a).unref();
  }
  app.use('/peerjs', peerApp);

  // ---- errors ----
  app.use((req, res) => res.status(404).json({ error: 'not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'payload too large (max 256kb)' });
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
    async listen(port = cfg.port) {
      await init();
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, () => resolve());
      });
      return server.address().port;
    },
    close() {
      return new Promise((resolve) => {
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
