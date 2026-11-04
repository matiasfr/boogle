// Retained internal comparisons, outside room state. See docs/plans/review-inbox.md.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { Express, Request, Response } from 'express';
import type { Store } from './store.ts';
import type {
  ReviewCard,
  ReviewInput,
  ReviewReceipt,
  ReviewSide,
  ReviewSubmission,
} from '../../protos/review-types.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SIDES: ReviewSide[] = ['before', 'after'];
const IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_CARDS = 50;
const MAX_RECEIPTS = 100;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && v.length <= max;
const id = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

function input(v: unknown): ReviewInput | null {
  if (
    !object(v) ||
    !text(v.question, 240) ||
    !text(v.change, 400) ||
    !text(v.build, 200) ||
    !text(v.launcher, 1000) ||
    !text(v.topic, 80) ||
    !/^[a-z0-9_-]+$/.test(v.topic)
  )
    return null;
  if (v.context !== undefined && (!object(v.context) || JSON.stringify(v.context).length > 12000)) return null;
  return {
    question: v.question,
    change: v.change,
    build: v.build,
    launcher: v.launcher,
    topic: v.topic,
    ...(v.context ? { context: v.context as Record<string, unknown> } : {}),
  };
}

function submission(v: unknown): ReviewSubmission | null {
  if (
    !object(v) ||
    v.kind !== 'review-v1' ||
    !id(v.reviewId) ||
    !id(v.submissionId) ||
    typeof v.verdict !== 'string' ||
    !['accept', 'changes', 'cant'].includes(v.verdict)
  )
    return null;
  const out: ReviewSubmission = {
    kind: 'review-v1',
    reviewId: v.reviewId,
    submissionId: v.submissionId,
    verdict: v.verdict as ReviewSubmission['verdict'],
  };
  if (v.pin !== undefined) {
    const p = v.pin;
    if (
      !object(p) ||
      (p.image !== 'before' && p.image !== 'after') ||
      !text(p.text, 2000) ||
      typeof p.x !== 'number' ||
      !Number.isFinite(p.x) ||
      p.x < 0 ||
      p.x > 1 ||
      typeof p.y !== 'number' ||
      !Number.isFinite(p.y) ||
      p.y < 0 ||
      p.y > 1
    )
      return null;
    out.pin = { image: p.image, x: p.x, y: p.y, text: p.text };
  }
  return out;
}

function media(v: unknown) {
  if (typeof v !== 'string' || v.length > Math.ceil(IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(v))
    return null;
  const bytes = Buffer.from(v, 'base64');
  if (!bytes.length || bytes.length > IMAGE_BYTES || bytes.toString('base64') !== v) return null;
  const mime = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? 'image/png'
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? 'image/jpeg'
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
        ? 'image/webp'
        : null;
  return mime ? { bytes, mime, sha256: crypto.createHash('sha256').update(bytes).digest('hex') } : null;
}

// Flush file and directory entries before acknowledging; immutable destination names make retries safe.
async function syncDir(dir: string) {
  const f = await fs.open(dir, 'r');
  try {
    await f.sync();
  } finally {
    await f.close();
  }
}
async function write(file: string, data: string | Buffer) {
  const f = await fs.open(file, 'wx');
  try {
    await f.writeFile(data);
    await f.sync();
  } finally {
    await f.close();
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

export function addReviews(
  app: Express,
  cfg: { dataDir: string },
  deps: {
    authed: (req: Request, res: Response) => boolean;
    withLock: Store['withLock'];
  },
) {
  const root = path.join(cfg.dataDir, 'reviews');
  async function read<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8')) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }
  app.post(
    '/reviews',
    (req, res, next) => {
      if (deps.authed(req, res)) next();
    },
    express.json({ limit: '12mb' }),
    async (req, res) => {
      const fields = input(req.body);
      const before = media(req.body?.before);
      const after = media(req.body?.after);
      if (!fields || !before || !after)
        return res.status(400).json({ error: 'Invalid card or images (PNG/JPEG/WebP, 4 MiB each)' });
      await deps.withLock('reviews:create', async () => {
        if ((await names(root)).filter((n) => UUID.test(n)).length >= MAX_CARDS)
          return res
            .status(507)
            .json({ error: 'Review storage full (50 cards); archive on the server before adding more' });
        await fs.mkdir(root, { recursive: true });
        await syncDir(cfg.dataDir);
        const reviewId = crypto.randomUUID();
        const temp = await fs.mkdtemp(path.join(root, '.upload-'));
        const evidence = {} as ReviewCard['evidence'];
        try {
          for (const side of SIDES) {
            const m = side === 'before' ? before : after;
            await write(path.join(temp, side), m.bytes);
            evidence[side] = {
              url: `/reviews/${reviewId}/${side}`,
              sha256: m.sha256,
              mime: m.mime,
              bytes: m.bytes.length,
            };
          }
          const card: ReviewCard = { ...fields, version: 1, id: reviewId, created: new Date().toISOString(), evidence };
          await write(path.join(temp, 'card.json'), JSON.stringify(card));
          await syncDir(temp);
          await fs.rename(temp, path.join(root, reviewId));
          await syncDir(root);
          res.status(201).json(card);
        } finally {
          await fs.rm(temp, { recursive: true, force: true });
        }
      });
    },
  );
  app.get('/reviews', async (req, res) => {
    if (!deps.authed(req, res)) return;
    const receipts: ReviewReceipt[] = [];
    for (const reviewId of (await names(root)).filter((n) => UUID.test(n))) {
      const dir = path.join(root, reviewId, 'receipts');
      for (const name of (await names(dir)).filter((n) => UUID.test(n.slice(0, -5)) && n.endsWith('.json'))) {
        const receipt = await read<ReviewReceipt>(path.join(dir, name));
        if (receipt) receipts.push(receipt);
      }
    }
    res.set('Cache-Control', 'no-store').json(receipts.sort((a, b) => b.at.localeCompare(a.at)));
  });
  app.get('/reviews/:id', async (req, res) => {
    const card = id(req.params.id) ? await read<ReviewCard>(path.join(root, req.params.id, 'card.json')) : null;
    if (!card) return res.status(404).json({ error: 'Review not found' });
    res.set('Cache-Control', 'no-store').json(card);
  });
  app.get('/reviews/:id/:side', async (req, res) => {
    const side = req.params.side;
    const card = id(req.params.id) ? await read<ReviewCard>(path.join(root, req.params.id, 'card.json')) : null;
    if (!card || (side !== 'before' && side !== 'after')) return res.status(404).end();
    res.set({
      'Content-Type': card.evidence[side].mime,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=31536000, immutable',
    });
    res.send(await fs.readFile(path.join(root, req.params.id, side)));
  });
  return async (req: Request, res: Response) => {
    const s = submission(req.body);
    if (!s) return res.status(400).json({ error: 'Invalid review submission' });
    return deps.withLock(`review:${s.reviewId}`, async () => {
      const card = await read<ReviewCard>(path.join(root, s.reviewId, 'card.json'));
      if (!card) return res.status(404).json({ error: 'Review not found' });
      const dir = path.join(root, s.reviewId, 'receipts');
      const file = path.join(dir, s.submissionId + '.json');
      let receipt = await read<ReviewReceipt>(file);
      const duplicate = !!receipt;
      if (receipt && JSON.stringify(receipt.submission) !== JSON.stringify(s))
        return res.status(409).json({ error: 'Submission ID already has different content' });
      if (!receipt) {
        if ((await names(dir)).filter((n) => n.endsWith('.json')).length >= MAX_RECEIPTS)
          return res.status(507).json({ error: 'Review receipt limit reached (100)' });
        await fs.mkdir(dir, { recursive: true });
        receipt = { status: 'received', at: new Date().toISOString(), submission: s, card };
        const temp = path.join(dir, crypto.randomUUID() + '.tmp');
        try {
          await write(temp, JSON.stringify(receipt));
          await fs.rename(temp, file);
        } finally {
          await fs.rm(temp, { force: true });
        }
      }
      // Also finish a previous rename whose acknowledgement was lost during directory sync.
      await syncDir(dir);
      await syncDir(path.dirname(dir));
      res.json({ status: 'received', reviewId: s.reviewId, submissionId: s.submissionId, at: receipt.at, duplicate });
    });
  };
}
