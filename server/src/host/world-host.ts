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
import { installRailwayRules, installPlayableRailwayRules } from '../../../src/world/rules/railway-index.ts';
import {
  isRailwayRoom,
  isPlayableRailwayRoom,
  RAILWAY_NS,
  RAILWAY_PLAY_NS,
  isLineRailwayRoom,
} from '../../../src/world/railway-namespace.ts';
import { RAILWAY_CATALOG, RAILWAY_T1, RAILWAY_SOURCES } from '../../../src/sim/railway-layout.ts';
import { RAILWAY_DURATION } from '../../../src/sim/railway.ts';
import { railActiveJob, railMaxDuration } from '../../../src/sim/railway-line.ts';
import { LINE1_CATALOG } from '../../../src/sim/railway-line-layout.ts';
import { railGrowthMask, railGrows, railGrowthAllowed, type SupplyPulse } from '../../../src/sim/railway-supply.ts';
import { railNobodyNear, type RailwayPosition } from './railway-supply.ts';
export type { RailwayPosition } from './railway-supply.ts';
import type { RailReach, RailCadence } from '../../../src/world/rules/railway.ts';
import { createRailwayRequests } from './railway-requests.ts';
import { canSet, cleanName } from '../../../src/sim/roster.ts';

const STEP_MS = 50;
// Saves skip a world whose states didn't change, but its tick still moves on, and the helper bank reads the time nobody
// hosted from the saved tick: so the tick is saved at least this often, and always on close.
const TICK_SAVE_MS = 30000;
// Client action clocks (railCadence): a frame of rounding and jitter between two swings, and how far the client's
// clock may run ahead of the server's over a session.
const CADENCE_SLACK_MS = 20;
const CLIENT_AHEAD_MS = 1000;

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
      if (save && sync.worldStatus().badSave) throw new Error(`world ${roomId}: saved state did not load cleanly`);
    },
  };
}
export type WorldHost = ReturnType<typeof createWorldHost>;

/** Owner-reported world pose: only reach plausibility, never server-simulated motion. */
export type RailwayHostOptions = WorldHostOptions & {
  positionOf?: (sid: string) => RailwayPosition | null;
  /** Every connected session, including unknown poses. Unknown blocks maintenance. */
  positions?: () => (RailwayPosition | null)[];
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
  tuneController = () => false,
  positions = () => [null],
  now = Date.now,
  monotonicNow = () => performance.now(),
  log = () => {},
}: RailwayHostOptions) {
  if (!isRailwayRoom(roomId)) throw new Error('railway host requires a T1 namespace');
  const playable = isPlayableRailwayRoom(roomId);
  const line1 = isLineRailwayRoom(roomId);
  const namespace = playable ? RAILWAY_PLAY_NS : RAILWAY_NS;
  // Preserve the existing playtest-only tune policy; ordinary T1 rooms cannot change shared rates.
  const sync = createSync({
    env: { protoRoom: playable && isProtoRoom(roomId.slice(namespace.length + 1)), tuneController },
  });
  const rules = playable
    ? installPlayableRailwayRules(sync, home.land as Parameters<typeof installRailwayRules>[1])
    : installRailwayRules(sync, home.land as Parameters<typeof installRailwayRules>[1]);
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
  // The actor owns their body (docs/plans/replication.md, revision 1): an action that carries its own position
  // (`at`, centimetres) and action time (`ms`, the client's monotonic clock) is judged from those, so a correct
  // prediction is never refused for stale presence or bunched arrival. Without them: fresh presence and arrival time.
  const cadence = new Map<string, number>();
  type ClientClock = { epoch: unknown; first: number; firstAt: number; last: Map<string, number> };
  const clientClocks = new Map<string, ClientClock>();
  const actorAt = (e: { at?: unknown }) => {
    const at = e.at;
    return Array.isArray(at) && at.length === 3 && at.every((v) => Number.isSafeInteger(v)) ? (at as number[]) : null;
  };
  const freshPose = (sid: string) => {
    const p = positionOf(sid);
    return p &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.z) &&
      Number.isFinite(p.at) &&
      now() - p.at <= 2000 &&
      p.at <= now()
      ? p
      : null;
  };
  const railReach: RailReach = (e, x, z, radius) => {
    const at = actorAt(e as { at?: unknown });
    const p = at ? { x: at[0]! / 100, z: at[2]! / 100 } : freshPose(e.p);
    if (!p) return false;
    const dx = p.x * 100 - x,
      dz = p.z * 100 - z;
    return dx * dx + dz * dz <= radius * radius;
  };
  const railCadence: RailCadence = (e) => {
    const swing = ['rail.chop', 'rail.mine', 'rail.beamChop'].includes(e.op);
    const kind = swing ? 'swing' : e.op;
    const ms = swing ? RAILWAY_T1.swingMs : RAILWAY_T1.unloadMs;
    const time = monotonicNow();
    const client = (e as { ms?: unknown }).ms;
    if (typeof client === 'number' && Number.isSafeInteger(client) && client >= 0) {
      const epoch = (e as { epoch?: unknown }).epoch;
      let clock = clientClocks.get(e.u);
      if (!clock || clock.epoch !== epoch || client < clock.first) {
        clock = { epoch, first: client, firstAt: time, last: new Map() };
        clientClocks.set(e.u, clock);
      }
      // A loose sanity bound only: the client's action clock may not run ahead of ours by more than CLIENT_AHEAD_MS.
      if (client - clock.first > time - clock.firstAt + CLIENT_AHEAD_MS) return false;
      if (client - (clock.last.get(kind) ?? -Infinity) < ms - CADENCE_SLACK_MS) return false;
      clock.last.set(kind, client);
      return true;
    }
    const key = `${e.u}:${kind}`;
    if (time - (cadence.get(key) ?? -Infinity) < ms) return false;
    cadence.set(key, time);
    return true;
  };
  const railHeight = (e: { p: string; at?: unknown }, y: number, radius: number) => {
    const at = actorAt(e);
    if (at) return Math.abs(at[1]! - y) <= radius;
    const p = freshPose(e.p);
    return !!p && Number.isFinite(p.y) && Math.abs(p.y! * 100 - y) <= radius;
  };
  const supplySafe = (e: SupplyPulse) => {
    const people = positions();
    const beam = rules.railway.railway.line?.beam;
    return (
      RAILWAY_SOURCES.every((_source, k) => !railGrows(e.grow, k) || railGrowthAllowed(k, line1)) &&
      (e.beam === undefined ||
        (!!beam &&
          beam.state === 'ground' &&
          beam.revision === e.beam &&
          beam.age === 21 &&
          railNobodyNear(people, now(), beam.x, beam.z))) &&
      e.recover.every((id) => {
        const pile = rules.railway.railway.piles.find((p) => p.id === id);
        return !!pile && railNobodyNear(people, now(), pile.x, pile.z);
      })
    );
  };
  sync.setEnv({ railReach, railHeight, railCadence, railSupplySafe: supplySafe });
  let supplyPending = false;
  sync.onApplied((e: Record<string, unknown>) => {
    if (e.op === 'rail.supply') supplyPending = false;
  }, 'railway-supply');
  const maintainSupply = () => {
    if (!playable || !running || closed || sync.worldStatus().recoveryError) return;
    const marker = Math.floor(now() / 60000);
    if (supplyPending || marker < rules.railway.railway.supply!.marker) return;
    const people = positions();
    const recover = rules.railway.railway.piles
      .filter(
        (pile) =>
          (marker > rules.railway.railway.supply!.marker || pile.age === 21) &&
          railNobodyNear(people, now(), pile.x, pile.z),
      )
      .map((pile) => pile.id)
      .sort((a, b) => a - b)
      .slice(0, 1);
    const groundBeam = rules.railway.railway.line?.beam;
    const beam =
      groundBeam?.state === 'ground' &&
      groundBeam.age === 21 &&
      railNobodyNear(people, now(), groundBeam.x, groundBeam.z)
        ? groundBeam.revision
        : undefined;
    if (marker === rules.railway.railway.supply!.marker && !recover.length && beam === undefined) return;
    const grow = railGrowthMask(
      RAILWAY_SOURCES.flatMap((_source, k) =>
        rules.railway.railway.sources[k] === 0 && railGrowthAllowed(k, line1) ? [k] : [],
      ),
    );
    // One pile per bounded stamp: drain eligible piles after each accepted result, without a large recovery tail.
    if (
      sync.submitEdit({ op: 'rail.supply', i: 0, j: 0, marker, grow, recover, ...(beam === undefined ? {} : { beam }) })
    )
      supplyPending = true;
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
          catalog: String(line1 ? LINE1_CATALOG : RAILWAY_CATALOG),
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
  // New material may not inherit an unprocessed absence from the global supply marker.
  // One minute is the deliberately conservative 21/31-minute quantization; marker zero has no elapsed age.
  const supplyCurrent = () =>
    !playable ||
    !rules.railway.railway.supply!.marker ||
    Math.floor(now() / 60000) - rules.railway.railway.supply!.marker <= 1;
  const requests = createRailwayRequests({
    sync,
    api: rules.railway,
    pidOf,
    send,
    available: () => running && !closed && !sync.worldStatus().recoveryError && supplyCurrent(),
  });
  // Session departures are facts from the room manager, not a presence timeout. Keep the epoch until every
  // earlier durable take has applied; a leave between stamp and apply must still release that claim.
  const departed = new Map<string, number>();
  let releasePending = '';
  const releaseDepartedBeam = () => {
    const beam = rules.railway.railway.line?.beam;
    if (!beam || beam.state !== 'held' || closed || sync.worldStatus().recoveryError) return false;
    if ((departed.get(beam.holder) ?? 0) < beam.epoch) return false;
    const key = `${beam.holder}:${beam.epoch}:${beam.revision}`;
    if (releasePending === key) return true;
    if (
      !sync.submitEdit({
        op: 'rail.beamRelease',
        i: 0,
        j: 0,
        pid: beam.holder,
        epoch: beam.epoch,
        revision: beam.revision,
      })
    )
      return false;
    releasePending = key;
    return true;
  };
  sync.onApplied((e: Record<string, unknown>) => {
    if (e.op === 'rail.beamRelease') releasePending = '';
  }, 'railway-departure');
  sync.onAfterTick(() => {
    if (line1) releaseDepartedBeam();
  }, 'railway-departure');
  const ready = (async () => {
    attach();
    await sync.whenDurable();
    // No session survived a server restart. Recover an orphaned unique beam through the same durable op,
    // and apply it before readiness rather than advertising an unavailable old holder to a new visitor.
    const orphan = rules.railway.railway.line?.beam;
    if (orphan?.state === 'held') {
      departed.set(orphan.holder, orphan.epoch);
      if (!releaseDepartedBeam()) throw new Error('railway orphan release refused');
      await sync.whenDurable();
      sync.updateWorld(0.3);
      if (rules.railway.railway.line?.beam.state === 'held') throw new Error('railway orphan release did not apply');
      sync.saveNow(true);
      await sync.whenDurable();
    }
    // Tail replay already advanced ordinary ticks. Catch up only the remaining absent interval, once.
    const marker = Math.floor(now() / 100);
    const absent = Math.max(
      0,
      marker - Math.max(Math.floor(savedAt / 100), rules.railway.railway.resumeMarker) - (sync.world.tick - savedTick),
    );
    const job = railActiveJob(rules.railway.railway);
    if (job.start >= 0 && !job.completion && absent > 0) {
      if (
        !sync.submitEdit({
          op: 'rail.resume',
          i: 0,
          j: 0,
          ticks: Math.min(line1 ? railMaxDuration(rules.railway.railway) : RAILWAY_DURATION, absent),
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
  void ready.catch((e: unknown) => {
    startupError = e instanceof Error ? e.message : String(e);
    log(`world ${roomId}: recovery blocked`, startupError);
  });
  let last = performance.now();
  const timer = tick
    ? setInterval(() => {
        const time = performance.now();
        if (running && !closed) {
          sync.updateWorld(Math.min(time - last, 1000) / 1000);
          maintainSupply();
        }
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
      // The retained base APIs support eager consumers, but no classic material owner may accept edits here.
      // Keep this allow-list bounded: admitting another state also needs a maximum-envelope proof.
      if (playable && message && typeof message === 'object' && (message as Msg).t === 'w:edit') {
        const e = (message as Msg).e;
        if (!running || closed || !e || typeof e !== 'object') return;
        const edit = e as Msg;
        if (edit.op === 'who.set' && canSet(rules.roster.roster, pidOf(from), edit.n, edit.c))
          sync.receiveEdit({ op: 'who.set', i: 0, j: 0, n: recoveryName(edit.n), c: edit.c }, from);
        else if (
          (edit.op === 'tune.set' || edit.op === 'tune.commit') &&
          (edit.key === 'railRegrowMinutes' ||
            edit.key === 'railRecoveryMinutes' ||
            (line1 &&
              [
                'railFeedMs',
                'railLaySpeed',
                'railDepartureTicks',
                'railBeamSoloSpeed',
                'railBeamHelpSpeed',
                'railJumpImpulse',
                'railJumpTurn',
                'railJumpSteer',
                'railJumpApexSpeed',
              ].includes(String(edit.key))))
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
        else
          send({
            t: 'r:state',
            to: from,
            state: startupError || sync.worldStatus().recoveryError ? 'storage' : 'starting',
          });
      } else {
        if (!supplyCurrent()) maintainSupply();
        requests.receive(message, from);
      }
    },
    step(dt: number) {
      if (running && !closed) {
        sync.updateWorld(dt);
        maintainSupply();
      }
    },
    status: () => ({
      tick: sync.world.tick,
      ...sync.worldStatus(),
      recoveryError: startupError ?? sync.worldStatus().recoveryError,
      ready: running && !sync.worldStatus().recoveryError,
    }),
    whenReady: () => ready,
    depart(sid: string) {
      const session = requests.depart(sid);
      if (!line1 || !session) return;
      departed.set(session.pid, Math.max(departed.get(session.pid) ?? 0, session.epoch));
      releaseDepartedBeam();
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
