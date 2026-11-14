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
import { isProtoRoom } from '../../../src/sim/tune.ts';
import type { StepMeter } from './step-meter.ts';
import type { Store } from '../store.ts';
import { isRailwayRoom, RAILWAY_PLAY_NS } from '../../../src/world/railway-namespace.ts';
import { LINE1_CATALOG } from '../../../src/sim/railway-line-layout.ts';
import type { RailwayPosition } from './railway-supply.ts';
import { railAwayCredit, RAIL_AWAY } from '../../../src/sim/railway-away.ts';
export type { RailwayPosition } from './railway-supply.ts';
import { install as installRailway, type Actor } from '../../../src/world/railway-server.ts';
import { railCadence, RAIL_CADENCE_SLACK_MS } from '../../../src/world/railway-predict.ts';
import { createReplicator, type Replicator } from '../../../src/world/replicate-server.ts';
import { createRailwayRequests, type ActorFacts } from './railway-requests.ts';
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
  const namespace = RAILWAY_PLAY_NS;
  const ops = createServerOps();
  // Preserve the existing playtest-only tune policy; ordinary railway rooms cannot change shared rates.
  const env = { protoRoom: isProtoRoom(roomId.slice(namespace.length + 1)), tuneController };
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
  let running = false;
  let closed = false;
  let startup = true;
  let loaded = false; // startup finished without error
  let present = awake; // someone is here (or the caller simulates without a room): wake once loaded
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
    active: () => running && hasPlayers(),
  });
  // The 100 ms marker at which the room stopped simulating, or null while it runs. A save while paused is stamped
  // with it, so neither a reload nor a crash counts the paused time as hosted.
  let awayMarker: number | null = null;
  let savedAt = now();
  let savedTick = 0;
  // The actor owns their body (docs/plans/replication.md, revision 1): a client action carries its own position
  // (`at`, centimetres) and action time (`ms`, the client's monotonic clock), and reach and cadence are judged from
  // those, never from presence or arrival time. They are validation facts only, never saved or replicated.
  const clientClocks = new Map<string, { epoch: number; last: Map<string, number> }>();
  const actor = (a: ActorFacts): Actor => ({
    reach(x, z, radius) {
      const dx = a.at[0] - x,
        dz = a.at[2] - z;
      return dx * dx + dz * dz <= radius * radius;
    },
    height: (y, radius) => Math.abs(a.at[1] - y) <= radius,
    // railCadence on the client's own action clock, the check its prediction also runs. No bound against the
    // server's clock: exploits don't matter in casual co-op, and such a bound refuses honest clients whose clock runs
    // at another rate (a test harness's warped page clock, a throttled tab).
    cadence(op) {
      const { kind, ms } = railCadence(op);
      let clock = clientClocks.get(a.pid);
      if (!clock || clock.epoch !== a.epoch) {
        clock = { epoch: a.epoch, last: new Map() }; // a new session is a new page, with its own clock
        clientClocks.set(a.pid, clock);
      }
      if (a.ms - (clock.last.get(kind) ?? -Infinity) < ms - RAIL_CADENCE_SLACK_MS) return false;
      clock.last.set(kind, a.ms);
      return true;
    },
  });
  const supply = createHostSupply({
    api,
    now,
    positions,
    available: () => running && !closed && !sync.worldStatus().recoveryError,
  });
  let startupError: string | null = null;
  const attach = () =>
    sync.attachWorld(
      {
        selfId: SERVER_ID,
        send: (message) => {
          if (running) send(message as Msg);
        },
        onMessage: () => () => {},
        onConnection: (fn) => (fn(true), () => {}),
      },
      {
        roomId,
        host: true,
        now,
        saveMs,
        recovery: {
          namespace,
          catalog: String(LINE1_CATALOG),
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
            // Once an apply fails, no newly started write may persist its partial mutation;
            // an already-started safe write can finish.
            if (requests.failed()) throw new Error('server command storage failed');
            // Until startup has applied the offline catch-up, a save must not claim the absent time as passed.
            const updatedAt = startup
              ? Math.max(savedAt, api.resumeMarker() * 100)
              : awayMarker !== null
                ? awayMarker * 100
                : now();
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
    api,
    pidOf,
    send,
    replication,
    available: () => running && !closed && !sync.worldStatus().recoveryError && supply.current(),
    unavailable: () => (startupError || sync.worldStatus().recoveryError ? 'storage' : 'starting'),
    actor,
    commands: {
      ops,
      context: (from, actor) => ({ from, tick: sync.world.tick, actor, ...env }),
      async save() {
        // saveNow is a no-op while an older checkpoint is pending. Drain it first, then capture this command and
        // its receipt; waiting only for that older write would falsely acknowledge unsaved state.
        // A later apply may have failed before this callback starts OR while it awaits that older write.
        if (requests.failed()) throw new Error('server command storage failed');
        await sync.whenDurable();
        if (requests.failed()) throw new Error('server command storage failed');
        sync.saveNow(true);
        await sync.whenDurable();
      },
    },
  });
  const maintenance = createHostMaintenance({
    api,
    railTune,
    now,
    positions,
    active: requests.active,
    maintainSupply: supply.maintain,
  });
  const ready = (async () => {
    attach();
    await sync.whenDurable();
    // No session survives a server restart: a held beam's carrier is away from now (maintainBeam), and keeps it if they
    // come back within the grace.
    // The room stood still from its last checkpoint: the away credit waits for a join.
    awayMarker = Math.min(
      Math.floor(now() / 100),
      Math.max(Math.floor(savedAt / 100), api.resumeMarker()) + (sync.world.tick - savedTick),
    );
    startup = false;
    if (present) credit(); // whoever's joining sees the credited world in the startup checkpoint
    api.touchAll(); // every component, from change tick 0, for whoever joins
    sync.saveNow(true);
    await sync.whenDurable();
    loaded = !closed;
    if (present) wakeNow();
  })();
  // The one away credit for the time since awayMarker; consumed once (railResume's marker), never read from a client.
  function credit() {
    if (awayMarker === null) return false;
    const marker = Math.floor(now() / 100);
    const away = Math.max(0, marker - awayMarker);
    awayMarker = null;
    if (away <= 0) return false;
    // api.resume caps the job's ticks at what the funded job has left: a whole absence finishes it.
    api.resume(away >= RAIL_AWAY.finishTicks ? Number.MAX_SAFE_INTEGER : away, marker, railAwayCredit(away));
    return true;
  }
  function wakeNow() {
    if (!loaded || closed || running || requests.failed() || sync.worldStatus().recoveryError) return;
    const credited = credit();
    running = true;
    supply.maintain(); // regrowth and drop recovery catch up on the join, not a rule tick later
    if (credited) sync.saveNow(true);
  }
  // The caller can await readiness; the timer path also owns and reports startup failure.
  void ready.catch((e: unknown) => {
    startupError = e instanceof Error ? e.message : String(e);
    log(`world ${roomId}: recovery blocked`, startupError);
  });
  // Server cost (npm run load, /rooms/:id/status): ms per timer wake (steps, rules, commit, flush) and per action.
  const stats = { wakes: 0, steps: 0, stepMs: 0, maxStepMs: 0, actions: 0, actionMs: 0, maxActionMs: 0 };
  let last = performance.now();
  const timer = tick
    ? setInterval(() => {
        const time = performance.now();
        meter?.timer(time);
        if (running && !closed && !requests.failed()) {
          const before = sync.world.tick;
          const step0 = sync.roomStep();
          sync.stepWorld(Math.min(time - last, 1000));
          if (sync.world.tick !== before) {
            maintenance.maintain();
          }
          const ms = performance.now() - time;
          stats.wakes++;
          stats.steps += sync.roomStep() - step0;
          stats.stepMs += ms;
          stats.maxStepMs = Math.max(stats.maxStepMs, ms);
        }
        last = time;
      }, STEP_MS)
    : null;
  timer?.unref();
  return {
    sync,
    rules,
    replication,
    ops,
    stats,
    onSend(fn: (message: Msg) => void) {
      sent.add(fn);
      return () => sent.delete(fn);
    },
    deliver(message: unknown, from: string) {
      if (!requests.failed() && !supply.current()) supply.maintain();
      const t0 = performance.now();
      requests.receive(message, from);
      const ms = performance.now() - t0;
      stats.actions++;
      stats.actionMs += ms;
      stats.maxActionMs = Math.max(stats.maxActionMs, ms);
    },
    step(dt: number) {
      if (running && !closed && !requests.failed()) {
        sync.stepWorld(dt * 1000);
        maintenance.maintain();
      }
    },
    status: () => {
      const status = sync.worldStatus();
      const failed = requests.failed();
      return {
        tick: sync.world.tick,
        seats: seats.rows(),
        boogler: boogler.leg(),
        booglerMeter: booglerMeter.report(),
        booglerRefused: { gift: ops.refusals('boogler.gift'), puff: ops.refusals('boogler.puff') },
        ...status,
        recoveryError: startupError ?? status.recoveryError ?? (failed ? 'server command storage failed' : null),
        ready: loaded && !startupError && !status.recoveryError && !failed,
        paused: !running,
      };
    },
    whenReady: () => ready,
    /** Someone joined: a paused room applies its one away credit and simulates again. */
    wake() {
      present = true;
      wakeNow();
    },
    /** Nobody is here (after the hosted room's grace): stop simulating and save the stamp the away credit counts from. */
    pause() {
      present = false;
      boogler.pause();
      seats.clear();
      if (!running || closed || requests.failed()) return;
      running = false;
      awayMarker = Math.floor(now() / 100);
      sync.saveNow(true);
    },
    paused: () => !running,
    /** The room's actual departure of a session (after its reconnect grace). A carried beam waits for its carrier. */
    depart(sid: string) {
      // requests.depart removed the pid's one session, so the pid is no longer active.
      const session = requests.depart(sid);
      if (!session) return;
      booglerReactions.release(session.pid);
      seats.release(session.pid);
      maintenance.departed(session.pid);
    },
    async close({ save = true } = {}) {
      closed = true;
      if (timer) clearInterval(timer);
      try {
        await ready;
        await requests.whenDurable();
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
