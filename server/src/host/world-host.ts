// One room's world, run by the server (docs/plans/server-host.md, "The sync on the server"): a headless sync with every
// rules module, attached as host to an in-process room adapter, ticking with or without clients and saving through the
// store (the same file and shape GET /rooms/:id/snapshot serves).
//
//   const wh = createWorldHost({ roomId, store, saveMs, pidOf })   pidOf(selfId): that session's player id, or null
//   wh.onSend((msg) => ...)       the sync's outgoing messages, for the hosted room to fan out (a w:snap only to msg.to)
//   wh.deliver(msg, from)         a client's message into the sync (from = its selfId)
//   wh.step(dt)                   advance dt seconds by hand (tests pass tick: false; otherwise a 50 ms timer does it)
//   wh.status()                   worldStatus() plus the tick
//   await wh.close({ save })      stop ticking; with save, write the last tick and wait for the file
//
// The host-side work a browser host does outside the rules is done here too: src/features/helper-bank.ts's bank.wake
// for the time nobody hosted (a server restart).
import { createSync } from '../../../src/world/sync.ts';
import { installRules } from '../../../src/world/rules/index.ts';
import { SERVER_ID } from '../../../src/net/ids.ts';
import { offlineGap, MIN_GAP_MS } from '../../../src/sim/bank.ts';
import { isProtoRoom } from '../../../src/sim/tune.ts';
import { loadHomeLand, type HomeLand } from './land.ts';
import type { Store } from '../store.ts';
import { installRailwayRules } from '../../../src/world/rules/railway-index.ts';
import { isRailwayRoom, RAILWAY_NS } from '../../../src/world/railway-namespace.ts';
import { RAILWAY_CATALOG, RAILWAY_T1 } from '../../../src/sim/railway-layout.ts';
import { RAILWAY_DURATION } from '../../../src/sim/railway.ts';
import type { RailReach, RailCadence } from '../../../src/world/rules/railway.ts';
import { createRailwayRequests } from './railway-requests.ts';

const STEP_MS = 50;
// Saves skip a world whose states didn't change, but its tick still moves on, and the helper bank reads the time nobody
// hosted from the saved tick: so the tick is saved at least this often, and always on close.
const TICK_SAVE_MS = 30000;

type Msg = Record<string, unknown>;
export type WorldHostOptions = {
  roomId: string;
  store: Store;
  saveMs?: number;
  home?: HomeLand;
  tick?: boolean; // run the 50 ms timer (default true)
  pidOf?: (sid: string) => string | null; // the hosted room's binding of each session to its player
  log?: (...a: unknown[]) => void;
};

export function createWorldHost({
  roomId,
  store,
  saveMs = 2000,
  home = loadHomeLand(),
  tick = true,
  pidOf = () => null,
  log = () => {},
}: WorldHostOptions) {
  // protoRoom: playtest tuning (tune.set, tune.reset) is allowed in `proto-` rooms only (src/world/rules/tune.ts).
  const sync = createSync({ env: { protoRoom: isProtoRoom(roomId) } });
  const rules = installRules(sync, home.land as Parameters<typeof installRules>[1]);
  const sendFns = new Set<(msg: Msg) => void>();
  const msgFns = new Set<(msg: unknown, from: string) => void>();
  let writing: Promise<unknown> = Promise.resolve();
  let writeError: Error | null = null;
  let writeSequence = 0;

  // Synchronous like localStorage: the sync reads it once on becoming host, and writes on every save.
  const storage = {
    getItem() {
      const doc = store.readSync(roomId);
      return doc ? JSON.stringify(doc.data) : null;
    },
    setItem(_key: string, json: string) {
      const data = JSON.parse(json);
      const doc = { tick: data.tick, writerId: SERVER_ID, data, updatedAt: new Date().toISOString() };
      const sequence = ++writeSequence;
      writing = store
        .write(roomId, doc)
        .then((r) => {
          if (r.status !== 200) throw new Error(`save refused (${r.status}): ${JSON.stringify(r.body)}`);
          if (sequence === writeSequence) writeError = null;
        })
        .catch((error: unknown) => {
          const failure = error instanceof Error ? error : new Error(String(error));
          if (sequence === writeSequence) writeError = failure;
          log(`world ${roomId}: save failed`, failure.message);
        });
    },
  };
  sync.onSnapshot(() => {
    const st = sync.worldStatus();
    if (st.mode !== 'host' || st.loadErrors) return;
    const ms = offlineGap(Date.now(), sync.world.epochMs, sync.world.tick, rules.bank.ms());
    if (ms >= MIN_GAP_MS) sync.submitEdit({ op: 'bank.wake', i: 0, j: 0, ms });
  });
  sync.attachWorld(
    {
      selfId: SERVER_ID,
      send: (msg) => {
        for (const fn of sendFns) fn(msg as Msg);
      },
      onMessage: (h) => (msgFns.add(h), () => msgFns.delete(h)),
      onConnection: (h) => (h(true), () => {}),
      pidOf,
    },
    { roomId, host: true, storage, now: Date.now, saveMs },
  );

  let last = performance.now(),
    tickSaved = last;
  const timer = tick
    ? setInterval(() => {
        const now = performance.now();
        sync.updateWorld(Math.min(now - last, 1000) / 1000);
        last = now;
        if (now - tickSaved > TICK_SAVE_MS) {
          tickSaved = now;
          sync.saveNow(true);
        }
      }, STEP_MS)
    : null;
  timer?.unref();

  return {
    sync,
    rules,
    onSend(fn: (msg: Msg) => void) {
      sendFns.add(fn);
      return () => sendFns.delete(fn);
    },
    deliver(msg: unknown, from: string) {
      for (const h of msgFns) h(msg, from);
    },
    step: (dt: number) => sync.updateWorld(dt),
    status: () => ({ tick: sync.world.tick, ...sync.worldStatus() }),
    async close({ save = true } = {}) {
      if (timer) clearInterval(timer);
      if (save) sync.saveNow(true);
      sync.detachWorld();
      await writing;
      if (save && writeError) throw writeError;
      if (save && (sync.worldStatus().badSave || sync.worldStatus().newerSave))
        throw new Error(`world ${roomId}: saved state did not load cleanly`);
    },
  };
}
export type WorldHost = ReturnType<typeof createWorldHost>;

/** Owner-reported world pose: only reach plausibility, never server-simulated motion. */
export type RailwayPosition = { x: number; z: number; at: number };
export type RailwayHostOptions = WorldHostOptions & {
  positionOf?: (sid: string) => RailwayPosition | null;
  now?: () => number;
  monotonicNow?: () => number;
};

// Same sync, room adapter and atomic store as ordinary rooms; opted-in namespace/registry/recovery only.
export function createRailwayWorldHost({
  roomId,
  store,
  saveMs = 2000,
  home = loadHomeLand(),
  tick = true,
  pidOf = () => null,
  positionOf = () => null,
  now = Date.now,
  monotonicNow = () => performance.now(),
  log = () => {},
}: RailwayHostOptions) {
  if (!isRailwayRoom(roomId)) throw new Error('railway host requires an isolated T1 room');
  const sync = createSync();
  const rules = installRailwayRules(sync, home.land as Parameters<typeof installRailwayRules>[1]);
  const sent = new Set<(message: Msg) => void>();
  const incoming = new Set<(message: unknown, from: string) => void>();
  const send = (message: Msg) => {
    for (const fn of sent) fn(message);
  };
  let running = false;
  let closed = false;
  let startup = true;
  let savedAt = now();
  let savedTick = 0;
  const cadence = new Map<string, number>();
  const railReach: RailReach = (e, x, z, radius) => {
    const p = positionOf(e.p);
    if (
      !p ||
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.z) ||
      !Number.isFinite(p.at) ||
      now() - p.at > 2000 ||
      p.at > now()
    )
      return false;
    const dx = p.x * 100 - x,
      dz = p.z * 100 - z;
    return dx * dx + dz * dz <= radius * radius;
  };
  const railCadence: RailCadence = (e) => {
    const key = `${e.u}:${e.op}`;
    const ms = e.op === 'rail.chop' ? RAILWAY_T1.swingMs : RAILWAY_T1.unloadMs;
    const time = monotonicNow();
    if (time - (cadence.get(key) ?? -Infinity) < ms) return false;
    cadence.set(key, time);
    return true;
  };
  sync.setEnv({ railReach, railCadence });
  sync.attachWorld(
    {
      selfId: SERVER_ID,
      send: (message) => {
        if (running) send(message as Msg);
      },
      onMessage: (fn) => (incoming.add(fn), () => incoming.delete(fn)),
      onConnection: (fn) => (fn(true), () => {}),
      pidOf,
    },
    {
      roomId,
      host: true,
      now,
      saveMs,
      recovery: {
        namespace: RAILWAY_NS,
        catalog: String(RAILWAY_CATALOG),
        read() {
          const doc = store.readSync(roomId);
          if (!doc) return null;
          savedAt = Date.parse(doc.updatedAt);
          savedTick = doc.tick;
          if (!Number.isFinite(savedAt) || savedAt > now() || !Number.isSafeInteger(savedTick) || savedTick < 0)
            throw new Error('invalid railway recovery timestamp/tick');
          return doc.data;
        },
        async write(data) {
          const resume = data.tail.findLast((entry) => entry.e.op === 'rail.resume');
          // Startup compaction must not consume absent time before its resume descriptor is durable.
          // A saved descriptor carries an absolute consumed wall tick, including a crash before apply.
          const marker = typeof resume?.e.marker === 'number' ? resume.e.marker : rules.railway.railway.resumeMarker;
          const updatedAt = startup ? Math.max(savedAt, marker * 100) : now();
          const result = await store.write(roomId, {
            tick: data.checkpoint.tick,
            writerId: SERVER_ID,
            data,
            updatedAt: new Date(updatedAt).toISOString(),
          });
          if (result.status !== 200) throw new Error(`railway recovery write refused (${result.status})`);
        },
      },
    },
  );
  const requests = createRailwayRequests({
    sync,
    api: rules.railway,
    pidOf,
    send,
    available: () => running && !closed && !sync.worldStatus().recoveryError,
  });
  const ready = (async () => {
    await sync.whenDurable();
    // Tail replay already advanced ordinary ticks. Catch up only the remaining absent interval, once.
    const marker = Math.floor(now() / 100);
    const absent = Math.max(
      0,
      marker - Math.max(Math.floor(savedAt / 100), rules.railway.railway.resumeMarker) - (sync.world.tick - savedTick),
    );
    if (rules.railway.railway.start >= 0 && !rules.railway.railway.completion && absent > 0) {
      if (
        !sync.submitEdit({
          op: 'rail.resume',
          i: 0,
          j: 0,
          ticks: Math.min(RAILWAY_DURATION, absent),
          marker,
        })
      )
        throw new Error('railway offline resume refused');
      await sync.whenDurable();
      // These are live startup ticks, not a second slice of the absent interval. No ready snapshot is served yet.
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      sync.updateWorld(0.3);
      startup = false;
      sync.saveNow(true);
      await sync.whenDurable();
    }
    startup = false;
    running = !closed;
  })();
  // The caller can await readiness; the timer path also owns and reports startup failure.
  void ready.catch((e: unknown) => log(`world ${roomId}: recovery blocked`, String(e)));
  let last = performance.now();
  const timer = tick
    ? setInterval(() => {
        const time = performance.now();
        if (running && !closed) sync.updateWorld(Math.min(time - last, 1000) / 1000);
        last = time;
      }, STEP_MS)
    : null;
  timer?.unref();
  return {
    sync,
    rules,
    onSend(fn: (message: Msg) => void) {
      sent.add(fn);
      return () => sent.delete(fn);
    },
    deliver(message: unknown, from: string) {
      if (message && typeof message === 'object' && (message as Msg).t === 'w:need') {
        if (running && !closed) for (const fn of incoming) fn(message, from);
        else send({ t: 'r:state', to: from, state: sync.worldStatus().recoveryError ? 'storage' : 'starting' });
      } else requests.receive(message, from);
    },
    step(dt: number) {
      if (running && !closed) sync.updateWorld(dt);
    },
    status: () => ({
      tick: sync.world.tick,
      ...sync.worldStatus(),
      ready: running && !sync.worldStatus().recoveryError,
    }),
    whenReady: () => ready,
    async close({ save = true } = {}) {
      closed = true;
      if (timer) clearInterval(timer);
      try {
        await ready;
        await sync.whenDurable();
        if (save) {
          sync.saveNow(true);
          await sync.whenDurable();
        }
      } finally {
        sync.detachWorld();
      }
    },
  };
}
export type RailwayWorldHost = ReturnType<typeof createRailwayWorldHost>;
