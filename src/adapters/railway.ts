// The railway as a client sees it (docs/plans/replication.md, R1a and R1b): the server's state mirrored through
// replication, read as today's `Railway` so the views keep their shape. Actions go up with the actor's position and
// action time. Your own material actions are predicted (R1b): the same rule the server runs (railApply, through
// railPredict) applies to a copy of the mirror at once, the views read that predicted state, and the action's effect
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
import { RAILWAY_SOURCES } from '../sim/railway-layout.ts';
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
import { LINE_TIMING, railBeamChoppable } from '../sim/railway-line.ts';
import { LINE2_PACK, LINE2_STATIONS, line2Routes, type Line2StationId } from '../sim/railway-line2-layout.ts';
import {
  line2Active,
  line2Trains,
  line2KitOwed,
  line2CartStatus,
  line2Completed,
  line2GateOpen,
  line2SeaOpen,
  line2PackReady,
  line2Served,
  railCarryMax,
} from '../sim/railway-line2.ts';
import {
  LINE_HALTS,
  TRAIN,
  TRAIN_PHASE,
  reqHas,
  trainCanBrake,
  trainStopsOf,
  type RailTrain,
} from '../sim/railway-train.ts';
import { trainStops } from '../sim/railway-line2.ts';
import { RAIL_LINES, RAIL_TRAINS } from '../sim/railway-lines.ts';
import { LINE_SLOTS, atEnd, trainPose, trainServes, type RailLineRow } from '../sim/railway-trains.ts';
import { RAIL_ROCKS, WORKS_ROCKS } from '../sim/railway-works-layout.ts';
import { pierNeed, worksStage } from '../sim/railway-works.ts';
import type { ReadWorld } from '../sim/railway-rows.ts';
import { RULE_STEPS } from '../world/room-clock.ts';
import { createRailwayClock, RAIL_CLOCK_EVERY_MS, RAIL_CLOCK_TIMEOUT_MS } from '../world/railway-clock.ts';
import type { RailwayMirror } from '../world/railway-replicate.ts';
import { createPredictor } from '../world/replicate-client.ts';
import {
  RAIL_CADENCE_SLACK_MS,
  RAIL_PREDICTED,
  cloneRailway,
  worldOf,
  railCadence,
  railParseTempPile,
  railPredict,
  type RailEffect,
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
  | {
      op:
        | 'rail.forgeTake'
        | 'rail.depotTake'
        | 'rail.depotRailTake'
        | 'rail.lever'
        | 'rail.seaSwitch'
        | 'rail.hook'
        | 'rail.glide'
        | 'rail.pack'
        | 'rail.breaker'
        | 'rail.kiln'
        | 'rail.cradle';
    }
  | { op: 'rail.call'; id: number; dir: -1 | 1; train?: number }
  | { op: 'rail.strike'; id: number }
  | { op: 'rail.footTake'; rack: 0 | 1 }
  | { op: 'rail.footSet'; site: 0 | 1 | 2 }
  | { op: 'rail.turn'; to: 0 | 1; revision: number }
  | { op: 'rail.boilerTake' | 'rail.boilerFit'; revision: number }
  | { op: 'rail.boilerDrop'; revision: number; x: number; y: number; z: number }
  | { op: 'rail.beamTake'; revision: number }
  | { op: 'rail.beamDrop'; revision: number; x: number; y: number; z: number }
  | { op: 'rail.beamDeposit'; revision: number; station: 'T3' }
  | { op: 'rail.take'; id: number; kind?: RailMaterial | 2 | 3 }
  | { op: 'rail.rackTake'; kind?: RailMaterial }
  | { op: 'rail.deposit'; station: LineStationId | Line2StationId | 'F'; n: number; kind?: RailMaterial | 2 }
  | { op: 'rail.drop'; x: number; y?: number; z: number; n: number; kind?: RailMaterial | 2 | 3 };
export type RailwayAccepted = Readonly<
  RailwayIntent & {
    pid: string;
    /** Set on your own predicted actions; the server's events leave it out. */
    epoch?: number;
    request: number;
    accepted: number;
    status: 'accepted';
    /** The rule tick it was shown at (yours) or the packet's (everyone else's). */
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
  boilerSoloSpeed: tune.get('railBoilerSoloSpeed') / 100,
  boilerHelpSpeed: tune.get('railBoilerHelpSpeed') / 100,
  footSoloSpeed: tune.get('railFootSoloSpeed') / 100,
  footHelpSpeed: tune.get('railFootHelpSpeed') / 100,
  jumpImpulse: tune.get('railJumpImpulse') / 100,
  jumpTurn: tune.get('railJumpTurn') / 100,
  jumpSteer: tune.get('railJumpSteer') / 100,
  jumpApexSpeed: tune.get('railJumpApexSpeed') / 100,
  // The glider (piece B): metres, seconds and radians for glide-step.ts's GlideMove.
  glideSpeed: tune.get('railGlideSpeed') / 100,
  glideSink: tune.get('railGlideSink') / 100,
  glideAccel: tune.get('railGlideAccel') / 100,
  glideBrake: tune.get('railGlideBrake') / 100,
  glideOver: tune.get('railGlideOver') / 100,
  glideTurnTau: tune.get('railGlideTurnTau') / 1000,
  glideTurnMax: (tune.get('railGlideTurnMax') * Math.PI) / 180,
  glideDeploy: tune.get('railGlideDeploy') / 1000,
});
/** What the per-train reads need of an inspected state (docs/plans/generic-lines.md, v26). */
export type RailTrainsRead = {
  readonly trains: readonly Readonly<RailTrain>[];
  readonly lines: readonly Readonly<RailLineRow>[];
  readonly line2: { readonly trains: boolean; readonly trainsAt: number; readonly completed: number };
};
/** Line `line`'s trains, in slot order, with their slots (replaces v25's `line2.train[k]`). */
export const railTrainsOf = (s: Pick<RailTrainsRead, 'trains'>, line: number) =>
  LINE_SLOTS[line]!.map((slot) => ({ slot, row: s.trains[slot]! }));
/** The line train `slot` runs on. */
export const railLineOf = (slot: number) => RAIL_TRAINS[slot]!.line;
/** The stops line `line` serves now (line 2's pier once Q6 is laid). */
export const railStopsNow = (s: Pick<RailTrainsRead, 'line2'>, line: number) =>
  trainStopsOf(line, s.line2.completed >= LINE2_STATIONS.length);
/** The train a lever ask at (`line`, `stop`) heading `dir` is for at `tick`: the sim's trainServes over the mirrored
 * rows, -1 for none. */
export function railServing(s: RailTrainsRead, line: number, stop: number, dir: number, tick: number) {
  return trainServes((k) => s.trains[k]!, line, railStopsNow(s, line), stop, dir, Math.floor(tick));
}
/** Whether train `slot` is on its way to a request stop it will make: its riders' ask at a halt it can still brake for
 * (one asked too late, which it runs through and drops at its turnback, leaves the lamp dark), or a lever ask at a
 * middle halt it is the serving train for (its amber stop lamp; design review, finding 2). Off while it stands at a
 * halt. */
export function railTrainAsked(s: RailTrainsRead, slot: number, tick: number) {
  const r = s.trains[slot]!,
    line = railLineOf(slot),
    stops = railStopsNow(s, line),
    n = stops.length,
    dir = r.track ? -1 : 1;
  if (!s.line2.trains || (r.phase === TRAIN_PHASE.STAND && r.at >= 0)) return false;
  const lineReq = s.lines[line]!.req,
    pose = trainPose(r, line, stops, Math.floor(tick));
  for (let k = 1; k < n - 1; k++) {
    if (reqHas(r.req, k, dir, n) && (r.to === k || trainCanBrake(pose.s, pose.v, dir, stops[k]!, RAIL_LINES[line]!)))
      return true;
    if (reqHas(lineReq, k, dir, n) && railServing(s, line, k, dir, tick) === slot) return true;
  }
  return false;
}
/** Whether train `slot` is held (its hold lamp; the boards' held departure): awake and standing at a signal, or at a
 * halt a second past its dwell, waiting on the block ahead or the headway at an end. */
export function railTrainHeld(s: RailTrainsRead, slot: number, tick: number) {
  const r = s.trains[slot]!;
  if (!s.line2.trains || r.phase !== TRAIN_PHASE.STAND || tick < s.line2.trainsAt + TRAIN.wakeTicks) return false;
  return r.at < 0 || tick >= r.depart + TRAIN.dwellTicks + 10;
}
/** Whether halt `stop` of `line` is one of its open ends now. */
export const railOpenEnd = (s: Pick<RailTrainsRead, 'line2'>, line: number, stop: number) =>
  atEnd(stop, railStopsNow(s, line));
export type RailwayMovement = {
  beamSoloSpeed: number;
  beamHelpSpeed: number;
  boilerSoloSpeed: number;
  boilerHelpSpeed: number;
  footSoloSpeed: number;
  footHelpSpeed: number;
  jumpImpulse: number;
  jumpTurn: number;
  jumpSteer: number;
  jumpApexSpeed: number;
  glideSpeed: number;
  glideSink: number;
  glideAccel: number;
  glideBrake: number;
  glideOver: number;
  glideTurnTau: number;
  glideTurnMax: number;
  glideDeploy: number;
};
/** The most a back ever carries (with the pack): the wire's bound on a moved count; the rule clips to today's back. */
const CARRY_MAX = LINE2_PACK.carry;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
// Metres to whole centimetres; `|| 0` turns -0 (which railInt refuses) into 0.
const cm = (m: number) => Math.round(m * 100) || 0;
function intentOf(e: Record<string, unknown>): RailwayIntent | null {
  if (e.op === 'rail.wake') return { op: e.op };
  const kind = e.kind === 1 ? 1 : e.kind === 2 ? 2 : 0;
  if (e.op === 'rail.breaker' || e.op === 'rail.kiln' || e.op === 'rail.cradle') return { op: e.op };
  if (e.op === 'rail.strike' && railInt(e.id, 1)) return { op: e.op, id: e.id };
  if (e.op === 'rail.footTake' && railInt(e.rack, 1)) return { op: e.op, rack: e.rack as 0 | 1 };
  if (e.op === 'rail.footSet' && railInt(e.site, 2)) return { op: e.op, site: e.site as 0 | 1 | 2 };
  if (e.op === 'rail.turn' && railInt(e.to, 1) && railInt(e.revision))
    return { op: e.op, to: e.to as 0 | 1, revision: e.revision };
  // A footing goes down and comes up alone, as pile kind 3.
  if (
    e.op === 'rail.drop' &&
    e.kind === 3 &&
    e.n === 1 &&
    railInt(e.x, 200000, -200000) &&
    railInt(e.z, 200000, -200000)
  )
    return { op: e.op, x: e.x, z: e.z, n: 1, kind: 3, ...(railInt(e.y, 200000, -200000) ? { y: e.y } : {}) };
  if (e.op === 'rail.take' && e.kind === 3 && railInt(e.id)) return { op: e.op, id: e.id, kind: 3 };
  if (
    e.op === 'rail.axe' ||
    e.op === 'rail.beamChop' ||
    e.op === 'rail.jump' ||
    e.op === 'rail.forgeTake' ||
    e.op === 'rail.depotTake' ||
    e.op === 'rail.lever' ||
    e.op === 'rail.seaSwitch' ||
    e.op === 'rail.hook' ||
    e.op === 'rail.glide' ||
    e.op === 'rail.depotRailTake' ||
    e.op === 'rail.pack'
  )
    return { op: e.op };
  if (e.op === 'rail.call' && railInt(e.id, LINE_HALTS.length - 1) && (e.dir === -1 || e.dir === 1))
    return railInt(e.train, RAIL_TRAINS.length - 1)
      ? { op: e.op, id: e.id, dir: e.dir, train: e.train }
      : { op: e.op, id: e.id, dir: e.dir };
  if ((e.op === 'rail.boilerTake' || e.op === 'rail.boilerFit') && railInt(e.revision))
    return { op: e.op, revision: e.revision };
  if (e.op === 'rail.mine' && railInt(e.id, RAIL_ROCKS.length - 1)) return { op: e.op, id: e.id };
  if (e.op === 'rail.beamTake' && railInt(e.revision)) return { op: e.op, revision: e.revision };
  if (e.op === 'rail.beamDeposit' && railInt(e.revision) && e.station === 'T3')
    return { op: e.op, revision: e.revision, station: 'T3' };
  if (
    (e.op === 'rail.beamDrop' || e.op === 'rail.boilerDrop') &&
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
      e.station === 'Q3' ||
      e.station === 'Q4' ||
      e.station === 'Q5' ||
      e.station === 'Q6') &&
    railInt(e.n, CARRY_MAX, 1)
  )
    return { op: e.op, station: e.station, n: e.n, kind };
  if (
    e.op === 'rail.drop' &&
    railInt(e.n, CARRY_MAX, 1) &&
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
  if (railInt(v.carried, CARRY_MAX)) out.carried = v.carried;
  if (railInt(v.level, RAILWAY_MAX_INT)) out.level = v.level;
  if (railInt(v.pile, RAILWAY_MAX_INT, 1)) out.pile = v.pile;
  for (const k of ['px', 'py', 'pz'] as const) if (railInt(v[k], 200000, -200000)) out[k] = v[k];
  return out;
};
const accepted = (v: Record<string, unknown>) =>
  typeof v.pid === 'string' && railInt(v.request, RAILWAY_MAX_INT, 1) && railInt(v.accepted, CARRY_MAX, 1);
/** What the server leaves out of an event because the intent already says it (railway-requests.ts EVENT_FIELDS). */
function implied(v: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...v };
  if ((v.op === 'rail.drop' || v.op === 'rail.deposit') && out.n === undefined) out.n = v.accepted;
  if (v.op === 'rail.drop') {
    out.px ??= v.x;
    out.py ??= v.y;
    out.pz ??= v.z;
  }
  if (v.op === 'rail.take') out.pile ??= v.id;
  return out;
}
/** Ops whose whole result is one shared flag: when it holds anyway (someone else woke the machine), losing the race
 * gives nothing back. */
const holds = (s: Railway, op: string, event?: RailwayIntent) =>
  op === 'rail.boilerFit'
    ? line2Trains(s)
    : op === 'rail.call' && event?.op === 'rail.call'
      ? (() => {
          // A lever ask is the line's (`Line.req`), a rider's its own train's.
          const h = LINE_HALTS[event.id];
          const req = !h ? undefined : event.train === undefined ? s.lines[h.line]?.req : s.trains[event.train]?.req;
          return req !== undefined && reqHas(req, h!.stop, event.dir, trainStops(s, h!.line).length);
        })()
      : op === 'rail.wake'
        ? s.awake >= 0
        : op === 'rail.lever'
          ? !!s.line2?.lever
          : op === 'rail.seaSwitch'
            ? !!s.line2?.sea
            : op === 'rail.pack'
              ? !!s.line2?.pack
              : op === 'rail.glide'
                ? !!s.line2?.glide
                : op === 'rail.strike' && event?.op === 'rail.strike'
                  ? !!((s.works?.seams ?? 0) & (event.id ? 2 : 1))
                  : op === 'rail.turn' && event?.op === 'rail.turn'
                    ? s.shed?.table === event.to
                    : false;
/** Two actions competed for the same pieces: the same tree, rock, pile or rack. */
function sameTarget(a: RailwayAccepted, b: RailwayAccepted) {
  if (a.op !== b.op) return false;
  if (a.op === 'rail.chop' || a.op === 'rail.mine') return a.id === (b as typeof a).id;
  if (a.op === 'rail.take') return a.pile === b.pile || a.id === (b as typeof a).id;
  if (a.op === 'rail.rackTake') return (a.kind ?? 0) === ((b as typeof a).kind ?? 0);
  if (a.op === 'rail.footTake') return a.rack === (b as typeof a).rack;
  return a.op === 'rail.forgeTake' || a.op === 'rail.depotTake' || a.op === 'rail.depotRailTake';
}
/** Pieces flowing to the actor (a correction can return them to whoever got them instead). */
const TAKES: ReadonlySet<string> = new Set([
  'rail.chop',
  'rail.mine',
  'rail.take',
  'rail.rackTake',
  'rail.forgeTake',
  'rail.depotTake',
  'rail.depotRailTake',
  'rail.footTake',
]);
/** The ops that never move material, so a held beam does not block them. */
const NOT_MATERIAL: ReadonlySet<string> = new Set([
  'rail.wake',
  'rail.axe',
  'rail.jump',
  'rail.lever',
  'rail.seaSwitch',
  'rail.hook',
  'rail.glide',
  'rail.pack',
  'rail.boilerTake',
  'rail.boilerDrop',
  'rail.boilerFit',
  'rail.call',
  'rail.beamChop',
  'rail.beamTake',
  'rail.beamDrop',
  'rail.beamDeposit',
  'rail.breaker',
  'rail.strike',
  'rail.turn',
]);
/** Refused only while you haul the boiler, as the sim refuses them (one thing on your back at a time). */
const NOT_WHILE_HAULING: ReadonlySet<string> = new Set(['rail.breaker', 'rail.strike']);
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
  const confirmed = rail.railway;
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
  type Status = 'connecting' | 'starting' | 'ready' | 'storage' | 'full';
  let status = 'connecting' as Status;
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
    /** Read-path counts (tests and perf looks): how often the frozen reads were asked for, how often their cache key
     * was evaluated (the tick and the movement tunables) and how often a read was really rebuilt. */
    reads: { frames: 0, inspects: 0, readStates: 0, keyEvals: 0, stateBuilds: 0, inspectionBuilds: 0 },
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
  // While a whole state comes again (a lost connection, a resync), what was last shown stays shown, its timed jobs still
  // advancing: no blink, no snap. The new state replaces it at its last chunk, and the views ease to it.
  let frozen: Railway | null = null;
  const view = () => frozen ?? (predictor.pending().length ? predictor.state() : confirmed);
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
    if (consistent) for (const [name, data] of progressMarks(confirmed, rebuilt)) playMark(name, data);
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
      else if (kept < was.n && holds(confirmed, was.event.op, was.event)) standing.add(was.event.op);
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
    const account = railAccount(v, pid);
    const beam = v.line?.beam;
    if (beam?.state === 'held' && beam.holder === pid && !NOT_MATERIAL.has(intent.op)) return false;
    const boiler = v.line2?.boiler;
    if (
      boiler?.state === 'held' &&
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
      ((account ? railCarry(account) : 0) || foot || predictor.pending().length)
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
  // About twenty readers a frame (every view, the back bundle, the prompts) ask for the state. What they read changes
  // only with a packet (the mirror's applied count), the predicted state (a new object on every rebuild), the
  // estimated tick or the movement tunables, so the frozen read is rebuilt only then and shared until it changes. The
  // views can then tell that nothing changed by identity: piles keep the same array while their rows are equal.
  let readFor: Railway | null = null,
    readApplied = -1,
    readTick = -1,
    readMovement: RailwayMovement | null = null,
    read: ReturnType<typeof buildState> | null = null;
  const sameMovement = (a: RailwayMovement, b: RailwayMovement | null) =>
    !!b &&
    a.beamSoloSpeed === b.beamSoloSpeed &&
    a.beamHelpSpeed === b.beamHelpSpeed &&
    a.boilerSoloSpeed === b.boilerSoloSpeed &&
    a.boilerHelpSpeed === b.boilerHelpSpeed &&
    a.footSoloSpeed === b.footSoloSpeed &&
    a.footHelpSpeed === b.footHelpSpeed &&
    a.jumpImpulse === b.jumpImpulse &&
    a.jumpTurn === b.jumpTurn &&
    a.jumpSteer === b.jumpSteer &&
    a.jumpApexSpeed === b.jumpApexSpeed &&
    a.glideSpeed === b.glideSpeed &&
    a.glideSink === b.glideSink &&
    a.glideAccel === b.glideAccel &&
    a.glideBrake === b.glideBrake &&
    a.glideOver === b.glideOver &&
    a.glideTurnTau === b.glideTurnTau &&
    a.glideTurnMax === b.glideTurnMax &&
    a.glideDeploy === b.glideDeploy;
  // The movement tunables as one frozen object, shared by the read and read.movement(): the same object while the
  // values are unchanged. With `movementRev` the 18 tunables are read only when it moved; in the loop the object is taken
  // once a frame, at its first read, as the read's key is (the frame memo below).
  let moved: Readonly<RailwayMovement> | null = null,
    movedRev = NaN,
    movedFrame = -1;
  function moves() {
    if (moved && frame && movedFrame === frame) return moved;
    movedFrame = frame;
    if (movementRev) {
      const rev = movementRev();
      if (moved && rev === movedRev) return moved;
      movedRev = rev;
    }
    const m = movement();
    if (!sameMovement(m, moved)) moved = Object.freeze({ ...m });
    return moved!;
  }
  // The estimated tick the views read, shared by the read and read.tick(): in the loop it is taken once a frame, at its
  // first read, so two reads in a frame never straddle a tick (an edge such as waking to idle is seen once). Actions
  // are still stamped with the live tick (submit); outside the loop every call is live.
  let tickFrame = -1,
    frameTickValue = 0;
  function frameTick() {
    if (frame && tickFrame === frame) return frameTickValue;
    tickFrame = frame;
    return (frameTickValue = tick());
  }
  function readState() {
    stats.reads.readStates++;
    stats.reads.keyEvals++;
    const t = frameTick();
    const v = view();
    const m = moves();
    const applied = rail.mirror.stats.applied;
    if (read && v === readFor && t === readTick && applied === readApplied && m === readMovement) return read;
    stats.reads.stateBuilds++;
    readFor = v;
    readTick = t;
    readApplied = applied;
    readMovement = m;
    return (read = buildState(t, rail.at(t, v), m, read));
  }
  // The per-tree lists (a few hundred entries each) are copied but not frozen: in JavaScriptCore (Safari) freezing an
  // array that size costs ~35 us and leaves it slower to read, ~0.2 ms per read in all. They are readonly to TypeScript.
  const copy = <T>(list: readonly T[]): readonly T[] => list.slice();
  type Pile = Railway['piles'][number];
  const samePile = (a: Pile, b: Pile) =>
    a.id === b.id && a.x === b.x && a.y === b.y && a.z === b.z && a.n === b.n && a.kind === b.kind && a.age === b.age;
  function worksOf(s: Railway) {
    const w = s.works!;
    return Object.freeze({
      breaker: w.breaker,
      seams: w.seams,
      kiln: Object.freeze({ logs: w.logs, stone: w.stone, lit: w.lit }),
      rack: w.rack,
      poured: w.poured,
      pierRack: w.pierRack,
      pierSet: w.pierSet,
      crossing: w.crossing,
      stage: worksStage(s),
      /** Footings the pier still wants beyond what is set, racked there or aboard the wagon. */
      pierNeed: pierNeed(s),
      /** The bowl's limestone rocks (rock slots 3 and 4). */
      rocks: Object.freeze(
        WORKS_ROCKS.map((rock) =>
          Object.freeze({
            ...rock,
            remaining: s.line!.rocks[rock.id] ?? 0,
            work: s.line!.rockWork[rock.id] ?? 0,
            age: s.line!.rockAge[rock.id] ?? 0,
          }),
        ),
      ),
    });
  }
  function buildState(
    t: number,
    s: Railway,
    moves: RailwayMovement,
    last: { piles: readonly Readonly<Pile>[] } | null,
  ) {
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
      sea: l2.sea,
      seaOpen: line2SeaOpen(s),
      hook: l2.hook,
      pack: l2.pack,
      packReady: line2PackReady(s),
      depot: l2.depot,
      depotRails: l2.depotRails,
      boiler: Object.freeze({ ...l2.boiler }),
      trains: line2Trains(s),
      trainsAt: l2.trains,
      kitOwed: Object.freeze(line2KitOwed(s)),
      cart: Object.freeze({ ...l2.cart }),
      /** The rack's tag: Loading, On the way, Unloading, Waiting for forge, or nothing. */
      cartStatus: line2CartStatus(s),
      /** The stretch the cart serves, or -1. */
      served: line2Served(s),
      stations: Object.freeze(
        l2.jobs.map((job, i) =>
          Object.freeze({ ...job, id: LINE2_STATIONS[i]!.id, timing: Object.freeze({ ...job.timing }) }),
        ),
      ),
    });
    const account = railAccount(s, pid);
    return Object.freeze({
      tick: t,
      ...moves,
      panelCount: railPanelCount(s),
      panelStock: railPanelStock(s),
      phase: railPhase(s, t),
      carry: account?.carry ?? 0,
      stoneCarry: account?.stone ?? 0,
      railsCarry: account?.rails ?? 0,
      /** A footing on your back (0 or 1). */
      foot: account?.foot ?? 0,
      works: worksOf(s),
      shed: Object.freeze({ ...s.shed! }),
      /** What a back carries now: 8, or 16 with the pack (shared). */
      carryMax: railCarryMax(s),
      line2,
      /** Every train by slot (RAIL_TRAINS; railTrainsOf for one line's), and each line's row: its halts' lever asks
       * and the ends' last departures (docs/plans/generic-lines.md, v26). */
      trains: Object.freeze(s.trains.map((r) => Object.freeze({ ...r }))),
      lines: Object.freeze(s.lines.map((r) => Object.freeze({ ...r }))),
      activeStation,
      stations: Object.freeze(stations),
      axe: s.line!.axe,
      jump: s.line!.jump,
      /** The room has the glider: the accepted (or your own predicted) `Rail.glide`, taken on Needle Bell's summit. */
      glide: l2.glide,
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
      upgrades: copy(s.line!.upgrades),
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
      growth: s.sources.map((_n, k) => Math.max(0, (s.supply!.ages[k] ?? 0) - 31)) as readonly number[],
      sources: copy(s.sources),
      work: copy(s.work),
      falls: Object.freeze({
        yaw: copy(s.falls!.yaw),
        collapsed: copy(s.falls!.collapsed),
      }),
      piles:
        last && last.piles.length === s.piles.length && s.piles.every((p, i) => samePile(p, last.piles[i]!))
          ? last.piles
          : Object.freeze(s.piles.map((p) => Object.freeze({ ...p }))),
      accounts: Object.freeze(s.accounts.map((a) => Object.freeze({ ...a }))),
    });
  }
  // inspect() adds the session fields to the read; it too is the same object until one of them changes.
  let inspected: {
    state: ReturnType<typeof readState>;
    status: Status;
    connected: boolean;
    synced: boolean;
    step: number;
    ready: boolean;
    epoch: number;
    next: number;
    pending: number;
    stalled: RailwayIntent['op'] | null;
    view: ReturnType<typeof inspection>;
  } | null = null;
  // The frame memo. update() runs once a frame in the railway entity's update (order 10, after its prePhysics and fixed steps) and moves `frame`; until the next one
  // the estimated tick, the tunables and the clock-bound session fields (step, ready, stalled) are taken as they were
  // at the head of the frame, so about a hundred readers a frame skip the 18 tune reads and the rest of the key. What
  // can still change inside a frame is checked each call, and is cheap: the view object (a press rebuilds the
  // prediction, a refill or its end swaps it), the mirror's applied count, the pending count and the session fields.
  // Outside the loop (tests, tools) `frame` never moves and every call evaluates the whole key as before.
  let frame = 0;
  let inspectedFrame = -1;
  // The stall cue, shared by inspect() and read.stalled(): in the loop it is taken once a frame while the pending list
  // keeps its oldest action (actions are pushed in time order, so only the oldest can be the first stalled one).
  let stallFrame = -1,
    stallList: unknown = null,
    stallHead: unknown = null,
    stallOp: RailwayIntent['op'] | null = null;
  function stalledNow() {
    const list = predictor.pending();
    if (frame && stallFrame === frame && list === stallList && list[0] === stallHead) return stallOp;
    [stallFrame, stallList, stallHead] = [frame, list, list[0]];
    // Only a pending action can be stalled.
    return (stallOp = list.length ? (predictor.stalled(now())[0]?.action.intent.op ?? null) : null);
  }
  function inspect() {
    stats.reads.inspects++;
    const i0 = inspected;
    if (
      frame &&
      !disposed &&
      i0 &&
      inspectedFrame === frame &&
      view() === readFor &&
      rail.mirror.stats.applied === readApplied &&
      predictor.pending().length === i0.pending &&
      status === i0.status &&
      connected === i0.connected &&
      synced === i0.synced &&
      epoch === i0.epoch &&
      next === i0.next
    )
      return i0.view;
    const state = readState();
    const pending = predictor.pending().length;
    const stalled = stalledNow();
    const step = rail.step();
    const ready = available();
    const i = inspected;
    if (
      i &&
      i.state === state &&
      i.status === status &&
      i.connected === connected &&
      i.synced === synced &&
      i.step === step &&
      i.ready === ready &&
      i.epoch === epoch &&
      i.next === next &&
      i.pending === pending &&
      i.stalled === stalled
    ) {
      inspectedFrame = frame;
      return i.view;
    }
    stats.reads.inspectionBuilds++;
    const out = inspection(state, step, ready, pending, stalled);
    inspected = {
      state,
      status,
      connected,
      synced,
      step,
      ready,
      epoch,
      next,
      pending,
      stalled,
      view: out,
    };
    inspectedFrame = frame;
    return out;
  }
  function inspection(
    state: ReturnType<typeof readState>,
    step: number,
    ready: boolean,
    pending: number,
    stalled: RailwayIntent['op'] | null,
  ) {
    return Object.freeze({
      ...state,
      pid,
      status,
      connected,
      synced,
      /** The server step the mirror is current to, and a hash of the mirror there (co-op witnesses compare them;
       * computed only when read). It is the confirmed mirror's, never the prediction's. */
      step,
      get hash() {
        return rail.hash();
      },
      ready,
      epoch,
      next,
      pending,
      /** The oldest action still unanswered after STALL_MS (the wordless stall cue), or null. */
      stalled,
      prediction: stats,
      // Your own pending actions are already in the predicted counts, so these are the counts themselves.
      availableCarry: state.carry,
      availableStone: state.stoneCarry,
      availableRails: state.railsCarry,
      freeCarry: Math.max(0, state.carryMax - state.carry - state.stoneCarry - state.railsCarry),
    });
  }
  const pileIn = (id: number) => view().piles.find((p) => p.id === id);
  // The read facade (docs/plans/ecs-migration-railway.md, M8): what views read once they move off inspect() (M10).
  // world() is the world behind the read model the views see now (the predicted clone while actions are pending, the
  // confirmed mirror otherwise, the last shown state while a refill comes in), so it keeps that model's consistency
  // rule: a read model is linked to a world only once the world is whole. Read its rows and pass it to the queries in
  // src/sim/railway-queries*.ts with `tick()` as their `at` (a timed fact without it throws on a client's world); it
  // is typed read-only, so a view cannot write to it or drain its changes.
  const facade = {
    world: () => (worldOf(view()) ?? worldOf(confirmed)!) as unknown as ReadWorld,
    /** The estimated server tick (whole, never going backwards): the job clocks' `at`. In the frame loop it holds one
     * value for the whole frame, inspect().tick's, so it stays consistent with world() and with itself within a frame;
     * outside the loop it is live. */
    tick: frameTick,
    /** The live tick with its fraction, for movers: unlike tick(), it moves within a frame. */
    tickNow,
    pid,
    /** The session's state. 'ready' does not mean an action can be sent now: see ready(). */
    status: () => status,
    // The session values that are not rows (M10, for the views leaving inspect()): each equals inspect()'s field of
    // the same name at the same moment.
    /** Whether an action can be sent now: connected, the whole state in, this session's account epoch matching and
     * the pending window not full. Unlike `status() === 'ready'`, false while RAILWAY_WINDOW actions are pending. */
    ready: available,
    /** Your actions sent and not yet answered (already in the world the views see). */
    pending: () => predictor.pending().length,
    /** The oldest pending action still unanswered after STALL_MS (the wordless stall cue), or null. */
    stalled: stalledNow,
    /** The movement tunables (railMovement), one frozen object while they are unchanged. */
    movement: moves,
  };
  return {
    inspect,
    read: facade,
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
      frame++;
      stats.reads.frames++;
      probe();
      probeClock();
    },
    wake: () => submit({ op: 'rail.wake' }),
    openAxe: () => submit({ op: 'rail.axe' }),
    claimJump: () => submit({ op: 'rail.jump' }),
    /** False (rebound now) when the rule would refuse the stroke: before Station 3 opens or once the tree is down. */
    beamChop: () => railBeamChoppable(view()) && submit({ op: 'rail.beamChop' }),
    beamTake: (revision: number) => railInt(revision) && submit({ op: 'rail.beamTake', revision }),
    beamDrop: (x: number, y: number, z: number, revision: number) =>
      railInt(revision) &&
      railInt(x, 200000, -200000) &&
      railInt(y, 200000, -200000) &&
      railInt(z, 200000, -200000) &&
      submit({ op: 'rail.beamDrop', revision, x, y, z }),
    beamDeposit: (revision: number) => railInt(revision) && submit({ op: 'rail.beamDeposit', revision, station: 'T3' }),
    mine: (id: number) => railInt(id, RAIL_ROCKS.length - 1) && submit({ op: 'rail.mine', id }),
    chop(id: number, yaw?: number, collapsed?: boolean) {
      const known =
        RAILWAY_SOURCES.some((source) => source[0] === id) || LINE1_HARDWOODS.some((source) => source[0] === id);
      return known && railYaw(yaw) && typeof collapsed === 'boolean' && submit({ op: 'rail.chop', id, yaw, collapsed });
    },
    take(id: number) {
      // A pile you just dropped has a temporary id until the server names it: it can be taken once it has.
      const pile = id > 0 ? pileIn(id) : undefined;
      const kind = pile?.kind === 1 ? 1 : pile?.kind === 2 ? 2 : pile?.kind === 3 ? 3 : 0;
      return !!pile && submit({ op: 'rail.take', id, kind });
    },
    rackTake: (kind: RailMaterial = 0) => submit({ op: 'rail.rackTake', kind }),
    /** Kind 3 puts down the footing on your back (n 1). */
    drop(x: number, y: number, z: number, n = 1, kind: RailMaterial | 2 | 3 = 0) {
      return (
        railInt(x, 200000, -200000) &&
        railInt(y, 200000, -200000) &&
        railInt(z, 200000, -200000) &&
        railInt(n, kind === 3 ? 1 : CARRY_MAX, 1) &&
        submit({ op: 'rail.drop', x, y, z, n, kind })
      );
    },
    /** Line two: the forge frame ('F') or active Q frame, including while its gate holds laying. */
    depositLine2(station: 'F' | Line2StationId, n = 1, kind: 0 | 2 = 0) {
      return railInt(n, CARRY_MAX, 1) && submit({ op: 'rail.deposit', station, n, kind });
    },
    forgeTake: () => submit({ op: 'rail.forgeTake' }),
    depotTake: () => submit({ op: 'rail.depotTake' }),
    depotRailTake: () => submit({ op: 'rail.depotRailTake' }),
    openPack: () => submit({ op: 'rail.pack' }),
    takeBoiler: (revision: number) => railInt(revision) && submit({ op: 'rail.boilerTake', revision }),
    dropBoiler: (x: number, y: number, z: number, revision: number) =>
      railInt(revision) &&
      railInt(x, 200000, -200000) &&
      railInt(y, 200000, -200000) &&
      railInt(z, 200000, -200000) &&
      submit({ op: 'rail.boilerDrop', revision, x, y, z }),
    fitBoiler: (revision: number) => railInt(revision) && submit({ op: 'rail.boilerFit', revision }),
    /** A stop request (docs/plans/generic-lines.md, 7): halt `id`, heading `dir` (-1 toward its line's stop 0, +1
     * away). From the lever on that way's platform (no `train`: the next train that can brake for it), or aboard train
     * `train` (its slot: only that train serves it). */
    callTrain: (id: number, dir: -1 | 1, train?: number) =>
      railInt(id, LINE_HALTS.length - 1) &&
      (dir === -1 || dir === 1) &&
      (train === undefined || railInt(train, RAIL_TRAINS.length - 1)) &&
      submit(train === undefined ? { op: 'rail.call', id, dir } : { op: 'rail.call', id, dir, train }),
    /** The Works and the Roundhouse (docs/plans/split-rock-roundhouse.md). */
    takeBreaker: () => submit({ op: 'rail.breaker' }),
    /** Strike a seam: 0 the stall slab at Home, 1 the throat at the quarry. */
    strike: (id: number) => railInt(id, 1) && submit({ op: 'rail.strike', id }),
    fillKiln: () => submit({ op: 'rail.kiln' }),
    /** Shoulder a footing: 0 the Works rack, 1 the pier rack. */
    shoulderFooting: (rack: 0 | 1) => railInt(rack, 1) && submit({ op: 'rail.footTake', rack }),
    /** Set the footing on your back: 0 the stall, 1 the cradle, 2 the pier. */
    setFooting: (site: 0 | 1 | 2) => railInt(site, 2) && submit({ op: 'rail.footSet', site }),
    fitCradle: () => submit({ op: 'rail.cradle' }),
    /** Turn the table to a road (0 the stall road, 1 line 2's) on the revision you saw. */
    turnTable: (to: 0 | 1, revision: number) =>
      railInt(to, 1) && railInt(revision) && submit({ op: 'rail.turn', to, revision }),
    /** The server's tick as this tab estimates it, with its fraction (never going backwards). */
    tickNow,
    pullLever: () => submit({ op: 'rail.lever' }),
    pullSeaSwitch: () => submit({ op: 'rail.seaSwitch' }),
    claimHook: () => submit({ op: 'rail.hook' }),
    /** Take the glider from its summit device (once Q5 is laid; the rule and the server judge it). */
    claimGlide: () => submit({ op: 'rail.glide' }),
    deposit(n = 1, kind: RailMaterial = 0) {
      const station = LINE1_STATIONS[railActiveStation(view())]!.id;
      return railInt(n, CARRY_MAX, 1) && submit({ op: 'rail.deposit', station, n, kind });
    },
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
export type RailwayInspection = ReturnType<RailwayAdapter['inspect']>;
