// Playtest data: what a `?proto=` page recorded (src/proto/playdata/record.ts), appended per session so the director can
// read a session before hearing about it (`npm run playtest`, dev/playtest/). One file per session in
// DATA_DIR/playdata/<session>.jsonl, a JSON line per batch with the server's time `at`.
//
//   POST /playdata               a PlayBatch (text/plain or JSON, so sendBeacon needs no preflight). 204 stored; 400 bad
//                                shape; 413 over MAX_BODY; 429 rate, or too many new sessions; 507 the session is full.
//   GET  /playdata               newest sessions first, each with what it says about itself (?limit=, at most 200)
//   GET  /playdata/:session      the session's lines
// The reads exist only when REPORT_TOKEN is set and need `Authorization: Bearer <token>`, like GET /reports.
//
// The endpoint is public, so everything is bounded: the body, the events per batch, the fields per event, the string
// lengths, a session's bytes, new sessions per IP per hour, and the total bytes and sessions on disk. Past those last two
// the sessions written to longest ago are deleted, sessions that look like someone playing (a name, over a minute, not an
// automated browser) only after all the others. Control characters are stripped on the way in. No IP or header is kept.
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import express from 'express';
import type { Express, Request, RequestHandler, Response, NextFunction } from 'express';
import { cleanText } from './clean-text.ts';
import { clientAddress, rememberAddress } from './client-address.ts';

/** One thing that happened: `t` seconds since the page loaded, `k` its kind, the rest flat primitives. */
export type PlayEvent = { t: number; k: string } & Record<string, string | number | boolean | null>;
/** POST /playdata (wire shape). `s` the session, `n` the batch's number (a retry repeats it; readers drop repeats),
 * `now` the sender's clock in the same seconds as `t`, so `at` turns every `t` into server time. */
export type PlayBatch = { s: string; card: string; n: number; now: number; ev: PlayEvent[] };
/** A stored line. */
export type PlayLine = Omit<PlayBatch, 's'> & { at: string };
/** One row of GET /playdata. `meta`: the newest `session` event seen. */
export type PlaySession = {
  id: string;
  card: string;
  bytes: number;
  first: string;
  last: string;
  meta: Record<string, unknown> | null;
};

export type PlayConfig = {
  replaceFlyProxy?: boolean;
  dataDir: string;
  playRatePerMin: number;
  playNewSessionsPerHour: number;
  playMaxSessionBytes: number;
  playMaxTotalBytes: number;
  playMaxSessions: number;
  log: (...a: unknown[]) => void;
};

const SESSION_RE = /^[a-z0-9-]{8,40}$/;
const CARD_RE = /^[a-z0-9-]{1,40}$/;
const KIND_RE = /^[a-z0-9_.:-]{1,40}$/i;
const FIELD_RE = /^[a-z0-9_]{1,24}$/i;
const MAX_BODY = '64kb';
const MAX_EVENTS = 500;
const MAX_FIELDS = 24;
const MAX_STRING = 300;
const MAX_NOTE = 1000; // the prototype verdict's note
const PLAYED_MS = 60_000; // how long a session must last to count as someone playing
const HOUR_MS = 3_600_000;

// One event, cleaned: known fields only, flat primitives, short strings. Null when it can't be salvaged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, checked field by field
function cleanEvent(e: any): PlayEvent | null {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  if (typeof e.t !== 'number' || !Number.isFinite(e.t) || typeof e.k !== 'string' || !KIND_RE.test(e.k)) return null;
  const out: PlayEvent = { t: e.t, k: e.k };
  let n = 0;
  for (const [key, v] of Object.entries(e)) {
    if (key === 't' || key === 'k' || key === '__proto__' || !FIELD_RE.test(key)) continue;
    if (++n > MAX_FIELDS) break;
    if (typeof v === 'string') out[key] = cleanText(v.slice(0, key === 'note' ? MAX_NOTE : MAX_STRING));
    else if (typeof v === 'boolean' || v === null || (typeof v === 'number' && Number.isFinite(v))) out[key] = v;
  }
  return out;
}

/** A batch, cleaned; null when it can't be salvaged (any event that isn't one sinks the batch). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, checked field by field
function cleanBatch(b: any): PlayBatch | null {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (typeof b.s !== 'string' || !SESSION_RE.test(b.s) || typeof b.card !== 'string' || !CARD_RE.test(b.card))
    return null;
  if (!Number.isSafeInteger(b.n) || b.n < 0 || typeof b.now !== 'number' || !Number.isFinite(b.now)) return null;
  if (!Array.isArray(b.ev) || !b.ev.length || b.ev.length > MAX_EVENTS) return null;
  const ev: PlayEvent[] = [];
  for (const e of b.ev) {
    const c = cleanEvent(e);
    if (!c) return null;
    ev.push(c);
  }
  return { s: b.s, card: b.card, n: b.n, now: b.now, ev };
}

/** What the index knows about a session on disk. */
type Entry = { bytes: number; ms: number; card: string; first: string; meta: Record<string, unknown> | null };

// Someone playing, as far as a server can tell: names can be faked, which is why new sessions are capped per IP too.
const looksPlayed = (e: Entry) =>
  !!e.first &&
  typeof e.meta?.name === 'string' &&
  e.meta.name.trim() !== '' &&
  !e.meta.bot &&
  e.ms - Date.parse(e.first) > PLAYED_MS;

// A file's card, first time and session event, for the index after a restart. Stops at the first named session event,
// usually a few KB in, and only parses lines that can hold one.
async function scanFile(file: string) {
  const found = { card: '', first: '', meta: null as Record<string, unknown> | null };
  const stream = createReadStream(file, 'utf8');
  const lines = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of lines) {
      if (found.first && !line.includes('"k":"session"')) continue;
      try {
        const l = JSON.parse(line) as PlayLine;
        found.first ||= l.at;
        found.card ||= l.card;
        for (const e of l.ev) if (e.k === 'session') found.meta = e;
      } catch {
        // a torn line
      }
      if (found.meta?.name) break;
    }
  } finally {
    lines.close();
    stream.destroy();
  }
  return found;
}

/** Adds the routes. `limit` is a fresh rate limiter for the POST and `authed` the reads' token check. */
export function addPlaydata(
  app: Express,
  cfg: PlayConfig,
  opts: {
    limit: RequestHandler;
    authed: (req: Request, res: Response) => boolean;
    withLock: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  },
) {
  const dir = path.join(cfg.dataDir, 'playdata');
  const fileFor = (id: string) => path.join(dir, `${id}.jsonl`);
  // Everything below runs under one lock: appends are small and rare.
  let sessions: Map<string, Entry> | null = null;
  let total = 0;
  const newByIp = new Map<string, { n: number; since: number }>();

  async function index() {
    if (sessions) return sessions;
    await fs.mkdir(dir, { recursive: true });
    const found = new Map<string, Entry>();
    total = 0;
    for (const name of await fs.readdir(dir)) {
      const id = /^(.+)\.jsonl$/.exec(name)?.[1];
      if (!id) continue;
      const file = path.join(dir, name);
      const st = await fs.stat(file);
      found.set(id, { bytes: st.size, ms: st.mtimeMs, ...(await scanFile(file)) });
      total += st.size;
    }
    return (sessions = found);
  }

  // Whether this IP may start another session this hour; counts it if so.
  function allowNew(ip: string) {
    const now = Date.now();
    for (const [k, v] of newByIp) if (now - v.since > HOUR_MS) newByIp.delete(k);
    const b = newByIp.get(ip) ?? { n: 0, since: now };
    rememberAddress(newByIp, ip, b);
    if (b.n >= cfg.playNewSessionsPerHour) return false;
    b.n++;
    return true;
  }

  // Deletes sessions until `extra` more bytes (and one more session if `fresh`) fit: those written to longest ago first,
  // and those that look played only after all the others. Never the one being written.
  async function makeRoom(all: Map<string, Entry>, id: string, extra: number, fresh: boolean) {
    const over = () => total + extra > cfg.playMaxTotalBytes || all.size + (fresh ? 1 : 0) > cfg.playMaxSessions;
    if (!over()) return;
    const order = [...all.entries()]
      .filter(([k]) => k !== id)
      .sort((a, b) => Number(looksPlayed(a[1])) - Number(looksPlayed(b[1])) || a[1].ms - b[1].ms);
    for (const [k, v] of order) {
      if (!over()) break;
      await fs.rm(fileFor(k), { force: true });
      all.delete(k);
      total -= v.bytes;
      cfg.log('playdata: deleted old session', k);
    }
  }

  app.post(
    '/playdata',
    opts.limit,
    express.json({ limit: MAX_BODY, type: ['application/json', 'text/plain'] }),
    async (req: Request, res: Response, next: NextFunction) => {
      const b = cleanBatch(req.body);
      if (!b) return res.status(400).json({ error: 'body must be a batch { s, card, n, now, ev: [{ t, k, ... }] }' });
      const at = new Date().toISOString();
      const line: PlayLine = { at, card: b.card, n: b.n, now: b.now, ev: b.ev };
      const text = JSON.stringify(line) + '\n';
      const bytes = Buffer.byteLength(text);
      try {
        const status = await opts.withLock('playdata', async () => {
          const all = await index();
          const was = all.get(b.s);
          if ((was?.bytes ?? 0) + bytes > cfg.playMaxSessionBytes) return 507;
          if (!was && !allowNew(clientAddress(req, cfg.replaceFlyProxy))) return 429;
          await makeRoom(all, b.s, bytes, !was);
          await fs.appendFile(fileFor(b.s), text);
          let meta = was?.meta ?? null;
          for (const e of b.ev) if (e.k === 'session') meta = e;
          all.set(b.s, {
            bytes: (was?.bytes ?? 0) + bytes,
            ms: Date.now(),
            card: was?.card || b.card,
            first: was?.first || at,
            meta,
          });
          total += bytes;
          return 204;
        });
        if (status === 507) return res.status(507).json({ error: 'session full' });
        if (status === 429) return res.status(429).json({ error: 'too many new sessions' });
        res.status(204).end();
      } catch (e) {
        next(e);
      }
    },
  );

  app.get('/playdata', async (req: Request, res: Response, next: NextFunction) => {
    if (!opts.authed(req, res)) return;
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    try {
      const all = await opts.withLock('playdata', index);
      const out: PlaySession[] = [...all.entries()]
        .sort((a, b) => b[1].ms - a[1].ms)
        .slice(0, limit)
        .map(([id, e]) => ({
          id,
          card: e.card,
          bytes: e.bytes,
          first: e.first,
          last: new Date(e.ms).toISOString(),
          meta: e.meta,
        }));
      res.set('Cache-Control', 'no-store');
      res.json(out);
    } catch (e) {
      next(e);
    }
  });

  app.get('/playdata/:session', async (req: Request<{ session: string }>, res: Response, next: NextFunction) => {
    if (!opts.authed(req, res)) return;
    if (!SESSION_RE.test(req.params.session)) return res.status(400).json({ error: 'invalid session' });
    try {
      const text = await fs.readFile(fileFor(req.params.session), 'utf8').catch((e: NodeJS.ErrnoException) => {
        if (e.code === 'ENOENT') return null;
        throw e;
      });
      if (text === null) return res.status(404).json({ error: 'not found' });
      res.set('Cache-Control', 'no-store');
      res.type('application/x-ndjson').send(text);
    } catch (e) {
      next(e);
    }
  });
}
