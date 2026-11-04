// Retained internal comparisons, outside room state. See docs/plans/review-inbox.md.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Worker } from 'node:worker_threads';
import path from 'node:path';
import express from 'express';
import type { Express, Request, Response, RequestHandler } from 'express';
import type { Store } from './store.ts';
import type {
  ReviewCard,
  ReviewInput,
  ReviewReceipt,
  ReviewSide,
  ReviewSubmission,
  StoredReviewReceipt,
} from '../../protos/review-types.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SIDES: ReviewSide[] = ['before', 'after'];
const IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_CARDS = 30;
const MAX_RECEIPTS = 20;
const TOTAL_BYTES = 100 * 1024 * 1024;
const FREE_RESERVE = 128 * 1024 * 1024;
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
  return { bytes, mime: 'image/png', sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

async function decode(images: Buffer[]) {
  const worker = new Worker(new URL('./review-image-worker.ts', import.meta.url), {
    workerData: images,
    resourceLimits: { maxOldGenerationSizeMb: 64 },
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('PNG decoding timed out')), 5000);
      const finish = (error?: Error) => {
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      worker.once('message', (error: string | null) => finish(error ? new Error(error) : undefined));
      worker.once('error', finish);
      worker.once('exit', (code) => {
        if (code) finish(new Error('PNG decoder stopped'));
      });
    });
  } finally {
    await worker.terminate();
  }
}

async function diskBytes(dir: string): Promise<number> {
  let total = 0;
  for (const name of await names(dir)) {
    const file = path.join(dir, name),
      stat = await fs.lstat(file);
    total += stat.isDirectory() ? await diskBytes(file) : stat.size;
  }
  return total;
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
    readLimit: RequestHandler;
    uploadLimit: RequestHandler;
  },
) {
  const root = path.join(cfg.dataDir, 'reviews');
  let uploading = false;
  let reading = 0;
  const readSlot =
    (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
    async (req, res) => {
      if (reading >= 4) return res.status(429).set('Retry-After', '2').json({ error: 'Review reads busy' });
      reading++;
      const finished = new Promise<void>((resolve) => {
        res.once('finish', resolve);
        res.once('close', resolve);
      });
      const timer = setTimeout(() => res.destroy(), 30000);
      try {
        await handler(req, res);
        await finished;
      } finally {
        clearTimeout(timer);
        reading--;
      }
    };
  const parser = express.json({ limit: '4.1mb' });
  async function hasSpace(bytes: number) {
    const stat = await fs.statfs(cfg.dataDir);
    return stat.bavail * stat.bsize - bytes >= FREE_RESERVE && (await diskBytes(root)) + bytes <= TOTAL_BYTES;
  }
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
    deps.uploadLimit,
    async (req, res) => {
      if (uploading)
        return res.status(429).set('Retry-After', '2').json({ error: 'Another review upload is in progress' });
      uploading = true;
      const timer = setTimeout(() => req.destroy(), 15000);
      try {
        await new Promise<void>((resolve, reject) =>
          parser(req, res, (error?: unknown) => (error ? reject(error) : resolve())),
        );
        const fields = input(req.body);
        const before = media(req.body?.before);
        const after = media(req.body?.after);
        if (!fields || !before || !after)
          return res.status(400).json({ error: 'Invalid card or images (PNG, 1.5 MiB each)' });
        try {
          await decode([before.bytes, after.bytes]);
        } catch (error) {
          return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid PNG' });
        }
        await deps.withLock('reviews:storage', async () => {
          if ((await names(root)).filter((n) => UUID.test(n)).length >= MAX_CARDS)
            return res.status(507).json({ error: 'Review storage full (30 cards); archive and delete a card first' });
          if (
            !(await hasSpace(
              before.bytes.length + after.bytes.length + Buffer.byteLength(JSON.stringify(fields)) + 1000,
            ))
          )
            return res.status(507).json({ error: 'Review storage budget or 128 MiB free-volume reserve reached' });
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
            const card: ReviewCard = {
              ...fields,
              version: 1,
              id: reviewId,
              created: new Date().toISOString(),
              evidence,
            };
            await write(path.join(temp, 'card.json'), JSON.stringify(card));
            await syncDir(temp);
            await fs.rename(temp, path.join(root, reviewId));
            await syncDir(root);
            res.status(201).json(card);
          } finally {
            await fs.rm(temp, { recursive: true, force: true });
          }
        });
      } finally {
        clearTimeout(timer);
        uploading = false;
      }
    },
  );
  app.get(
    '/reviews',
    deps.readLimit,
    readSlot(async (req, res) => {
      if (!deps.authed(req, res)) return;
      const limit = Number(req.query.limit ?? 10);
      const after = req.query.after ?? '';
      const only = req.query.review;
      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 20 ||
        typeof after !== 'string' ||
        (after && !/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(after)) ||
        (only !== undefined && !id(only))
      )
        return res.status(400).json({ error: 'Use limit 1–20, optional review UUID and returned after cursor' });
      const receipts: ReviewReceipt[] = [];
      let next: string | null = null;
      outer: for (const reviewId of (await names(root)).filter((n) => UUID.test(n) && (!only || n === only)).sort()) {
        const dir = path.join(root, reviewId, 'receipts');
        for (const name of (await names(dir)).filter((n) => UUID.test(n.slice(0, -5)) && n.endsWith('.json')).sort()) {
          const cursor = `${reviewId}/${name.slice(0, -5)}`;
          if (cursor <= after) continue;
          if (receipts.length === limit) {
            next = `${receipts.at(-1)!.submission.reviewId}/${receipts.at(-1)!.submission.submissionId}`;
            break outer;
          }
          const receipt = await read<StoredReviewReceipt>(path.join(dir, name));
          const card = await read<ReviewCard>(path.join(root, reviewId, 'card.json'));
          if (receipt && card)
            receipts.push({ status: receipt.status, at: receipt.at, submission: receipt.submission, card });
        }
      }
      res.set('Cache-Control', 'no-store').json({ receipts, next });
    }),
  );
  app.delete('/reviews/:id', async (req, res) => {
    if (!deps.authed(req, res)) return;
    if (!id(req.params.id)) return res.status(400).json({ error: 'Invalid review ID' });
    await deps.withLock('reviews:storage', async () => {
      const dir = path.join(root, req.params.id);
      if (!(await read<ReviewCard>(path.join(dir, 'card.json'))))
        return res.status(404).json({ error: 'Review not found' });
      if (
        req.query.receipts !== undefined &&
        Number(req.query.receipts) !==
          (await names(path.join(dir, 'receipts'))).filter((n) => n.endsWith('.json')).length
      )
        return res.status(409).json({ error: 'New receipts arrived; archive again before deletion' });
      await fs.rm(dir, { recursive: true });
      await syncDir(root);
      res.json({ deleted: req.params.id });
    });
  });
  app.get(
    '/reviews/:id',
    deps.readLimit,
    readSlot(async (req, res) => {
      const card = id(req.params.id) ? await read<ReviewCard>(path.join(root, req.params.id, 'card.json')) : null;
      if (!card) return res.status(404).json({ error: 'Review not found' });
      res.set('Cache-Control', 'no-store').json(card);
    }),
  );
  app.get(
    '/reviews/:id/:side',
    deps.readLimit,
    readSlot(async (req, res) => {
      const side = req.params.side;
      const reviewId = req.params.id;
      if (!id(reviewId)) return res.status(404).end();
      const card = await read<ReviewCard>(path.join(root, reviewId, 'card.json'));
      if (!card || (side !== 'before' && side !== 'after')) return res.status(404).end();
      res.set({
        'Content-Type': card.evidence[side].mime,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=31536000, immutable',
      });
      res.set('Content-Length', String((await fs.stat(path.join(root, reviewId, side))).size));
      try {
        await pipeline(createReadStream(path.join(root, reviewId, side), { highWaterMark: 32 * 1024 }), res);
      } catch (error) {
        if (!res.destroyed && (error as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') throw error;
      }
    }),
  );
  return async (req: Request, res: Response) => {
    const s = submission(req.body);
    if (!s) return res.status(400).json({ error: 'Invalid review submission' });
    const owner = !!req.get('authorization');
    if (owner && !deps.authed(req, res)) return;
    return deps.withLock('reviews:storage', async () => {
      const card = await read<ReviewCard>(path.join(root, s.reviewId, 'card.json'));
      if (!card) return res.status(404).json({ error: 'Review not found' });
      const dir = path.join(root, s.reviewId, 'receipts');
      const file = path.join(dir, s.submissionId + '.json');
      let receipt = await read<StoredReviewReceipt>(file);
      const duplicate = !!receipt;
      if (receipt && JSON.stringify(receipt.submission) !== JSON.stringify(s))
        return res.status(409).json({ error: 'Submission ID already has different content' });
      if (!receipt) {
        if ((await names(dir)).filter((n) => n.endsWith('.json')).length >= MAX_RECEIPTS - (owner ? 0 : 1))
          return res.status(507).json({
            error: owner
              ? 'Review receipt limit reached (20); archive and delete the card'
              : 'Review link limit reached (19); the owner can submit the reserved receipt using the authenticated CLI',
          });
        receipt = { status: 'received', at: new Date().toISOString(), submission: s };
        if (!(await hasSpace(Buffer.byteLength(JSON.stringify(receipt)))))
          return res.status(507).json({ error: 'Review storage budget or free-volume reserve reached' });
        await fs.mkdir(dir, { recursive: true });
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
