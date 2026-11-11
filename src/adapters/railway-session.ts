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
import { RAILWAY_SOURCES } from '../sim/railway-layout.ts';
import { railInt, railYaw, RAILWAY_MAX_INT, RAILWAY_WINDOW, type RailAction } from '../sim/railway.ts';
import { LINE1_STATIONS, LINE1_HARDWOODS, type RailMaterial, type LineStationId } from '../sim/railway-line-layout.ts';
import { LINE2_PACK, type Line2StationId } from '../sim/railway-line2-layout.ts';
import { LINE_HALTS, reqHas } from '../sim/railway-train.ts';
import { RAIL_TRAINS } from '../sim/railway-lines.ts';
import { RAIL_ROCKS } from '../sim/railway-works-layout.ts';
import {
  account as accountRow,
  aperture,
  beam as beamRow,
  boiler as boilerRow,
  line as lineRow,
  rail as railRow,
  shed as shedRow,
  train as trainRow,
  works as worksRow,
  type ReadWorld,
} from '../sim/railway-rows.ts';
import { Pile } from '../sim/railway-components.ts';
import { activeStation, cloneWorld } from '../sim/railway-queries.ts';
import { railBeamChoppable } from '../sim/railway-queries-line1.ts';
import { line2Trains as line2TrainsIn } from '../sim/railway-queries-line2.ts';
import { trainStops } from '../sim/railway-queries-trains.ts';
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
  | { op: 'rail.footTake'; rack: 0 | 1 | 2 }
  | { op: 'rail.footSet'; site: 0 | 1 | 2 | 3 }
  | { op: 'rail.brace'; revision: 1 }
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
export type RailwayMovement = ReturnType<typeof railMovement>;
const MOVEMENT_KEYS = Object.keys(railMovement({ get: () => 0 })) as (keyof RailwayMovement)[];
/** The most a back ever carries (with the pack): the wire's bound on a moved count; the rule clips to today's back. */
const CARRY_MAX = LINE2_PACK.carry;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
// Metres to whole centimetres; `|| 0` turns -0 (which railInt refuses) into 0.
const cm = (m: number) => Math.round(m * 100) || 0;
function intentOf(e: Record<string, unknown>): RailwayIntent | null {
  if (e.op === 'rail.wake') return { op: e.op };
  const kind = e.kind === 1 ? 1 : e.kind === 2 ? 2 : 0;
  if (e.op === 'rail.breaker' || e.op === 'rail.kiln' || e.op === 'rail.cradle') return { op: e.op };
  if (e.op === 'rail.strike' && railInt(e.id, 2)) return { op: e.op, id: e.id };
  if (e.op === 'rail.footTake' && railInt(e.rack, 2)) return { op: e.op, rack: e.rack as 0 | 1 | 2 };
  if (e.op === 'rail.footSet' && railInt(e.site, 3)) return { op: e.op, site: e.site as 0 | 1 | 2 | 3 };
  if (e.op === 'rail.brace' && e.revision === 1) return { op: e.op, revision: 1 };
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
 * gives nothing back. Read on the confirmed world's rows. */
const holds = (w: World, op: string, event?: RailwayIntent) =>
  op === 'rail.boilerFit'
    ? line2TrainsIn(w)
    : op === 'rail.call' && event?.op === 'rail.call'
      ? (() => {
          // A lever ask is the line's (`Line.req`), a rider's its own train's.
          const h = LINE_HALTS[event.id];
          const req = !h
            ? undefined
            : event.train === undefined
              ? lineRow(w, h.line)?.req
              : event.train >= 0 && event.train < RAIL_TRAINS.length
                ? trainRow(w, event.train)?.req
                : undefined;
          return req !== undefined && reqHas(req, h!.stop, event.dir, trainStops(w, h!.line).length);
        })()
      : op === 'rail.wake'
        ? railRow(w).awake >= 0
        : op === 'rail.lever'
          ? railRow(w).lever
          : op === 'rail.seaSwitch'
            ? railRow(w).sea
            : op === 'rail.pack'
              ? railRow(w).pack
              : op === 'rail.glide'
                ? railRow(w).glide
                : op === 'rail.strike' && event?.op === 'rail.strike'
                  ? event.id === 2
                    ? aperture(w).joined >= 0
                    : !!(worksRow(w).seams & (event.id ? 2 : 1))
                  : op === 'rail.brace'
                    ? aperture(w).brace !== 1
                    : op === 'rail.turn' && event?.op === 'rail.turn'
                      ? shedRow(w).table === event.to
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
  'rail.brace',
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
  // The frame memo. update() runs once a frame in the railway entity's update (order 10, after its prePhysics and fixed
  // steps) and moves `frame`. A perFrame value is taken at its first read in a frame and held until the next one (while
  // `keep` says it still stands), so about a hundred readers a frame skip the 18 tune reads, the clock and the stall
  // scan, and two reads in a frame never straddle a tick (an edge such as waking to idle is seen once). Outside the loop
  // (tests, tools) `frame` never moves and every call is live.
  let frame = 0;
  function perFrame<T>(read: () => T, keep: () => boolean = () => true) {
    let at = -1,
      value: T;
    return () => {
      if (frame && at === frame && keep()) return value;
      at = frame;
      return (value = read());
    };
  }
  const sameMovement = (a: RailwayMovement, b: RailwayMovement | null) =>
    !!b && MOVEMENT_KEYS.every((k) => a[k] === b[k]);
  // The movement tunables as one frozen object: the same object while the values are unchanged. With `movementRev` the
  // 18 tunables are read only when it moved.
  let moved: Readonly<RailwayMovement> | null = null,
    movedRev = NaN;
  const moves = perFrame(() => {
    if (movementRev) {
      const rev = movementRev();
      if (moved && rev === movedRev) return moved;
      movedRev = rev;
    }
    const m = movement();
    if (!sameMovement(m, moved)) moved = Object.freeze({ ...m });
    return moved!;
  });
  // The estimated tick the views read. Actions are still stamped with the live tick (submit).
  const frameTick = perFrame(tick);
  // The stall cue, held while the pending list keeps its oldest action (actions are pushed in time order, so only the
  // oldest can be the first stalled one).
  let stallList: unknown = null,
    stallHead: unknown = null;
  const stalledNow = perFrame(
    (): RailwayIntent['op'] | null => {
      const list = predictor.pending();
      [stallList, stallHead] = [list, list[0]];
      // Only a pending action can be stalled.
      return list.length ? (predictor.stalled(now())[0]?.action.intent.op ?? null) : null;
    },
    () => {
      const list = predictor.pending();
      return list === stallList && list[0] === stallHead;
    },
  );
  // The first whole state, latched: a session value, so a view that hides, resets or un-decks until it is in reads it
  // here, not a latch of its own. read.ready() is also false with a full pending window or the link down; this is not.
  let whole = false;
  const wholeNow = () => (whole ||= available());
  const pileIn = (id: number) => view().get(Pile, id);
  // The read facade (docs/plans/ecs-migration-railway.md, M8, M12): what views read. world() is the world the views see
  // now: the predicted clone while actions are pending, the confirmed (published) world otherwise, the last shown world
  // while a refill comes in. It is never half-filled: the mirror publishes only whole, fully applied states, and a
  // published world is never written. Read its rows and pass it to the queries in
  // src/sim/railway-queries*.ts with `tick()` as their `at` (a timed fact without it throws on a client's world); it
  // is typed read-only, so a view cannot write to it or drain its changes.
  const facade = {
    world: () => view() as unknown as ReadWorld,
    /** The estimated server tick (whole, never going backwards): the job clocks' `at`. In the frame loop it holds one
     * value for the whole frame, so it stays consistent with world() and with itself within a frame; outside the loop it
     * is live. */
    tick: frameTick,
    /** The live tick with its fraction, for movers: unlike tick(), it moves within a frame. */
    tickNow,
    pid,
    /** The session's state. 'ready' does not mean an action can be sent now: see ready(). */
    status: () => status,
    // The session values that are not rows.
    /** Whether an action can be sent now: connected, the whole state in, this session's account epoch matching and
     * the pending window not full. Unlike `status() === 'ready'`, false while RAILWAY_WINDOW actions are pending. */
    ready: available,
    /** The first whole state is in: false until ready() is first true, then true for good (through refills, full
     * windows and a dropped link, while the world the views see keeps the last whole state). */
    whole: wholeNow,
    /** Your actions sent and not yet answered (already in the world the views see). */
    pending: () => predictor.pending().length,
    /** The oldest pending action still unanswered after STALL_MS (the wordless stall cue), or null. */
    stalled: stalledNow,
    /** The movement tunables (railMovement), one frozen object while they are unchanged. */
    movement: moves,
    /** The session scalars no view reads (tools, witnesses and the view's inspection do), built per call: the
     * connection, the server step the confirmed mirror is current to and its hash (computed only when read; never the
     * prediction's), the account epoch, the next action id and the prediction's counters. */
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
  };
  return {
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
      probe();
      probeClock();
      wholeNow();
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
    /** Strike a seam: 0 the stall slab at Home, 1 the throat at the quarry, 2 Ring Island's rivet (v27). */
    strike: (id: number) => railInt(id, 2) && submit({ op: 'rail.strike', id }),
    fillKiln: () => submit({ op: 'rail.kiln' }),
    /** Shoulder a footing: 0 the Works rack, 1 the pier rack, 2 the railhead's rack. */
    shoulderFooting: (rack: 0 | 1 | 2) => railInt(rack, 2) && submit({ op: 'rail.footTake', rack }),
    /** Set the footing on your back: 0 the stall, 1 the cradle, 2 the pier, 3 the railhead's jib. */
    setFooting: (site: 0 | 1 | 2 | 3) => railInt(site, 3) && submit({ op: 'rail.footSet', site }),
    /** Brace the raised leaf (the gold strut on the brace platform): only the raised leaf you saw. */
    braceLeaf: () => submit({ op: 'rail.brace', revision: 1 }),
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
      const station = LINE1_STATIONS[activeStation(view())]!.id;
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
