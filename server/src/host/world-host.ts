// One room's world, run by the server (docs/plans/server-host.md, "The sync on the server"): a headless sync with every
// rules module, attached as host to an in-process room adapter, ticking with or without clients and saving through the
// store (the same file and shape GET /rooms/:id/snapshot serves).
//
//   const wh = createWorldHost({ roomId, store, saveMs, pidOf })   pidOf(selfId): that session's player id, or null
//   wh.onSend((msg) => ...)       the sync's outgoing messages, for the hosted room to fan out (a w:snap only to msg.to)
//   wh.deliver(msg, from)         a client's message into the sync (from = its selfId)
//   wh.step(dt)                   advance dt seconds of the 60 Hz room clock by hand (tests pass tick: false; otherwise a
//                                 step timer does it)
//   wh.status()                   worldStatus() plus the tick
//   await wh.close({ save })      stop ticking; with save, write the last tick and wait for the file
//
// Classic only: the host-side work a browser host does outside the rules is done here too, src/features/helper-bank.ts's
// bank.wake for the time nobody hosted (a server restart). The helper bank goes with classic; railway rooms never wake it
// and use the away credit instead (createRailwayWorldHost below).
import { createSync } from '../../../src/world/sync.ts';
import { STEP_MS } from '../../../src/world/room-clock.ts';
import { installRules } from '../../../src/world/rules/index.ts';
import { SERVER_ID } from '../../../src/net/ids.ts';
import { offlineGap, MIN_GAP_MS } from '../../../src/sim/bank.ts';
import { isProtoRoom } from '../../../src/sim/tune.ts';
import type { StepMeter } from './step-meter.ts';
import { loadHomeLand, type HomeLand } from './land.ts';
import type { Store } from '../store.ts';
import { isRailwayRoom, RAILWAY_PLAY_NS } from '../../../src/world/railway-namespace.ts';
import { RAILWAY_SOURCES } from '../../../src/sim/railway-layout.ts';
import { LINE1_CATALOG } from '../../../src/sim/railway-line-layout.ts';
import { railGrowthMask, railGrows, railGrowthAllowed, type SupplyPulse } from '../../../src/sim/railway-supply.ts';
import { railNobodyNear, type RailwayPosition } from './railway-supply.ts';
import { railAwayCredit, RAIL_AWAY } from '../../../src/sim/railway-away.ts';
export type { RailwayPosition } from './railway-supply.ts';
import { install as installRailway, type Actor } from '../../../src/world/railway-server.ts';
import { railCadence, RAIL_CADENCE_SLACK_MS } from '../../../src/world/railway-predict.ts';
import { createReplicator, type Replicator } from '../../../src/world/replicate-server.ts';
import { createRailwayRequests, type ActorFacts } from './railway-requests.ts';
import { canSet, cleanName } from '../../../src/sim/roster.ts';

// The room clock (src/world/room-clock.ts): a 60 Hz step timer; rules run every RULE_STEPS steps inside sync.stepWorld.
// Saves skip a world whose states didn't change, but its tick still moves on, and the helper bank reads the time nobody
// hosted from the saved tick: so the tick is saved at least this often, and always on close.
const TICK_SAVE_MS = 30000;

// JSON escapes lone UTF-16 surrogates to six bytes each. Preserve their displayed replacement character while
// keeping the existing sixteen-character name and three-byte-per-code-unit recovery bound (ES2022 browsers).
function recoveryName(value: unknown) {
  return Array.from(cleanName(value), (c) => {
    const unit = c.charCodeAt(0);
    return c.length === 1 && unit >= 0xd800 && unit <= 0xdfff ? '\ufffd' : c;
  }).join('');
}

type Msg = Record<string, unknown>;
export type WorldHostOptions = {
  roomId: string;
  store: Store;
  saveMs?: number;
  home?: HomeLand;
  tick?: boolean; // run the 50 ms timer (default true)
  meter?: StepMeter; // the step timer's lateness, for the status route (step-meter.ts)
  pidOf?: (sid: string) => string | null; // the hosted room's binding of each session to its player
  tuneController?: (sid: string) => boolean; // explicit operator assignment, never elected from room leadership
  log?: (...a: unknown[]) => void;
};

export function createWorldHost({
  roomId,
  store,
  saveMs = 2000,
  home = loadHomeLand(),
  tick = true,
  pidOf = () => null,
  tuneController = () => false,
  meter,
  log = () => {},
}: WorldHostOptions) {
  // protoRoom: playtest tuning (tune.set, tune.reset) is allowed in `proto-` rooms only (src/world/rules/tune.ts).
  const sync = createSync({ env: { protoRoom: isProtoRoom(roomId), tuneController } });
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
    rules,
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
  now?: () => number;
  /** The room's replicator (hosted-room.ts flushes it each step); a host of its own makes one. */
  replication?: Replicator;
  /** Start simulating once loaded (default). A hosted room passes false and wakes the world on its first join. */
  awake?: boolean;
};

// The railway room (docs/plans/replication.md, R1a): the classic lockstep states (roster, tune, ...) on the sync as
// before, and the `railway` as Server-kind state on the same sync, applied the moment an action arrives and replicated
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
  home = loadHomeLand(),
  tick = true,
  pidOf = () => null,
  tuneController = () => false,
  positions = () => [null],
  now = Date.now,
  meter,
  log = () => {},
  replication = createReplicator(),
  awake = true,
}: RailwayHostOptions) {
  if (!isRailwayRoom(roomId)) throw new Error('railway host requires a railway namespace');
  const namespace = RAILWAY_PLAY_NS;
  // Preserve the existing playtest-only tune policy; ordinary railway rooms cannot change shared rates.
  const sync = createSync({
    env: { protoRoom: isProtoRoom(roomId.slice(namespace.length + 1)), tuneController },
  });
  const base = installRules(sync, home.land as Parameters<typeof installRules>[1]);
  const api = installRailway(sync, base, replication);
  const rules = { ...base, railway: api };
  const sent = new Set<(message: Msg) => void>();
  const incoming = new Set<(message: unknown, from: string) => void>();
  const send = (message: Msg) => {
    for (const fn of sent) fn(message);
  };
  let running = false;
  let closed = false;
  let startup = true;
  let loaded = false; // startup finished without error
  let present = awake; // someone is here (or the caller simulates without a room): wake once loaded
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
  const supplySafe = (e: SupplyPulse) => {
    const people = positions();
    const beam = api.beam();
    const boiler = api.boiler();
    return (
      RAILWAY_SOURCES.every((_source, k) => !railGrows(e.grow, k) || railGrowthAllowed(k, true)) &&
      (e.beam === undefined ||
        (beam.state === 'ground' &&
          beam.revision === e.beam &&
          beam.age === 21 &&
          railNobodyNear(people, now(), beam.x, beam.z))) &&
      (e.boiler === undefined ||
        (boiler.state === 'ground' &&
          boiler.revision === e.boiler &&
          boiler.age === 21 &&
          railNobodyNear(people, now(), boiler.x, boiler.z))) &&
      e.recover.every((id) => {
        const pile = api.piles().find((p) => p.id === id);
        return !!pile && railNobodyNear(people, now(), pile.x, pile.z);
      })
    );
  };
  // At most one supply pulse per rule tick: the wall-clock minute marker, regrowth and one recovered pile.
  const maintainSupply = () => {
    if (!running || closed || sync.worldStatus().recoveryError) return;
    const marker = Math.floor(now() / 60000);
    if (marker < api.supplyMarker()) return;
    const people = positions();
    const recover = api
      .piles()
      .filter(
        (pile) => (marker > api.supplyMarker() || pile.age === 21) && railNobodyNear(people, now(), pile.x, pile.z),
      )
      .map((pile) => pile.id)
      .sort((a, b) => a - b)
      .slice(0, 1);
    const ground = api.beam();
    const beam =
      ground.state === 'ground' && ground.age === 21 && railNobodyNear(people, now(), ground.x, ground.z)
        ? ground.revision
        : undefined;
    const b = api.boiler();
    const boiler =
      b.state === 'ground' && b.age === 21 && railNobodyNear(people, now(), b.x, b.z) ? b.revision : undefined;
    if (marker === api.supplyMarker() && !recover.length && beam === undefined && boiler === undefined) return;
    const grow = railGrowthMask(
      RAILWAY_SOURCES.flatMap((_source, k) => (api.felled(k) && railGrowthAllowed(k, true) ? [k] : [])),
    );
    const pulse: SupplyPulse = {
      marker,
      grow,
      recover,
      ...(beam === undefined ? {} : { beam }),
      ...(boiler === undefined ? {} : { boiler }),
    };
    if (supplySafe(pulse)) api.supply(pulse);
  };
  let startupError: string | null = null;
  const attach = () =>
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
  // New material may not inherit an unprocessed absence from the global supply marker.
  // One minute is the deliberately conservative 21/31-minute quantization; marker zero has no elapsed age.
  const supplyCurrent = () => !api.supplyMarker() || Math.floor(now() / 60000) - api.supplyMarker() <= 1;
  const requests = createRailwayRequests({
    api,
    pidOf,
    send,
    replication,
    available: () => running && !closed && !sync.worldStatus().recoveryError && supplyCurrent(),
    unavailable: () => (startupError || sync.worldStatus().recoveryError ? 'storage' : 'starting'),
    actor,
  });
  // The unique beam stays with its carrier through an absence (a hidden tab, a reload, a lost link, a restart): while
  // they are here it follows where they stand (once a second, from presence); a carrier who comes back within
  // `railBeamGraceS` still carries it (railSession moves it to their new session); one who stays away longer has it
  // put down where they last stood (owner, 6 November: you keep your load, or it goes down where you stood).
  let beamAway: number | null = null;
  let stoodAt = -Infinity;
  /** Metres to whole centimetres, never -0 (Math.round gives -0 just south of zero, and the ECS int schema refuses it). */
  const cm = (m: number) => Math.round(m * 100) || 0;
  const maintainBeam = () => {
    const beam = api.beam();
    if (beam.state !== 'held') return void (beamAway = null);
    const t = now();
    if (requests.active(beam.holder)) {
      beamAway = null;
      if (t - stoodAt < 1000) return;
      stoodAt = t;
      const p = positions().find((row) => row?.pid === beam.holder && row.y !== undefined && t - row.at <= 2000);
      // Presence is the body's centre in metres; the beam lies at the feet.
      if (p) api.beamStood(beam.holder, cm(p.x), cm(p.y!) - 45, cm(p.z));
      return;
    }
    beamAway ??= t;
    if (t - beamAway >= rules.tune.get('railBeamGraceS') * 1000) {
      api.beamPutDown(beam.holder);
      beamAway = null;
    }
  };
  // The hauled boiler follows the same rule on its own clock (docs/plans/boiler-first-choice.md, Part 3).
  let boilerAway: number | null = null;
  let boilerStoodAt = -Infinity;
  const maintainBoiler = () => {
    const b = api.boiler();
    if (b.state !== 'held') return void (boilerAway = null);
    const t = now();
    if (requests.active(b.holder)) {
      boilerAway = null;
      if (t - boilerStoodAt < 1000) return;
      boilerStoodAt = t;
      const p = positions().find((row) => row?.pid === b.holder && row.y !== undefined && t - row.at <= 2000);
      // Presence is the body's centre in metres; the boiler is put down at the feet.
      if (p) api.boilerStood(b.holder, cm(p.x), cm(p.y!) - 45, cm(p.z));
      return;
    }
    boilerAway ??= t;
    if (t - boilerAway >= rules.tune.get('railBeamGraceS') * 1000) {
      api.boilerPutDown(b.holder);
      boilerAway = null;
    }
  };
  // A footing works the same way: its carrier keeps it through the grace, then it goes back to the Works rack (the
  // kiln casts exactly the sixteen the sites need, so one held by a leaver would stall the crossing for good).
  const footAway = new Map<string, number>();
  const maintainFeet = () => {
    const holders = api.footHolders();
    for (const pid of footAway.keys()) if (!holders.some((h) => h.pid === pid)) footAway.delete(pid);
    for (const { pid, epoch } of holders) {
      if (requests.active(pid)) {
        footAway.delete(pid);
        continue;
      }
      const away = footAway.get(pid) ?? now();
      footAway.set(pid, away);
      if (now() - away >= rules.tune.get('railBeamGraceS') * 1000) {
        api.footRelease(pid, epoch);
        footAway.delete(pid);
      }
    }
  };
  const ready = (async () => {
    attach();
    await sync.whenDurable();
    // No session survives a server restart: a held beam's carrier is away from now (maintainBeam), and keeps it if they
    // come back within the grace.
    // The room stood still from its last save (less any tail the recovery replayed): the away credit waits for a join.
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
    if (!loaded || closed || running || sync.worldStatus().recoveryError) return;
    const credited = credit();
    running = true;
    maintainSupply(); // regrowth and drop recovery catch up on the join, not a rule tick later
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
        if (running && !closed) {
          const before = sync.world.tick;
          const step0 = sync.roomStep();
          sync.stepWorld(Math.min(time - last, 1000));
          if (sync.world.tick !== before) {
            maintainSupply(); // on rule ticks only, not 60 times a second
            maintainBeam();
            maintainBoiler();
            maintainFeet();
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
    stats,
    onSend(fn: (message: Msg) => void) {
      sent.add(fn);
      return () => sent.delete(fn);
    },
    deliver(message: unknown, from: string) {
      // The retained base APIs support eager consumers, but no classic material owner may accept edits here.
      // Keep this allow-list bounded: admitting another state also needs a maximum-envelope proof.
      if (message && typeof message === 'object' && (message as Msg).t === 'w:edit') {
        const e = (message as Msg).e;
        if (!running || closed || !e || typeof e !== 'object') return;
        const edit = e as Msg;
        if (edit.op === 'who.set' && canSet(rules.roster.roster, pidOf(from), edit.n, edit.c))
          sync.receiveEdit({ op: 'who.set', i: 0, j: 0, n: recoveryName(edit.n), c: edit.c }, from);
        else if (
          (edit.op === 'tune.set' || edit.op === 'tune.commit') &&
          typeof edit.key === 'string' &&
          RAIL_TUNE_KEYS.has(edit.key)
        ) {
          // Preserve correlation exactly, but bound its escaped representation in the durable tail.
          if (edit.op === 'tune.commit' && typeof edit.requestId === 'string' && edit.requestId.length > 64) {
            if (edit.requestId.length <= 80)
              send({
                t: 'w:rejected',
                to: from,
                op: edit.op,
                requestId: edit.requestId,
                reason: 'request-id-too-long',
              });
            return;
          }
          // Only canonical fields reach sync. It still owns controller/catalog/revision validation,
          // authenticated p/u, recovery admission and correlated refusal; queued is not applied.
          const clean: Msg = { op: edit.op, i: edit.i, j: edit.j, key: edit.key, v: edit.v };
          if (edit.op === 'tune.commit') {
            clean.expectedRevision = edit.expectedRevision;
            clean.requestId = edit.requestId;
          }
          for (const fn of incoming) fn({ t: 'w:edit', e: clean }, from);
        } else if (
          edit.op === 'tune.commit' &&
          typeof edit.requestId === 'string' &&
          edit.requestId.length > 0 &&
          edit.requestId.length <= 80
        ) {
          send({ t: 'w:rejected', to: from, op: 'tune.commit', requestId: edit.requestId });
        }
        return;
      }
      if (message && typeof message === 'object' && (message as Msg).t === 'w:need') {
        if (running && !closed) for (const fn of incoming) fn(message, from);
      } else {
        if (!supplyCurrent()) maintainSupply();
        const t0 = performance.now();
        requests.receive(message, from);
        const ms = performance.now() - t0;
        stats.actions++;
        stats.actionMs += ms;
        stats.maxActionMs = Math.max(stats.maxActionMs, ms);
      }
    },
    step(dt: number) {
      if (running && !closed) {
        sync.stepWorld(dt * 1000);
        maintainSupply();
        maintainBeam();
        maintainBoiler();
        maintainFeet();
      }
    },
    status: () => ({
      tick: sync.world.tick,
      ...sync.worldStatus(),
      recoveryError: startupError ?? sync.worldStatus().recoveryError,
      ready: loaded && !startupError && !sync.worldStatus().recoveryError,
      paused: !running,
    }),
    whenReady: () => ready,
    /** Someone joined: a paused room applies its one away credit and simulates again. */
    wake() {
      present = true;
      wakeNow();
    },
    /** Nobody is here (after the hosted room's grace): stop simulating and save the stamp the away credit counts from. */
    pause() {
      present = false;
      if (!running || closed) return;
      running = false;
      awayMarker = Math.floor(now() / 100);
      sync.saveNow(true);
    },
    paused: () => !running,
    /** The room's actual departure of a session (after its reconnect grace). A carried beam waits for its carrier. */
    depart(sid: string) {
      const session = requests.depart(sid);
      const beam = api.beam();
      // The grace runs from the carrier's departure, not from when maintenance next notices it.
      if (session && beam.state === 'held' && beam.holder === session.pid && !requests.active(session.pid))
        beamAway = now();
      const boiler = api.boiler();
      if (session && boiler.state === 'held' && boiler.holder === session.pid && !requests.active(session.pid))
        boilerAway = now();
      if (session && !requests.active(session.pid) && api.footHolders().some((h) => h.pid === session.pid))
        footAway.set(session.pid, now());
    },
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
// Railway tunables a room's controller may change; the rest stay classic-only.
const RAIL_TUNE_KEYS = new Set([
  'railRegrowMinutes',
  'railRecoveryMinutes',
  'railFeedMs',
  'railLaySpeed',
  'railDepartureTicks',
  'railBeamSoloSpeed',
  'railBeamHelpSpeed',
  'railJumpImpulse',
  'railJumpTurn',
  'railJumpSteer',
  'railJumpApexSpeed',
  'railBeamGraceS',
  'railGlideSpeed',
  'railGlideSink',
  'railGlideAccel',
  'railGlideBrake',
  'railGlideOver',
  'railGlideTurnTau',
  'railGlideTurnMax',
  'railGlideDeploy',
  'railBoilerSoloSpeed',
  'railBoilerHelpSpeed',
  'railFootSoloSpeed',
  'railFootHelpSpeed',
  'railTrainHeadPct',
  // Slice 5 R3's trade tunables.
  'railFarePct',
  'railRiderPct',
  'railPricePct',
]);
