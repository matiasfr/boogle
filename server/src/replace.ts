// Dev-key-only whole-room replacement. No client command or lead-tab identity grants this authority.
import crypto from 'node:crypto';
import express from 'express';
import type { Express, RequestHandler } from 'express';
import { isSeedStage, SEED_STAGES } from '../../src/sim/railway-seeds.ts';
import { isRailwayRoom, RAILWAY_PLAY_NS, railwayRoomId } from '../../src/world/railway-namespace.ts';
import { jumpOf } from '../../src/world/railway-jump.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { createRailwayWorldHost } from './host/world-host.ts';
import type { RoomHost } from './host/rooms.ts';
import type { Store } from './store.ts';
import type { Jumps } from './jump.ts';
import type { Replacements } from './replacements.ts';
import { SeedValidationBusyError, validateSeedDoc } from './seeds/validate.ts';

export type ReplaceConfig = {
  advanceKey: string;
  advanceShared: boolean;
  replaceRatePerMin: number;
  /** Test-only wall-clock override. Production always gives ten seconds. */
  replaceCountdownMs?: number;
};

export function addReplace(
  app: Express,
  cfg: ReplaceConfig,
  deps: {
    store: Store;
    roomHost: () => RoomHost | null;
    jumps: Jumps;
    replacements: Replacements;
    limit: RequestHandler[];
  },
) {
  const { store, replacements } = deps;
  let stopping = false;
  const waits = new Set<() => void>();
  const jobs = new Set<Promise<unknown>>();
  let active = 0;
  async function wait(ms: number) {
    await new Promise<void>((resolve) => {
      const cancel = () => {
        clearTimeout(timer);
        waits.delete(cancel);
        resolve();
      };
      const timer = setTimeout(cancel, ms);
      waits.add(cancel);
    });
  }
  app.post(
    '/admin/rooms/:id/replace',
    deps.limit,
    (req, res, next) => {
      if (!cfg.advanceKey) return res.status(404).json({ error: 'not found' });
      const given = Buffer.from(req.get('authorization') ?? '');
      const want = Buffer.from(`Bearer ${cfg.advanceKey}`);
      if (given.length !== want.length || !crypto.timingSafeEqual(given, want))
        return res.status(401).json({ error: 'unauthorized' });
      next();
    },
    express.json({ limit: '1kb', type: ['application/json', 'text/plain'] }),
    (req, res, next) => {
      const run = async () => {
        res.set('Cache-Control', 'no-store');
        const id = req.params.id;
        const host = deps.roomHost();
        if (!host || typeof id !== 'string' || !isRailwayRoom(id) || !host.hosts(id))
          return res.status(400).json({ error: 'not a current railway room' });
        if (id === railwayRoomId('boogle') && !cfg.advanceShared)
          return res.status(403).json({ error: 'shared island replacement is off' });
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
          return res.status(400).json({ error: 'invalid body' });
        const { stage, confirm, override } = req.body as { stage?: unknown; confirm?: unknown; override?: unknown };
        if (confirm !== id.slice(RAILWAY_PLAY_NS.length + 1))
          return res.status(409).json({ error: 'confirm the room name' });
        if (typeof stage !== 'string' || !isSeedStage(stage)) return res.status(400).json({ error: 'unknown stage' });
        if (
          (override !== undefined && typeof override !== 'boolean') ||
          Object.keys(req.body).some((k) => !['stage', 'confirm', 'override'].includes(k))
        )
          return res.status(400).json({ error: 'invalid body' });
        if (stopping) return res.status(503).json({ error: 'server stopping' });
        if (active >= 2) return res.status(429).json({ error: 'replacement capacity reached' });
        if (!replacements.begin(id)) return res.status(409).json({ error: 'busy' });
        active++;
        try {
          await replacements.recover(id);
          const previous = replacements.read(id);
          if (
            previous &&
            isSeedStage(previous.stage) &&
            SEED_STAGES.indexOf(previous.stage) > SEED_STAGES.indexOf(stage)
          )
            return res.status(409).json({ error: 'earlier stage; restore the pinned backup instead' });
          const players = host.room(id)?.status().players ?? 0;
          if (players && override !== true) return res.status(409).json({ error: 'players in the room', players });
          const seed = await deps.jumps.docFor(stage);
          if (stopping) return res.status(503).json({ error: 'server stopping' });
          if ('status' in seed) return res.status(seed.status).json({ error: seed.error });
          let validated;
          try {
            validated = await validateSeedDoc(seed);
          } catch (error) {
            if (error instanceof SeedValidationBusyError) throw error;
            return res.status(422).json({ error: 'invalid stage checkpoint' });
          }
          if (stopping) return res.status(503).json({ error: 'server stopping' });
          // Validation can take seconds; count again before notifying anyone.
          const present = host.room(id)?.status().players ?? 0;
          if (present && override !== true)
            return res.status(409).json({ error: 'players in the room', players: present });
          if (present) {
            host.room(id)!.replacing(jumpOf(stage)?.label ?? stage, 10);
            await wait(cfg.replaceCountdownMs ?? 10_000);
          }
          if (stopping) return res.status(503).json({ error: 'server stopping' });
          const record = await host.offline(
            id,
            async () => {
              // An empty, never-visited room still needs a real, restorable original checkpoint.
              if (!store.known(id)) {
                const empty = createRailwayWorldHost({ roomId: id, store, tick: false });
                try {
                  await empty.whenReady();
                  await empty.close({ save: true });
                } finally {
                  await empty.close({ save: false });
                }
              }
              const source = await store.read(id);
              if (!source) throw new Error('missing source checkpoint');
              await validateSeedDoc(source);
              if (stopping) throw new Error('server stopping; replacement cancelled');
              return replacements.replace(
                id,
                { ...seed, writerId: SERVER_ID, updatedAt: new Date().toISOString() },
                {
                  stage,
                  players: present,
                  docHash: String(validated.hash),
                },
              );
            },
            { save: true },
          );
          if (record === 'busy') return res.status(409).json({ error: 'busy' });
          return res.json({ ok: true, room: id, ...record });
        } finally {
          host.room(id)?.clearReplacing();
          replacements.end(id);
          active--;
        }
      };
      const job = run();
      jobs.add(job);
      void job.catch(next).finally(() => jobs.delete(job));
    },
  );
  return {
    async close() {
      stopping = true;
      for (const cancel of waits) cancel();
      await Promise.allSettled(jobs);
    },
  };
}
