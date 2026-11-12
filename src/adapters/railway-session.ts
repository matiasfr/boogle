// The railway as a client sees it (docs/plans/replication.md, R1a and R1b): the server's state mirrored through
// replication into worlds the views read through `read` (docs/plans/ecs-migration-railway.md, M12). Actions go up with
// the actor's position and action time. Your own material actions are predicted (R1b): the same rule the server runs
// (railApply, through railPredict) applies to a clone of the confirmed world at once, the views read that predicted
// world, and the action's effect
// plays the moment you press. Each packet drops the actions it settled and replays the rest on the new mirror. When the
// server's answer (`ok`: what each of your accepted actions moved), or a replay on a newer mirror, gives you less than
// you were shown (a refusal, the last log taken by someone else), onCorrected names what went back and to whom, so the
// views can return it physically; when it gives more, the extra plays as another predicted effect. Only a whole, final
// chunk is read for that: a mirror being refilled, or the first chunks of a split send, is not a consistent state.
//
//   adapter.chop/mine/take/rackTake/drop/deposit/...   false when the rule would not accept it now ("not yet"): no
//                                                      request is sent and nothing is shown
//   onAccepted(fn)       effects: your predicted actions at once (predicted: true), everyone else's as the server
//                        confirms them (returned: how many of their pieces a correction already flies to them)
//   onCorrected(fn)      a predicted action gave back `lost` pieces (reason: refused, noop, contested, session)
//   onRemap(fn)          fn(request, id): your drop of that request landed in pile `id`, not the pile it was shown
//                        landing in (a temporary id, or a merge the server made a new pile)
import { SERVER_ID } from '../net/ids.ts';
import { playMark } from '../proto/mark.ts';
import { createRailwayProgressMarks, railwayActionMarks } from './railway-marks.ts';
import {
  implied,
  intentOf,
  NOT_MATERIAL,
  NOT_WHILE_HAULING,
  railwayActs,
  TAKES,
  type RailwayIntent,
} from './railway-intents.ts';
import {
  accepted,
  effectOf,
  holds,
  sameTarget,
  type RailwayAccepted,
  type RailwayCorrection,
} from './railway-effects.ts';
import { railInt, RAILWAY_MAX_INT, RAILWAY_WINDOW, type RailAction } from '../sim/railway.ts';
import { account as accountRow, beam as beamRow, boiler as boilerRow } from '../sim/railway-rows.ts';
import { cloneWorld } from '../sim/railway-queries.ts';
import type { World } from '../ecs/index.ts';
import { RULE_STEPS } from '../world/room-clock.ts';
import { createRailwayClock, RAIL_CLOCK_EVERY_MS, RAIL_CLOCK_TIMEOUT_MS } from '../world/railway-clock.ts';
import type { RailwayMirror } from '../world/railway-replicate.ts';
import { createPredictor } from '../world/replicate-client.ts';
import {
  RAIL_CADENCE_SLACK_MS,
  RAIL_PREDICTED,
  railCadence,
  railParseTempPile,
  railPredict,
  type RailEffect,
  type RailPrediction,
} from '../world/railway-predict.ts';
import type { ServerPacket } from '../world/replicate.ts';
import type { WorldRoom } from '../world/sync.ts';
import { createRailwayRead, type RailwayMovement, type RailwayStatus } from './railway-read.ts';

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
// Metres to whole centimetres; `|| 0` turns -0 (which railInt refuses) into 0.
const cm = (m: number) => Math.round(m * 100) || 0;

/** Corrections kept for measurement. */
const LOG_MAX = 256;

type Act = { intent: RailwayIntent; tick: number; predict: boolean };
type Shown = { event: RailwayAccepted; n: number };

export type ActorPose = () => { x: number; y: number; z: number } | null;
export function createRailwayAdapter({
  mirror: rail,
  movement,
  movementRev,
  pid,
  pose = () => null,
  now = () => performance.now(),
}: {
  mirror: RailwayMirror;
  movement: () => RailwayMovement;
  /** A number that changes whenever `movement()`'s values may have (the tune state's `rev`, bumped by every edit and
   * load), so a read checks it instead of reading the 18 tunables. Absent (tests, tools), they are read and compared. */
  movementRev?: () => number;
  pid: string;
  /** The local body's position in metres, sent with each action. */
  pose?: ActorPose;
  /** The client's monotonic clock in ms: action times, the server step estimate and the stall cue. */
  now?: () => number;
}) {
  const confirmed = () => rail.confirmed();
  const progressMarks = createRailwayProgressMarks();
  const effects = new Set<(event: RailwayAccepted) => void>();
  const corrections = new Set<(c: RailwayCorrection) => void>();
  const remaps = new Set<(request: number, id: number) => void>();
  const resets = new Set<(soft: boolean) => void>();
  let room: WorldRoom | null = null;
  let offRoom: (() => void)[] = [];
  let connected = false;
  let disposed = false;
  let synced = false;
  let epoch = 0;
  let next = 1;
  // storage: the room lost its storage; full: the server has no session for this player (the account cap). Both stop.
  let status = 'connecting' as RailwayStatus;
  let clock = 0;
  let probeAt = -Infinity;
  let resyncAt = -Infinity;
  const stopped = () => status === 'storage' || status === 'full';
  // The estimated server tick, never going backwards (a late stamp can re-anchor the estimate a little lower). It
  // follows the server's step as of one one-way delay ago, so an action predicted at it reaches the server at the
  // same tick or later: a tick-gated rule (the wake's readiness) the prediction accepts, the server accepts too.
  let shownTick = 0;
  const tick = () => {
    const step = rail.mirror.step(now(), frozen !== null && !connected);
    if (step >= 0) shownTick = Math.max(shownTick, Math.floor(step / RULE_STEPS));
    return shownTick;
  };
  // All replicated movers use one RTT-compensated room time. The conservative tick above remains for actions.
  const moverClock = createRailwayClock();
  let clockSent: number | null = null;
  let clockProbeAt = -Infinity;
  const tickNow = () => {
    const at = now();
    return Math.max(0, moverClock.now(at, rail.mirror.step(at, frozen !== null && !connected)) / RULE_STEPS);
  };
  function probeClock() {
    const at = now();
    if (!connected || !room || !epoch || stopped() || at - clockProbeAt < RAIL_CLOCK_EVERY_MS) return;
    if (clockSent !== null && at - clockSent < RAIL_CLOCK_TIMEOUT_MS) return;
    clockSent = Math.max(0, Math.round(at));
    clockProbeAt = at;
    room.send({ t: 'r:clock', at: clockSent });
  }

  // ---------------------------------------------------------------- prediction (the pending list)
  const results = new Map<number, RailPrediction>(); // request -> its result in the last rebuild
  const shown = new Map<number, Shown>(); // request -> the effect shown for it, while unsettled
  const cadenceAt = new Map<string, number>(); // cadence kind -> the action clock (ms) of the last one sent
  const stats = {
    predicted: 0,
    confirmed: 0,
    corrected: 0,
    lost: 0,
    contested: 0,
    notYet: 0,
    unpredicted: 0,
    /** ms from a press to its predicted effect having played (the input-to-response cost in the adapter). */
    responseMs: [] as number[],
    log: [] as { request: number; op: string; lost: number; reason: string; winner?: string }[],
  };
  // The predicted state is a copy-on-write clone of the confirmed world: only the tables a prediction writes are copied.
  const predictor = createPredictor<World, Act>({
    confirmed,
    clone: (x) => {
      results.clear();
      return cloneWorld(x);
    },
    apply: (x, a, [e, r]) => {
      if (a.predict) results.set(r, railPredict(x, pid, { ...a.intent, epoch: e, request: r } as RailAction, a.tick));
    },
    window: RAILWAY_WINDOW,
  });
  /** What the views read: the mirror, with your pending actions applied. */
  // While a whole state comes again (a lost connection, a resync), what was last shown stays shown, its timed jobs still
  // advancing: no blink, no snap. The new state replaces it at its last chunk, and the views ease to it.
  let frozen: World | null = null;
  const view = (): World => frozen ?? (predictor.pending().length ? predictor.state() : confirmed());
  function refill() {
    if (synced) frozen ??= view();
    rail.refill();
    synced = false;
  }

  const available = () =>
    !disposed &&
    connected &&
    synced &&
    epoch > 0 &&
    accountRow(confirmed(), pid)?.epoch === epoch &&
    !stopped() &&
    predictor.pending().length < RAILWAY_WINDOW;

  function correct(list: RailwayCorrection[]) {
    for (const c of list) {
      stats.corrected++;
      stats.lost += c.lost;
      if (c.reason === 'contested') stats.contested++;
      stats.log.push({
        request: c.event.request,
        op: c.event.op,
        lost: c.lost,
        reason: c.reason,
        ...(c.winner ? { winner: c.winner } : {}),
      });
      if (stats.log.length > LOG_MAX) stats.log.shift();
      for (const fn of corrections) fn(c);
    }
  }
  // The session is gone (a refusal that is not about the action itself, a takeover, a reconnect): its unconfirmed
  // actions are the server's to settle, and a new epoch starts. When the server certainly never applied them (it said
  // so: from request `from` on), what they showed goes back; a lost socket instead rebuilds every view from the whole
  // state. Earlier actions keep what they showed: the server may have applied them, and the mirror shows if it did.
  function lose(from: number | null) {
    const back: RailwayCorrection[] = [];
    if (from !== null && synced)
      for (const [r, { event, n }] of shown)
        if (r >= from && n > 0) back.push({ event, kept: 0, lost: n, reason: 'session' });
    shown.clear();
    epoch = 0;
    predictor.session(0, 1);
    probeAt = -Infinity;
    if (!stopped()) status = connected ? 'starting' : 'connecting';
    correct(back);
  }
  function probe() {
    if (!connected || !room || epoch || stopped() || clock - probeAt < 500) return;
    probeAt = clock;
    room.send({ t: 'r:open' });
  }

  function settle(p: ServerPacket) {
    const rebuilt = !synced && rail.synced();
    if (rebuilt) synced = true;
    // This packet is read against the session it was sent for, even if a refusal below ends that session.
    const ep = epoch;
    // Only a whole mirror at the last chunk of a send is a consistent state to replay on: the first chunks of a split
    // send (a big catch-up after a hidden tab) or of a refill after a resync would show every pending action losing.
    const consistent = rail.synced() && !p.m;
    // A drop of yours that landed in another pile than it was shown in (a temporary id, or a merge the server made a
    // new pile): its pieces still in flight follow it, before anything draws them.
    if (!rebuilt)
      for (const [temp, id] of p.ids ?? []) {
        const t = railParseTempPile(temp);
        const shownIn = t && t[0] === ep ? shown.get(t[1])?.event.pile : undefined;
        if (t && typeof id === 'number' && shownIn !== undefined && shownIn !== id)
          for (const fn of remaps) fn(t[1], id);
      }
    const tick = Math.floor(p.tk / RULE_STEPS);
    // Read only accepted packets, before confirm removes the pending intents. Never use the predicted view here.
    const pending = new Map(predictor.pending().map((q) => [q.id[1], q.action.intent]));
    for (const [e, r, n] of p.ok ?? []) {
      const intent = e === ep ? pending.get(r) : undefined;
      if (intent) for (const [name, data] of railwayActionMarks(intent, n, true)) playMark(name, data);
    }
    for (const [e, r, reason] of p.rej ?? []) {
      const intent = e === ep ? pending.get(r) : undefined;
      if (intent) playMark('railway refused', { op: intent.op, reason, authority: 'server' });
    }
    if (consistent) for (const [name, data] of progressMarks(confirmed(), rebuilt)) playMark(name, data);
    const events: RailwayAccepted[] = [];
    for (const raw of p.ev ?? []) {
      const full = implied(raw);
      const intent = intentOf(full);
      if (!intent || !accepted(full)) continue;
      // Predicted local actions arrive in ok, other actions arrive as events.
      if (full.pid !== pid || !p.ok?.some(([e, r]) => e === ep && r === full.request))
        for (const [name, data] of railwayActionMarks(intent, full.accepted as number, full.pid === pid))
          playMark(name, data);
      events.push({
        ...intent,
        pid: full.pid as string,
        request: full.request as number,
        accepted: full.accepted as number,
        status: 'accepted' as const,
        tick,
        ...effectOf(full),
      });
    }
    // The server sends you no event for an action you predicted; any event of yours is one you did not predict.
    const mine = (e: RailwayAccepted) => e.pid === pid;
    // What each of your accepted actions moved, as the server recorded it.
    const moved = new Map<number, number>();
    for (const [e, r, n] of p.ok ?? []) if (e === ep) moved.set(r, n);
    // What this packet settled: refusals by reason, then everything up to the ack.
    const settled = new Map<number, RailwayCorrection['reason']>();
    let sessionLost: number | null = null; // the first request a session or order refusal named
    for (const [e, r, reason] of p.rej ?? []) {
      if (e !== ep) continue;
      settled.set(r, 'refused');
      predictor.reject([e, r]);
      if (reason !== 'refused') sessionLost = Math.min(sessionLost ?? r, r);
    }
    if (p.ack && p.ack[0] === ep)
      for (const q of predictor.pending())
        if (q.id[1] <= p.ack[1] && !settled.has(q.id[1])) settled.set(q.id[1], 'noop');
    if (p.ack) predictor.confirm(p.ack);
    predictor.invalidate();
    const back: RailwayCorrection[] = [];
    const more: RailwayAccepted[] = [];
    // A shared flag someone else set (the machine woken, the lever pulled) stands: no return, and their event replays
    // nothing over the animation you already started.
    const standing = new Set<string>();
    const differ = (was: Shown, kept: number, reason: RailwayCorrection['reason'], effect?: RailEffect | null) => {
      if (kept > was.n) more.push(Object.freeze({ ...was.event, ...(effect ?? {}), accepted: kept - was.n }));
      else if (kept < was.n && holds(confirmed(), was.event.op, was.event)) standing.add(was.event.op);
      else if (kept < was.n) back.push({ event: was.event, kept, lost: was.n - kept, reason });
    };
    for (const [r, reason] of settled) {
      const was = shown.get(r);
      if (!was) continue;
      shown.delete(r);
      const kept = reason === 'refused' ? 0 : (moved.get(r) ?? 0);
      if (kept === was.n) stats.confirmed++;
      differ(was, kept, kept > 0 ? 'contested' : reason);
    }
    if (sessionLost !== null) lose(sessionLost);
    // Replay what is still pending on the new mirror: an action that now moves less (someone took part of the pile
    // first) gives the difference back now rather than at its ack; one that now moves more plays the extra.
    if (consistent && shown.size && predictor.pending().length) {
      predictor.state();
      for (const [r, was] of shown) {
        const now = results.get(r);
        const n = now?.n ?? 0;
        if (n === was.n) continue;
        differ(was, n, 'contested', now?.effect);
        was.n = n;
      }
    }
    if (rebuilt) {
      // The packet that completes a whole state already shows what its events did: views rebuild from it (softly,
      // after a refill: no snap), and playing its events or corrections would replay effects.
      const soft = frozen !== null;
      frozen = null;
      predictor.invalidate();
      for (const fn of resets) fn(soft);
      if (available()) status = 'ready';
      return;
    }
    if (available()) status = 'ready';
    // A piece you were shown but did not get flies to whoever did get it, when their action is in this packet.
    const returned = new Map<RailwayAccepted, number>();
    const matched = back.map((c) => {
      if (!TAKES.has(c.event.op)) return c;
      const winner = events.find((e) => !mine(e) && sameTarget(c.event, e) && (returned.get(e) ?? 0) < e.accepted);
      if (!winner) return c;
      returned.set(winner, Math.min(winner.accepted, (returned.get(winner) ?? 0) + c.lost));
      return { ...c, winner: winner.pid };
    });
    correct(matched);
    for (const e of more) for (const fn of effects) fn(e);
    for (const e of events) {
      if (!mine(e) && standing.has(e.op)) continue;
      if (mine(e)) stats.unpredicted++;
      const event: RailwayAccepted = Object.freeze(returned.has(e) ? { ...e, returned: returned.get(e)! } : e);
      for (const fn of effects) fn(event);
    }
  }
  rail.mirror.onPacket((p) => {
    if (!disposed) settle(p);
  });
  // A mirror that differs from the server (a refused packet, a hash mismatch) is refilled whole, shown as it was until
  // then; the server keeps this client's ack, so its pending actions still settle. At most one request a second.
  rail.mirror.onDiverged((why) => {
    if (disposed || !room || clock - resyncAt < 1000) return;
    resyncAt = clock;
    console.warn(`[railway] mirror diverged (${why}): asking for the whole state`);
    refill();
    room.send({ t: 'r:resync' });
  });
  function hear(message: unknown, from: string) {
    if (disposed || from !== SERVER_ID || !object(message)) return;
    if (message.t === 'r:clock') {
      if (message.to === room?.selfId && clockSent !== null && message.at === clockSent && railInt(message.step)) {
        moverClock.hear(message.step, clockSent, now());
        clockSent = null;
      }
      return;
    }
    if (message.t === 's') {
      rail.mirror.apply(message, now());
      return;
    }
    // Room status, sent at once (the room clock is held while it starts or after its storage failed): the action it
    // names was not applied.
    if (message.t === 'r:state' && message.to === room?.selfId) {
      if (message.state === 'storage' || message.state === 'full') status = message.state;
      // The action it names and every later one were not applied; earlier ones are settled by the mirror.
      lose(railInt(message.request, RAILWAY_MAX_INT, 1) && message.epoch === epoch ? message.request : next);
      return;
    }
    // The room's lockstep clock stamps (w:c and friends, every 200 ms) keep the step estimate fresh between packets.
    if (typeof message.t === 'string' && message.t.startsWith('w:') && Number.isSafeInteger(message.ht))
      rail.mirror.stamp((message.ht as number) * RULE_STEPS, now());
    if (
      message.t === 'r:session' &&
      message.to === room?.selfId &&
      railInt(message.epoch, RAILWAY_MAX_INT, 1) &&
      railInt(message.next, RAILWAY_MAX_INT, 1)
    ) {
      if (message.epoch < epoch) return;
      next = message.epoch === epoch ? Math.max(next, message.next) : message.next;
      if (message.epoch !== epoch) shown.clear();
      epoch = message.epoch;
      predictor.session(epoch, next);
      if (!stopped()) status = 'starting';
      if (available()) status = 'ready';
    }
  }

  function submit(intent: RailwayIntent): boolean {
    const pressed = now();
    if (!available() || !room || next >= RAILWAY_MAX_INT) return false;
    const v = view();
    const account = accountRow(v, pid);
    const beam = beamRow(v);
    if (beam.state === 'held' && beam.holder === pid && !NOT_MATERIAL.has(intent.op)) return false;
    const boiler = boilerRow(v);
    if (
      boiler.state === 'held' &&
      boiler.holder === pid &&
      (!NOT_MATERIAL.has(intent.op) || NOT_WHILE_HAULING.has(intent.op))
    )
      return false;
    // A footing fills your back: only setting it or putting it down moves anything.
    const foot = account?.foot ?? 0;
    if (
      foot &&
      !NOT_MATERIAL.has(intent.op) &&
      intent.op !== 'rail.footSet' &&
      !(intent.op === 'rail.drop' && intent.kind === 3)
    )
      return false;
    if (
      (intent.op === 'rail.beamTake' || intent.op === 'rail.boilerTake') &&
      ((account ? account.carry + account.stone + account.rails : 0) || foot || predictor.pending().length)
    )
      return false;
    const t = tick();
    const predict = RAIL_PREDICTED.has(intent.op);
    const sent: RailwayIntent = intent.op === 'rail.wake' ? { ...intent, tk: t } : intent;
    const ms = Math.max(0, Math.round(pressed));
    // The server's swing/unload cadence on this client's own clock, predicted exactly: too soon is "not yet".
    const cadence = railCadence(intent.op);
    if (predict && ms - (cadenceAt.get(cadence.kind) ?? -Infinity) < cadence.ms - RAIL_CADENCE_SLACK_MS) {
      stats.notYet++;
      return false;
    }
    const id = predictor.act({ intent: sent, tick: t, predict }, pressed);
    if (!id) return false;
    const [e, request] = id;
    // The rule decides on the predicted state: what it would not accept now is not sent ("not yet").
    const r = predict ? (predictor.state(), results.get(request)) : undefined;
    if (predict && !(r && r.n > 0)) {
      predictor.withdraw(id);
      stats.notYet++;
      playMark('railway refused', { op: intent.op, reason: 'not yet', authority: 'local' });
      return false;
    }
    next = request + 1;
    cadenceAt.set(cadence.kind, ms);
    const body = pose();
    const at =
      body && Number.isFinite(body.x) && Number.isFinite(body.y) && Number.isFinite(body.z)
        ? ([cm(body.x), cm(body.y), cm(body.z)] as [number, number, number])
        : undefined;
    room.send({ t: 'r:edit', e: { ...sent, epoch: e, request, ms, ...(at ? { at } : {}) } });
    if (!r) return true;
    const event: RailwayAccepted = Object.freeze({
      ...sent,
      pid,
      epoch: e,
      request,
      accepted: r.n,
      status: 'accepted' as const,
      tick: t,
      ...(r.effect ?? {}),
      predicted: true,
    });
    shown.set(request, { event, n: r.n });
    stats.predicted++;
    for (const fn of effects) fn(event);
    stats.responseMs.push(now() - pressed);
    if (stats.responseMs.length > LOG_MAX) stats.responseMs.shift();
    return true;
  }

  // ---------------------------------------------------------------- reads
  const { read, nextFrame, latch } = createRailwayRead({
    view,
    tick,
    tickNow,
    available,
    pid,
    status: () => status,
    pending: () => predictor.pending(),
    stalled: (at) => predictor.stalled(at),
    now,
    movement,
    movementRev,
    debug: () => ({
      connected,
      synced,
      step: rail.step(),
      get hash() {
        return rail.hash();
      },
      epoch,
      next,
      // A copy: a tool that writes to it or holds it across frames never touches the session's own counters.
      prediction: {
        ...stats,
        responseMs: [...stats.responseMs],
        log: stats.log.map((l) => ({ ...l })),
      },
    }),
  });
  return {
    read,
    attach(nextRoom: WorldRoom) {
      if (disposed || room === nextRoom) return;
      for (const off of offRoom) off();
      // A new room (a new socket) sends the whole state again.
      if (room) refill();
      room = nextRoom;
      connected = true;
      lose(null);
      offRoom = [
        room.onMessage(hear),
        room.onConnection((live) => {
          connected = live;
          moverClock.reset();
          clockSent = null;
          clockProbeAt = -Infinity;
          if (!live) {
            // The server re-sends everything whole when the socket comes back: keep showing this until it has.
            refill();
            lose(null);
          } else lose(null);
        }),
      ];
      probe();
    },
    update(nowMs: number) {
      if (disposed) return;
      clock = nowMs;
      nextFrame();
      probe();
      probeClock();
      latch();
    },
    ...railwayActs(submit, view),
    onAccepted(fn: (event: RailwayAccepted) => void) {
      effects.add(fn);
      return () => effects.delete(fn);
    },
    onCorrected(fn: (c: RailwayCorrection) => void) {
      corrections.add(fn);
      return () => corrections.delete(fn);
    },
    onRemap(fn: (request: number, id: number) => void) {
      remaps.add(fn);
      return () => remaps.delete(fn);
    },
    /** fn(soft): the whole state arrived; soft after a refill (views ease to it rather than rebuild and snap). */
    onReset(fn: (soft: boolean) => void) {
      resets.add(fn);
      return () => resets.delete(fn);
    },
    dispose() {
      disposed = true;
      for (const off of offRoom) off();
      offRoom = [];
      shown.clear();
      predictor.session(0, 1);
      effects.clear();
      corrections.clear();
      remaps.clear();
      resets.clear();
      room = null;
    },
  };
}
export type RailwayAdapter = ReturnType<typeof createRailwayAdapter>;
