// The railway as a client sees it (docs/plans/replication.md, R1a and R1b): the server's state mirrored through
// replication, read as today's `Railway` so the views keep their shape. Actions go up with the actor's position and
// action time. Your own material actions are predicted (R1b): the same rule the server runs (railApply, through
// railPredict) applies to a copy of the mirror at once, the views read that predicted state, and the action's effect
// plays the moment you press. Each packet drops the actions it settled and replays the rest on the new mirror. When the
// server's answer, or a replay on a newer mirror, gives you less than you were shown (a refusal, the last log taken by
// someone else), onCorrected names what went back and to whom, so the views can return it physically.
//
//   adapter.chop/mine/take/rackTake/drop/deposit/...   false when the rule would not accept it now ("not yet"): no
//                                                      request is sent and nothing is shown
//   onAccepted(fn)       effects: your predicted actions at once (predicted: true), everyone else's as the server
//                        confirms them (returned: how many of their pieces a correction already flies to them)
//   onCorrected(fn)      a predicted action gave back `lost` pieces (reason: refused, noop, contested, session)
//   onRemap(fn)          fn(tempId, id): a pile you dropped got its server id (the replicator's `ids`)
import { SERVER_ID } from '../net/ids.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 } from '../sim/railway-layout.ts';
import {
  railInt,
  railYaw,
  railJobs,
  railActiveStation,
  railCarry,
  railAccount,
  railCounts,
  railPhase,
  railPanelCount,
  railPanelStock,
  RAILWAY_MAX_INT,
  RAILWAY_WINDOW,
  type RailAction,
  type Railway,
} from '../sim/railway.ts';
import {
  LINE1_STATIONS,
  LINE1_ROCKS,
  LINE1_HARDWOODS,
  type RailMaterial,
  type LineStationId,
} from '../sim/railway-line-layout.ts';
import { LINE_TIMING } from '../sim/railway-line.ts';
import { LINE2_STATIONS, line2Routes, type Line2StationId } from '../sim/railway-line2-layout.ts';
import { line2Active, line2Completed, line2GateOpen } from '../sim/railway-line2.ts';
import { RULE_STEPS } from '../world/room-clock.ts';
import type { RailwayMirror } from '../world/railway-replicate.ts';
import { createPredictor } from '../world/replicate-client.ts';
import {
  RAIL_CADENCE_SLACK_MS,
  RAIL_PREDICTED,
  cloneRailway,
  railCadence,
  railParseTempPile,
  railPredict,
  type RailPrediction,
} from '../world/railway-predict.ts';
import type { ServerPacket } from '../world/replicate.ts';
import type { WorldRoom } from '../world/sync.ts';
import type { TuneApi } from '../world/rules/tune.ts';

export type RailwayIntent =
  | { op: 'rail.wake'; tk?: number }
  | { op: 'rail.chop'; id: number; yaw?: number; collapsed?: boolean }
  | { op: 'rail.mine'; id: number }
  | { op: 'rail.axe' | 'rail.beamChop' | 'rail.jump' }
  | { op: 'rail.forgeTake' | 'rail.depotTake' | 'rail.lever' | 'rail.hook' }
  | { op: 'rail.beamTake'; revision: number }
  | { op: 'rail.beamDrop'; revision: number; x: number; y: number; z: number }
  | { op: 'rail.beamDeposit'; revision: number; station: 'T3' }
  | { op: 'rail.take'; id: number; kind?: RailMaterial | 2 }
  | { op: 'rail.rackTake'; kind?: RailMaterial }
  | { op: 'rail.deposit'; station: LineStationId | Line2StationId | 'F'; n: number; kind?: RailMaterial | 2 }
  | { op: 'rail.drop'; x: number; y?: number; z: number; n: number; kind?: RailMaterial | 2 };
export type RailwayAccepted = Readonly<
  RailwayIntent & {
    pid: string;
    epoch: number;
    request: number;
    accepted: number;
    status: 'accepted';
    tick: number;
    /** Right after this action: the actor's balance of the moved kind, the target's count, and the pile involved
     * (with its position, for a take whose pile may be gone by the packet's end). */
    carried?: number;
    level?: number;
    pile?: number;
    px?: number;
    py?: number;
    pz?: number;
    /** Your own action, shown at once from the prediction (the server's confirmation of it plays nothing). */
    predicted?: boolean;
    /** Of `accepted`, the pieces a correction in the same packet already flies to this actor from someone's back. */
    returned?: number;
  }
>;
/** A predicted action that turned out to give less than it showed. `event` is what was shown. */
export type RailwayCorrection = Readonly<{
  event: RailwayAccepted;
  /** What the action really moved (or, still pending, now moves on the newer mirror). */
  kept: number;
  /** Pieces to return: shown minus kept. */
  lost: number;
  reason: 'refused' | 'noop' | 'contested' | 'session';
  /** Who got them instead, when their accepted action arrived in the same packet. */
  winner?: string;
}>;
/** Movement tunables the views read; tune stays lockstep, so a tab reads its own copy. */
export const railMovement = (tune: Pick<TuneApi, 'get'>) => ({
  beamSoloSpeed: tune.get('railBeamSoloSpeed') / 100,
  beamHelpSpeed: tune.get('railBeamHelpSpeed') / 100,
  jumpImpulse: tune.get('railJumpImpulse') / 100,
  jumpTurn: tune.get('railJumpTurn') / 100,
  jumpSteer: tune.get('railJumpSteer') / 100,
  jumpApexSpeed: tune.get('railJumpApexSpeed') / 100,
});
export type RailwayMovement = {
  beamSoloSpeed: number;
  beamHelpSpeed: number;
  jumpImpulse: number;
  jumpTurn: number;
  jumpSteer: number;
  jumpApexSpeed: number;
};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
// Metres to whole centimetres; `|| 0` turns -0 (which railInt refuses) into 0.
const cm = (m: number) => Math.round(m * 100) || 0;
function intentOf(e: Record<string, unknown>): RailwayIntent | null {
  if (e.op === 'rail.wake') return { op: e.op };
  const kind = e.kind === 1 ? 1 : e.kind === 2 ? 2 : 0;
  if (
    e.op === 'rail.axe' ||
    e.op === 'rail.beamChop' ||
    e.op === 'rail.jump' ||
    e.op === 'rail.forgeTake' ||
    e.op === 'rail.depotTake' ||
    e.op === 'rail.lever' ||
    e.op === 'rail.hook'
  )
    return { op: e.op };
  if (e.op === 'rail.mine' && railInt(e.id, 2)) return { op: e.op, id: e.id };
  if (e.op === 'rail.beamTake' && railInt(e.revision)) return { op: e.op, revision: e.revision };
  if (e.op === 'rail.beamDeposit' && railInt(e.revision) && e.station === 'T3')
    return { op: e.op, revision: e.revision, station: 'T3' };
  if (
    e.op === 'rail.beamDrop' &&
    railInt(e.revision) &&
    railInt(e.x, 200000, -200000) &&
    railInt(e.y, 200000, -200000) &&
    railInt(e.z, 200000, -200000)
  )
    return { op: e.op, revision: e.revision, x: e.x, y: e.y, z: e.z };
  if (e.op === 'rail.rackTake') return { op: e.op, kind: kind === 1 ? 1 : 0 };
  if (e.op === 'rail.take' && railInt(e.id)) return { op: e.op, id: e.id, kind };
  if (e.op === 'rail.chop' && railInt(e.id))
    return {
      op: e.op,
      id: e.id,
      ...(railYaw(e.yaw) && typeof e.collapsed === 'boolean' ? { yaw: e.yaw, collapsed: e.collapsed } : {}),
    };
  if (
    e.op === 'rail.deposit' &&
    (e.station === 'T1' ||
      e.station === 'T2' ||
      e.station === 'T3' ||
      e.station === 'F' ||
      e.station === 'Q1' ||
      e.station === 'Q2' ||
      e.station === 'Q3') &&
    railInt(e.n, RAILWAY_T1.carry, 1)
  )
    return { op: e.op, station: e.station, n: e.n, kind };
  if (
    e.op === 'rail.drop' &&
    railInt(e.n, RAILWAY_T1.carry, 1) &&
    railInt(e.x, 200000, -200000) &&
    railInt(e.z, 200000, -200000)
  )
    return { op: e.op, x: e.x, z: e.z, n: e.n, kind, ...(railInt(e.y, 200000, -200000) ? { y: e.y } : {}) };
  return null;
}

/** What an event's own action left behind (src/world/railway-predict.ts RailEffect): several events can share one
 * packet, so effects read these rather than the packet's final state. */
const effectOf = (v: Record<string, unknown>) => {
  const out: { carried?: number; level?: number; pile?: number; px?: number; py?: number; pz?: number } = {};
  if (railInt(v.carried, RAILWAY_T1.carry)) out.carried = v.carried;
  if (railInt(v.level, RAILWAY_MAX_INT)) out.level = v.level;
  if (railInt(v.pile, RAILWAY_MAX_INT, 1)) out.pile = v.pile;
  for (const k of ['px', 'py', 'pz'] as const) if (railInt(v[k], 200000, -200000)) out[k] = v[k];
  return out;
};
const accepted = (v: Record<string, unknown>) =>
  typeof v.pid === 'string' &&
  railInt(v.epoch, RAILWAY_MAX_INT, 1) &&
  railInt(v.request, RAILWAY_MAX_INT, 1) &&
  railInt(v.accepted, RAILWAY_T1.carry, 1) &&
  railInt(v.tick);
/** Two actions competed for the same pieces: the same tree, rock, pile or rack. */
function sameTarget(a: RailwayAccepted, b: RailwayAccepted) {
  if (a.op !== b.op) return false;
  if (a.op === 'rail.chop' || a.op === 'rail.mine') return a.id === (b as typeof a).id;
  if (a.op === 'rail.take') return a.pile === b.pile || a.id === (b as typeof a).id;
  if (a.op === 'rail.rackTake') return (a.kind ?? 0) === ((b as typeof a).kind ?? 0);
  return a.op === 'rail.forgeTake' || a.op === 'rail.depotTake';
}
/** Pieces flowing to the actor (a correction can return them to whoever got them instead). */
const TAKES: ReadonlySet<string> = new Set([
  'rail.chop',
  'rail.mine',
  'rail.take',
  'rail.rackTake',
  'rail.forgeTake',
  'rail.depotTake',
]);
/** The ops that never move material, so a held beam does not block them. */
const NOT_MATERIAL: ReadonlySet<string> = new Set([
  'rail.wake',
  'rail.axe',
  'rail.jump',
  'rail.lever',
  'rail.hook',
  'rail.beamChop',
  'rail.beamTake',
  'rail.beamDrop',
  'rail.beamDeposit',
]);
/** Corrections kept for measurement. */
const LOG_MAX = 256;

type Act = { intent: RailwayIntent; tick: number; predict: boolean };
type Shown = { event: RailwayAccepted; n: number };

export type ActorPose = () => { x: number; y: number; z: number } | null;
export function createRailwayAdapter({
  mirror: rail,
  movement,
  pid,
  pose = () => null,
  now = () => performance.now(),
}: {
  mirror: RailwayMirror;
  movement: () => RailwayMovement;
  pid: string;
  /** The local body's position in metres, sent with each action. */
  pose?: ActorPose;
  /** The client's monotonic clock in ms: action times, the server step estimate and the stall cue. */
  now?: () => number;
}) {
  const confirmed = rail.railway;
  const effects = new Set<(event: RailwayAccepted) => void>();
  const corrections = new Set<(c: RailwayCorrection) => void>();
  const remaps = new Set<(temp: number, id: number) => void>();
  const resets = new Set<() => void>();
  let room: WorldRoom | null = null;
  let offRoom: (() => void)[] = [];
  let connected = false;
  let disposed = false;
  let synced = false;
  let epoch = 0;
  let next = 1;
  // storage: the room lost its storage; full: the server has no session for this player (the account cap). Both stop.
  let status: 'connecting' | 'starting' | 'ready' | 'storage' | 'full' = 'connecting';
  let clock = 0;
  let probeAt = -Infinity;
  let resyncAt = -Infinity;
  const stopped = () => status === 'storage' || status === 'full';
  const resetView = () => {
    for (const fn of resets) fn();
  };
  // The estimated server tick, never going backwards (a late stamp can re-anchor the estimate a little lower). It
  // follows the server's step as of one one-way delay ago, so an action predicted at it reaches the server at the
  // same tick or later: a tick-gated rule (the wake's readiness) the prediction accepts, the server accepts too.
  let shownTick = 0;
  const tick = () => {
    const step = rail.mirror.step(now());
    if (step >= 0) shownTick = Math.max(shownTick, Math.floor(step / RULE_STEPS));
    return shownTick;
  };

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
  const predictor = createPredictor<Railway, Act>({
    confirmed: () => confirmed,
    clone: (x) => {
      results.clear();
      return cloneRailway(x);
    },
    apply: (x, a, [e, r]) => {
      if (a.predict) results.set(r, railPredict(x, pid, { ...a.intent, epoch: e, request: r } as RailAction, a.tick));
    },
    window: RAILWAY_WINDOW,
  });
  /** What the views read: the mirror, with your pending actions applied. */
  const view = () => (predictor.pending().length ? predictor.state() : confirmed);

  const available = () =>
    !disposed &&
    connected &&
    synced &&
    epoch > 0 &&
    railAccount(confirmed, pid)?.epoch === epoch &&
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
    // Server ids for the piles your drops created, before anything draws them.
    if (!rebuilt)
      for (const [temp, id] of p.ids ?? []) {
        const t = railParseTempPile(temp);
        if (t && t[0] === ep && typeof id === 'number') for (const fn of remaps) fn(-t[1], id);
      }
    const events: RailwayAccepted[] = [];
    for (const raw of p.ev ?? []) {
      const intent = intentOf(raw);
      if (!intent || !accepted(raw)) continue;
      events.push({
        ...intent,
        pid: raw.pid as string,
        epoch: raw.epoch as number,
        request: raw.request as number,
        accepted: raw.accepted as number,
        status: 'accepted' as const,
        tick: raw.tick as number,
        ...effectOf(raw),
      });
    }
    const mine = (e: RailwayAccepted) => e.pid === pid && e.epoch === ep;
    const own = new Map(events.filter(mine).map((e) => [e.request, e]));
    // What this packet settled: refusals by reason, then everything up to the ack.
    const settled = new Map<number, RailwayCorrection['reason']>();
    let sessionLost: number | null = null; // the first request a session or order refusal named
    for (const [e, r, reason] of p.rej ?? []) {
      if (e !== ep) continue;
      settled.set(r, 'refused');
      predictor.reject([e, r], reason);
      if (reason !== 'refused') sessionLost = Math.min(sessionLost ?? r, r);
    }
    if (p.ack && p.ack[0] === ep)
      for (const q of predictor.pending())
        if (q.id[1] <= p.ack[1] && !settled.has(q.id[1])) settled.set(q.id[1], 'noop');
    if (p.ack) predictor.confirm(p.ack);
    predictor.invalidate();
    const back: RailwayCorrection[] = [];
    const shownSettled = new Set<number>();
    for (const [r, reason] of settled) {
      const was = shown.get(r);
      if (!was) continue;
      shown.delete(r);
      shownSettled.add(r);
      const kept = reason === 'refused' ? 0 : (own.get(r)?.accepted ?? 0);
      if (kept >= was.n) stats.confirmed++;
      else back.push({ event: was.event, kept, lost: was.n - kept, reason: kept > 0 ? 'contested' : reason });
    }
    if (sessionLost !== null) lose(sessionLost);
    // Replay what is still pending on the new mirror: an action that now moves less (someone took part of the pile
    // first) gives the difference back now rather than at its ack.
    if (shown.size && predictor.pending().length) {
      predictor.state();
      for (const [r, was] of shown) {
        const n = results.get(r)?.n ?? 0;
        if (n >= was.n) continue;
        back.push({ event: was.event, kept: n, lost: was.n - n, reason: 'contested' });
        was.n = n;
      }
    }
    if (rebuilt) {
      // The packet that completes a whole state already shows what its events did: views rebuild from it, and
      // playing its events or corrections would replay effects.
      resetView();
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
    for (const e of events) {
      // Your own predicted action already played; one that was not predicted (or showed nothing) plays now.
      if (mine(e) && (shownSettled.has(e.request) || shown.has(e.request))) continue;
      if (mine(e)) stats.unpredicted++;
      const event: RailwayAccepted = Object.freeze(returned.has(e) ? { ...e, returned: returned.get(e)! } : e);
      for (const fn of effects) fn(event);
    }
  }
  rail.mirror.onPacket((p) => {
    if (!disposed) settle(p);
  });
  // A mirror that differs from the server (a refused packet, a hash mismatch) is dropped and refilled whole; the
  // server keeps this client's ack, so its pending actions still settle. At most one request a second.
  rail.mirror.onDiverged((why) => {
    if (disposed || !room || clock - resyncAt < 1000) return;
    resyncAt = clock;
    console.warn(`[railway] mirror diverged (${why}): asking for the whole state`);
    rail.reset();
    synced = false;
    predictor.invalidate();
    room.send({ t: 'r:resync' });
  });
  function hear(message: unknown, from: string) {
    if (disposed || from !== SERVER_ID || !object(message)) return;
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
    const account = railAccount(v, pid);
    const beam = v.line?.beam;
    if (beam?.state === 'held' && beam.holder === pid && !NOT_MATERIAL.has(intent.op)) return false;
    if (intent.op === 'rail.beamTake' && ((account ? railCarry(account) : 0) || predictor.pending().length))
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

  function readState() {
    const t = tick();
    const s = rail.at(t, view());
    const activeStation = railActiveStation(s);
    const stations = railJobs(s).map((job, i) =>
      Object.freeze({
        id: LINE1_STATIONS[i]!.id,
        stock: job.stock,
        allocation: job.allocation,
        used: job.used,
        delivered: job.delivered,
        stoneStock: job.stoneStock ?? 0,
        stoneAllocation: job.stoneAllocation ?? 0,
        stoneUsed: job.stoneUsed ?? 0,
        stoneDelivered: job.stoneDelivered ?? 0,
        start: job.start,
        elapsed: job.elapsed,
        lastTick: job.lastTick,
        completion: job.completion,
        timing: Object.freeze({ ...(job.timing ?? LINE_TIMING) }),
      }),
    );
    const current = stations[activeStation]!;
    const l2 = s.line2!;
    const line2Done = line2Completed(s);
    const line2 = Object.freeze({
      forge: Object.freeze({ ...l2.forge }),
      active: line2Active(s),
      completed: line2Done,
      routes: Object.freeze(line2Routes(line2Done)),
      gateOpen: line2GateOpen(s),
      lever: l2.lever,
      hook: l2.hook,
      depot: l2.depot,
      stations: Object.freeze(
        l2.jobs.map((job, i) =>
          Object.freeze({ ...job, id: LINE2_STATIONS[i]!.id, timing: Object.freeze({ ...job.timing }) }),
        ),
      ),
    });
    const account = railAccount(s, pid);
    return Object.freeze({
      tick: t,
      ...movement(),
      panelCount: railPanelCount(s),
      panelStock: railPanelStock(s),
      phase: railPhase(s, t),
      carry: account?.carry ?? 0,
      stoneCarry: account?.stone ?? 0,
      railsCarry: account?.rails ?? 0,
      line2,
      activeStation,
      stations: Object.freeze(stations),
      axe: s.line!.axe,
      jump: s.line!.jump,
      beam: Object.freeze({ ...s.line!.beam }),
      rocks: Object.freeze(
        LINE1_ROCKS.map((rock, i) =>
          Object.freeze({
            ...rock,
            remaining: s.line!.rocks[i] ?? 0,
            work: s.line!.rockWork[i] ?? 0,
            age: s.line!.rockAge[i] ?? 0,
          }),
        ),
      ),
      stoneRack: s.line!.stoneRack,
      hardwood: Object.freeze([...s.line!.hardwood]),
      upgrades: Object.freeze([...s.line!.upgrades]),
      hardwoodWork: Object.freeze([...s.line!.hardwoodWork]),
      awake: s.awake,
      start: current.start,
      elapsed: current.elapsed,
      completion: stations.reduce((n, job) => n + job.completion, 0),
      stock: current.stock,
      allocation: current.allocation,
      used: current.used,
      delivered: current.delivered,
      counts: Object.freeze(railCounts(s)),
      rack: s.supply!.rack,
      growth: Object.freeze(s.sources.map((_n, k) => Math.max(0, (s.supply!.ages[k] ?? 0) - 31))),
      sources: Object.freeze([...s.sources]),
      work: Object.freeze([...s.work]),
      falls: Object.freeze({
        yaw: Object.freeze([...s.falls!.yaw]),
        collapsed: Object.freeze([...s.falls!.collapsed]),
      }),
      piles: Object.freeze(s.piles.map((p) => Object.freeze({ ...p }))),
      accounts: Object.freeze(s.accounts.map((a) => Object.freeze({ ...a }))),
    });
  }
  function inspect() {
    const state = readState();
    const at = now();
    const stalled = predictor.stalled(at);
    return Object.freeze({
      ...state,
      pid,
      status,
      connected,
      synced,
      /** The server step the mirror is current to, and a hash of the mirror there (co-op witnesses compare them;
       * computed only when read). It is the confirmed mirror's, never the prediction's. */
      step: rail.step(),
      get hash() {
        return rail.hash();
      },
      ready: available(),
      epoch,
      next,
      pending: predictor.pending().length,
      /** The oldest action still unanswered after STALL_MS (the wordless stall cue), or null. */
      stalled: stalled[0]?.action.intent.op ?? null,
      prediction: stats,
      // Your own pending actions are already in the predicted counts, so these are the counts themselves.
      availableCarry: state.carry,
      availableStone: state.stoneCarry,
      availableRails: state.railsCarry,
      freeCarry: Math.max(0, RAILWAY_T1.carry - state.carry - state.stoneCarry - state.railsCarry),
    });
  }
  const pileIn = (id: number) => view().piles.find((p) => p.id === id);
  return {
    inspect,
    attach(nextRoom: WorldRoom) {
      if (disposed || room === nextRoom) return;
      for (const off of offRoom) off();
      room = nextRoom;
      connected = true;
      lose(null);
      offRoom = [
        room.onMessage(hear),
        room.onConnection((live) => {
          connected = live;
          if (!live) {
            // The server re-sends everything whole when the socket comes back; nothing here outlives the old one.
            rail.reset();
            synced = false;
            shownTick = 0;
            lose(null);
            resetView();
          } else lose(null);
        }),
      ];
      probe();
    },
    update(nowMs: number) {
      if (disposed) return;
      clock = nowMs;
      probe();
    },
    wake: () => submit({ op: 'rail.wake' }),
    openAxe: () => submit({ op: 'rail.axe' }),
    claimJump: () => submit({ op: 'rail.jump' }),
    beamChop: () => submit({ op: 'rail.beamChop' }),
    beamTake: (revision: number) => railInt(revision) && submit({ op: 'rail.beamTake', revision }),
    beamDrop: (x: number, y: number, z: number, revision: number) =>
      railInt(revision) &&
      railInt(x, 200000, -200000) &&
      railInt(y, 200000, -200000) &&
      railInt(z, 200000, -200000) &&
      submit({ op: 'rail.beamDrop', revision, x, y, z }),
    beamDeposit: (revision: number) => railInt(revision) && submit({ op: 'rail.beamDeposit', revision, station: 'T3' }),
    mine: (id: number) => railInt(id, 2) && submit({ op: 'rail.mine', id }),
    chop(id: number, yaw?: number, collapsed?: boolean) {
      const known =
        RAILWAY_SOURCES.some((source) => source[0] === id) || LINE1_HARDWOODS.some((source) => source[0] === id);
      return known && railYaw(yaw) && typeof collapsed === 'boolean' && submit({ op: 'rail.chop', id, yaw, collapsed });
    },
    take(id: number) {
      // A pile you just dropped has a temporary id until the server names it: it can be taken once it has.
      const pile = id > 0 ? pileIn(id) : undefined;
      return !!pile && submit({ op: 'rail.take', id, kind: pile.kind === 1 ? 1 : pile.kind === 2 ? 2 : 0 });
    },
    rackTake: (kind: RailMaterial = 0) => submit({ op: 'rail.rackTake', kind }),
    drop(x: number, y: number, z: number, n = 1, kind: RailMaterial | 2 = 0) {
      return (
        railInt(x, 200000, -200000) &&
        railInt(y, 200000, -200000) &&
        railInt(z, 200000, -200000) &&
        railInt(n, RAILWAY_T1.carry, 1) &&
        submit({ op: 'rail.drop', x, y, z, n, kind })
      );
    },
    /** Line two: the forge frame ('F') or the active Q frame. */
    depositLine2(station: 'F' | Line2StationId, n = 1, kind: 0 | 2 = 0) {
      return railInt(n, RAILWAY_T1.carry, 1) && submit({ op: 'rail.deposit', station, n, kind });
    },
    forgeTake: () => submit({ op: 'rail.forgeTake' }),
    depotTake: () => submit({ op: 'rail.depotTake' }),
    pullLever: () => submit({ op: 'rail.lever' }),
    claimHook: () => submit({ op: 'rail.hook' }),
    deposit(n = 1, kind: RailMaterial = 0) {
      const station = LINE1_STATIONS[railActiveStation(view())]!.id;
      return railInt(n, RAILWAY_T1.carry, 1) && submit({ op: 'rail.deposit', station, n, kind });
    },
    onAccepted(fn: (event: RailwayAccepted) => void) {
      effects.add(fn);
      return () => effects.delete(fn);
    },
    onCorrected(fn: (c: RailwayCorrection) => void) {
      corrections.add(fn);
      return () => corrections.delete(fn);
    },
    onRemap(fn: (temp: number, id: number) => void) {
      remaps.add(fn);
      return () => remaps.delete(fn);
    },
    onReset(fn: () => void) {
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
export type RailwayInspection = ReturnType<RailwayAdapter['inspect']>;
