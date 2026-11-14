// One room's world, run by the server: a headless clock/checkpoint attached to an in-process room adapter,
// ticking with or without clients and saving through the
// store (the same file and shape GET /rooms/:id/snapshot serves).
//
//   const wh = createWorldHost({ roomId, store, saveMs })
//   wh.onSend((msg) => ...)       the sync's outgoing clock messages, for the hosted room to fan out
//   wh.deliver(msg, from)         a client's message into the sync (from = its selfId)
//   wh.step(dt)                   advance dt seconds of the 60 Hz room clock by hand (tests pass tick: false; otherwise a
//                                 step timer does it)
//   wh.status()                   worldStatus() plus the tick
//   await wh.close({ save })      stop ticking; with save, write the last tick and wait for the file
//
import { createSync } from '../../../src/world/sync.ts';
import { STEP_MS } from '../../../src/world/room-clock.ts';
import { SERVER_ID } from '../../../src/net/ids.ts';
import type { StepMeter } from './step-meter.ts';
import type { Store } from '../store.ts';
import { isRailwayRoom } from '../../../src/world/railway-namespace.ts';
import { createHostStatus } from './host-status.ts';
import { createHostCheckpoint } from './host-checkpoint.ts';
import type { RailwayPosition } from './railway-supply.ts';
import { createHostAway } from './host-away.ts';
export type { RailwayPosition } from './railway-supply.ts';
import { install as installRailway } from '../../../src/world/railway-server.ts';
import { createReplicator, type Replicator } from '../../../src/world/replicate-server.ts';
import { createHostCommands } from './host-commands.ts';
import { installServer as installRoster } from '../../../src/world/rules/roster.ts';
import { installRailTune } from '../../../src/world/rules/tune.ts';
import { projectRailTune, projectRoster } from '../../../src/world/classic-replicate.ts';
import { createServerOps } from '../../../src/world/server-ops.ts';
import { installSeats } from '../../../src/world/rules/seats.ts';
import { projectSeats } from '../../../src/world/seat-replicate.ts';
import { createHostMaintenance } from './host-maintenance.ts';
import { createHostSupply } from './host-supply.ts';
import { createHostBoogler } from './host-boogler.ts';

// The room clock (src/world/room-clock.ts): a 60 Hz step timer; rules run every RULE_STEPS steps inside sync.stepWorld.
// Saves skip unchanged state, but persist the advancing room clock at least this often, and always on close.
const TICK_SAVE_MS = 30000;

type Msg = Record<string, unknown>;
export type WorldHostOptions = {
  roomId: string;
  store: Store;
  saveMs?: number;
  tick?: boolean; // run the step timer (default true)
  meter?: StepMeter; // the step timer's lateness, for the status route (step-meter.ts)
  pidOf?: (sid: string) => string | null; // the hosted room's binding of each session to its player
  tuneController?: (sid: string) => boolean; // explicit operator assignment, never elected from room leadership
  log?: (...a: unknown[]) => void;
};

export function createWorldHost({
  roomId,
  store,
  saveMs = 2000,
  tick = true,
  meter,
  log = () => {},
}: WorldHostOptions) {
  const sync = createSync();
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
  sync.attachWorld(
    {
      selfId: SERVER_ID,
      send: (msg) => {
        for (const fn of sendFns) fn(msg as Msg);
      },
      onMessage: (h) => (msgFns.add(h), () => msgFns.delete(h)),
      onConnection: (h) => (h(true), () => {}),
    },
    { roomId, host: true, storage, now: Date.now, saveMs },
  );

  let last = performance.now(),
    tickSaved = last;
  const timer = tick
    ? setInterval(() => {
        const now = performance.now();
        meter?.timer(now);
        sync.stepWorld(Math.min(now - last, 1000));
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
    onSend(fn: (msg: Msg) => void) {
      sendFns.add(fn);
      return () => sendFns.delete(fn);
    },
    deliver(msg: unknown, from: string) {
      for (const h of msgFns) h(msg, from);
    },
    step: (dt: number) => sync.stepWorld(dt * 1000),
    status: () => ({ tick: sync.world.tick, ...sync.worldStatus() }),
    async close({ save = true } = {}) {
      if (timer) clearInterval(timer);
      if (save) sync.saveNow(true);
      sync.detachWorld();
      await writing;
      if (save && writeError) throw writeError;
      if (save && sync.worldStatus().badSave) throw new Error(`world ${roomId}: saved state did not load cleanly`);
    },
  };
}
export type WorldHost = ReturnType<typeof createWorldHost>;

export type RailwayHostOptions = WorldHostOptions & {
  /** Every connected session, including unknown poses. Unknown blocks maintenance. */
  positions?: () => (RailwayPosition | null)[];
  hasPlayers?: () => boolean;
  now?: () => number;
  /** The room's replicator (hosted-room.ts flushes it each step); a host of its own makes one. */
  replication?: Replicator;
  /** Start simulating once loaded (default). A hosted room passes false and wakes the world on its first join. */
  awake?: boolean;
};

// The railway room: roster, rail tuning and railway are Server kind, applied when an action arrives and replicated
// to clients by the room's replicator. Persistence is the sync's 2 s checkpoint plus the save on close: a crash may
// roll the room back up to 2 s (owner, 6 November). Actions are not journalled before they apply.
//
// The paused world (docs/decisions.md, "2026-11-06, economy principles amended"): a room simulates only while
// someone is in it. The hosted room pauses it after its last player has been gone a short grace (pause()), and the next
// join wakes it (wake()) with one away credit for the time it stood still, the same credit a load from disk applies for
// the time the server was down: the yards fill railAwayCredit(away) of production (src/sim/railway-away.ts), an absence
// of at least RAIL_AWAY.finishTicks finishes the funded job (a shorter one advances it), and the supply pulse catches up
// regrowth and drop recovery (up to 24 h, src/sim/railway-supply.ts). A rejoin within the grace never paused: no credit.
export function createRailwayWorldHost({
  roomId,
  store,
  saveMs = 2000,
  tick = true,
  pidOf = () => null,
  tuneController = () => false,
  positions = () => [null],
  hasPlayers = () => true,
  now = Date.now,
  meter,
  log = () => {},
  replication = createReplicator(),
  awake = true,
}: RailwayHostOptions) {
  if (!isRailwayRoom(roomId)) throw new Error('railway host requires a railway namespace');
  const ops = createServerOps();
  const sync = createSync();
  const roster = installRoster(sync, ops, replication, now);
  const seats = installSeats(ops, replication, now);
  projectSeats(replication, seats);
  projectRoster(replication, roster);
  const railTune = installRailTune(sync, ops, replication);
  projectRailTune(replication, railTune);
  const api = installRailway(sync, { railTune }, replication);
  const rules = { roster, railTune, railway: api, seats };
  const sent = new Set<(message: Msg) => void>();
  const send = (message: Msg) => {
    for (const fn of sent) fn(message);
  };
  const {
    boogler,
    reactions: booglerReactions,
    meter: booglerMeter,
  } = createHostBoogler({
    sync,
    ops,
    replication,
    now,
    positions,
    active: () => checkpoint.running() && hasPlayers(),
  });
  const away = createHostAway(api, now);
  const checkpoint = createHostCheckpoint({
    sync,
    api,
    away,
    roomId,
    store,
    now,
    saveMs,
    awake,
    send,
    log,
    failed: () => requests.failed(),
    whenCommandsDurable: () => requests.whenDurable(),
    maintainSupply: () => supply.maintain(),
    pauseActors: () => {
      boogler.pause();
      seats.clear();
    },
  });
  const supply = createHostSupply({
    api,
    now,
    positions,
    available: checkpoint.available,
  });
  const requests = createHostCommands({
    api,
    sync,
    ops,
    roomId,
    pidOf,
    tuneController,
    send,
    replication,
    available: () => checkpoint.available() && supply.current(),
    unavailable: checkpoint.unavailable,
    save: checkpoint.saveCommand,
  });
  const maintenance = createHostMaintenance({
    api,
    railTune,
    now,
    positions,
    active: requests.active,
    maintainSupply: supply.maintain,
  });
  const ready = checkpoint.start();
  const status = createHostStatus({
    sync,
    tick,
    meter,
    checkpoint,
    maintain: maintenance.maintain,
    receive: requests.receive,
    failed: requests.failed,
    seats,
    boogler,
    booglerMeter,
    ops,
  });
  return {
    sync,
    rules,
    replication,
    ops,
    stats: status.stats,
    onSend(fn: (message: Msg) => void) {
      sent.add(fn);
      return () => sent.delete(fn);
    },
    deliver(message: unknown, from: string) {
      if (!requests.failed() && !supply.current()) supply.maintain();
      status.deliver(message, from);
    },
    step: status.step,
    status: status.status,
    whenReady: () => ready,
    wake: checkpoint.wake,
    pause: checkpoint.pause,
    paused: checkpoint.paused,
    /** The room's actual departure of a session (after its reconnect grace). A carried beam waits for its carrier. */
    depart(sid: string) {
      // requests.depart removed the pid's one session, so the pid is no longer active.
      const session = requests.depart(sid);
      if (!session) return;
      booglerReactions.release(session.pid);
      seats.release(session.pid);
      maintenance.departed(session.pid);
    },
    close: (options?: { save?: boolean }) => checkpoint.close(status.stop, options),
  };
}
export type RailwayWorldHost = ReturnType<typeof createRailwayWorldHost>;
