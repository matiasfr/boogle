// Playtest data: what a `?proto=` page recorded (src/proto/playdata/record.ts), appended per session so the director can
// read a session before hearing about it (`npm run playtest`, dev/playtest/). One file per session in
// DATA_DIR/playdata/<session>.jsonl, a JSON line per batch with the server's time `at`.
//
//   POST /playdata               a PlayBatch (text/plain or JSON, so sendBeacon needs no preflight). 204 stored; 400 bad
//                                shape; 413 over MAX_BODY; 422 a card we don't know; 429 rate; 507 the session is full.
//   GET  /playdata               newest sessions first, each with what its first lines say (?limit=, at most 200)
//   GET  /playdata/:session      the session's lines
// The reads exist only when REPORT_TOKEN is set and need `Authorization: Bearer <token>`, like GET /reports.
//
// The endpoint is public, so everything is bounded: the body, the events per batch, the fields per event, the string
// lengths, a session's bytes, and the total bytes and sessions on disk (past those the sessions written to longest ago
// are deleted). No IP or header is kept.
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { Express, Request, RequestHandler, Response, NextFunction } from 'express';
import { PROTOS } from '../../protos/protos.ts';

/** One thing that happened: `t` seconds since the page loaded, `k` its kind, the rest flat primitives. */
export type PlayEvent = { t: number; k: string } & Record<string, string | number | boolean | null>;
/** POST /playdata (wire shape). `s` the session, `n` the batch's number (a retry repeats it; readers drop repeats),
 * `now` the sender's clock in the same seconds as `t`, so `at` turns every `t` into server time. */
export type PlayBatch = { s: string; card: string; n: number; now: number; ev: PlayEvent[] };
/** A stored line. */
export type PlayLine = Omit<PlayBatch, 's'> & { at: string };
/** One row of GET /playdata. `meta`: the newest `session` event in the file's first lines. */
export type PlaySession = {
  id: string;
  card: string;
  bytes: number;
  first: string;
  last: string;
  meta: Record<string, unknown> | null;
};

export type PlayConfig = {
  dataDir: string;
  playRatePerMin: number;
  playMaxSessionBytes: number;
  playMaxTotalBytes: number;
  playMaxSessions: number;
  playCards?: string[]; // tests only: the known cards, instead of protos/protos.ts
  log: (...a: unknown[]) => void;
};

export const SESSION_RE = /^[a-z0-9-]{8,40}$/;
const KIND_RE = /^[a-z0-9_.:-]{1,40}$/i;
const FIELD_RE = /^[a-z0-9_]{1,24}$/i;
const MAX_BODY = '64kb';
const MAX_EVENTS = 500;
const MAX_FIELDS = 24;
const MAX_STRING = 300;
const MAX_NOTE = 1000; // the prototype verdict's note
const HEAD_BYTES = 64 * 1024; // what GET /playdata reads of each file

// One event, cleaned: known fields only, flat primitives, short strings. Null when it can't be salvaged.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, checked field by field
function cleanEvent(e: any): PlayEvent | null {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return null;
  if (typeof e.t !== 'number' || !Number.isFinite(e.t) || typeof e.k !== 'string' || !KIND_RE.test(e.k)) return null;
  const out: PlayEvent = { t: e.t, k: e.k };
  let n = 0;
  for (const [key, v] of Object.entries(e)) {
    if (key === 't' || key === 'k' || !FIELD_RE.test(key)) continue;
    if (++n > MAX_FIELDS) break;
    if (typeof v === 'string') out[key] = v.slice(0, key === 'note' ? MAX_NOTE : MAX_STRING);
    else if (typeof v === 'boolean' || v === null || (typeof v === 'number' && Number.isFinite(v))) out[key] = v;
  }
  return out;
}

/** A batch, cleaned; null when it can't be salvaged (any event that isn't one sinks the batch). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untrusted JSON, checked field by field
export function cleanBatch(b: any): PlayBatch | null {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (typeof b.s !== 'string' || !SESSION_RE.test(b.s) || typeof b.card !== 'string') return null;
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

// The newest `session` event and the first and card fields from a file's opening text.
function readHead(text: string) {
  let meta: Record<string, unknown> | null = null;
  let first = '';
  let card = '';
  const lines = text.split('\n');
  if (text.length >= HEAD_BYTES) lines.pop(); // cut mid-line
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const l = JSON.parse(line) as PlayLine;
      first ||= l.at;
      card ||= l.card;
      for (const e of l.ev) if (e.k === 'session') meta = e;
    } catch {
      // a torn line
    }
  }
  return { meta, first, card };
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
  const known = new Set(cfg.playCards ?? PROTOS.map((p) => p.id));
  // session -> what's on disk, read once. Everything below runs under one lock: appends are small and rare.
  let sessions: Map<string, { bytes: number; ms: number }> | null = null;
  let total = 0;

  async function index() {
    if (sessions) return sessions;
    await fs.mkdir(dir, { recursive: true });
    const found = new Map<string, { bytes: number; ms: number }>();
    total = 0;
    for (const name of await fs.readdir(dir)) {
      const id = /^(.+)\.jsonl$/.exec(name)?.[1];
      if (!id) continue;
      const st = await fs.stat(path.join(dir, name));
      found.set(id, { bytes: st.size, ms: st.mtimeMs });
      total += st.size;
    }
    return (sessions = found);
  }

  // Deletes the sessions written to longest ago until `extra` more bytes (and one more session if `fresh`) fit. Never
  // the one being written.
  async function makeRoom(all: Map<string, { bytes: number; ms: number }>, id: string, extra: number, fresh: boolean) {
    const over = () => total + extra > cfg.playMaxTotalBytes || all.size + (fresh ? 1 : 0) > cfg.playMaxSessions;
    if (!over()) return;
    const oldest = [...all.entries()].filter(([k]) => k !== id).sort((a, b) => a[1].ms - b[1].ms);
    for (const [k, v] of oldest) {
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
      if (!known.has(b.card)) return res.status(422).json({ error: 'unknown card' });
      const at = new Date().toISOString();
      const line: PlayLine = { at, card: b.card, n: b.n, now: b.now, ev: b.ev };
      const text = JSON.stringify(line) + '\n';
      const bytes = Buffer.byteLength(text);
      try {
        const status = await opts.withLock('playdata', async () => {
          const all = await index();
          const was = all.get(b.s);
          if ((was?.bytes ?? 0) + bytes > cfg.playMaxSessionBytes) return 507;
          await makeRoom(all, b.s, bytes, !was);
          await fs.appendFile(fileFor(b.s), text);
          all.set(b.s, { bytes: (was?.bytes ?? 0) + bytes, ms: Date.now() });
          total += bytes;
          return 204;
        });
        if (status === 507) return res.status(507).json({ error: 'session full' });
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
      const newest = [...all.entries()].sort((a, b) => b[1].ms - a[1].ms).slice(0, limit);
      const out: PlaySession[] = [];
      for (const [id, { bytes, ms }] of newest) {
        const fh = await fs.open(fileFor(id), 'r').catch(() => null);
        if (!fh) continue; // deleted just now
        const buf = Buffer.alloc(Math.min(HEAD_BYTES, bytes));
        await fh.read(buf, 0, buf.length, 0).finally(() => fh.close());
        const { meta, first, card } = readHead(buf.toString('utf8'));
        out.push({ id, card, bytes, first, last: new Date(ms).toISOString(), meta });
      }
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
