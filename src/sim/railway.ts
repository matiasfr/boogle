// The railway's shared types and read helpers (docs/plans/ecs-e.md, section 4). Its state lives in an E world
// (./railway-components.ts) and its rules are systems (./railway-systems.ts); `Railway` here is the read model rebuilt
// from that world for views, read helpers and validation, never written back.
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from './railway-layout.ts';
import { railJobs, railCurrentJob, railActiveStation, LINE_TIMING, type RailLine } from './railway-line.ts';
import { lineSchedule, type LineTiming } from './railway-line-schedule.ts';
import { LINE1_STATIONS } from './railway-line-layout.ts';
export {
  railJobs,
  railCurrentJob,
  railActiveJob,
  railActiveStation,
  railMaxDuration,
  railCarry,
  railAxeAvailable,
  railBeamChoppable,
  railLineOpen,
  railPanelCount,
  railPanelStock,
} from './railway-line.ts';
import type { RailSupply } from './railway-supply.ts';
import { line2Logs, line2Rails, type RailLine2 } from './railway-line2.ts';
import type { RailShed, RailWorks } from './railway-works.ts';
import type { RailTrain } from './railway-train.ts';
import type { RailLineRow } from './railway-trains.ts';

export const RAILWAY_OUTCOMES = 64;
export const RAILWAY_WINDOW = 8;
export const RAILWAY_PILES = 128;
export const RAILWAY_MAX_INT = 2147483647;
export const RAILWAY_MAX_MARKER = Number.MAX_SAFE_INTEGER;
export const RAILWAY_DURATION = T1.depositTicks + T1.feedTicks + T1.layTicks;
export type RailAccount = {
  pid: string;
  carry: number;
  stone?: number;
  rails?: number;
  /** A footing on your back (0 or 1): it fills it. */
  foot?: number;
  epoch: number;
  request: number;
};
export type RailPile = { id: number; x: number; z: number; n: number; kind?: number; y?: number; age?: number };
export type RailResult = {
  pid: string;
  epoch: number;
  request: number;
  status: 'accepted' | 'noop' | 'rejected' | 'snapshot-required';
  accepted: number;
};
export type Railway = {
  catalog: number;
  sources: number[];
  work: number[];
  accounts: RailAccount[];
  piles: RailPile[];
  outcomes: RailResult[];
  nextPile: number;
  awake: number;
  stock: number;
  allocation: number;
  used: number;
  delivered: number;
  start: number;
  elapsed: number;
  lastTick: number;
  resumeMarker: number;
  completion: number;
  timing?: LineTiming;
  stoneStock?: number;
  stoneAllocation?: number;
  stoneUsed?: number;
  stoneDelivered?: number;
  line?: RailLine;
  /** Line two (forge, Q1-Q5, the pack and gates); present with line one. */
  line2?: RailLine2;
  /** Every train by slot (RAIL_TRAINS), each on its line (docs/plans/generic-lines.md, v26). */
  trains: RailTrain[];
  /** Each line's shared row by line index: its halts' lever asks and the ends' last departures. */
  lines: RailLineRow[];
  /** Split-rock Works and the Roundhouse stall (./railway-works.ts); present with line two. */
  works?: RailWorks;
  shed?: RailShed;
  /** Ring Island's gap (v27, the Aperture row): bent footings set, the railhead rack, the counterweight, the leaf's
   * brace and the tick the rivet was struck (./railway-sys-ring.ts). */
  ring?: RailRing;
  /** Playable namespace only: accepted collision presentation, independent of material balances. */
  falls?: { yaw: number[]; collapsed: boolean[] };
  supply?: RailSupply;
};
export type RailRing = { set: number; rack: number; cw: number; brace: number; joined: number };
export type RailRequest = { epoch: number; request: number };
export type RailAction = RailRequest & {
  op: string;
  id?: number;
  n?: number;
  x?: number;
  z?: number;
  y?: number;
  yaw?: number;
  collapsed?: boolean;
  kind?: number;
  station?: string;
  revision?: number;
  /** rail.footTake: 0 the Works rack, 1 the pier rack, 2 the railhead rack (v27). */
  rack?: number;
  /** rail.footSet: 0 the stall, 1 the cradle, 2 the pier, 3 the railhead jib (v27). */
  site?: number;
  /** rail.turn: the road the table turns to (0 the stall road, 1 line 2's). */
  to?: number;
  /** rail.call: the way the train is asked to be going, -1 to stop 0's end, +1 to the far end (never an open end's
   * way in). */
  dir?: number;
  /** rail.call aboard: the slot of the rider's train (absent: the halt's lever, from its platform for `dir`). */
  train?: number;
  /** rail.wake: the rule tick its actor pressed at (the client's estimate); the server bounds it (railWakeTick). */
  tk?: number;
};
export const railInt = (v: unknown, max = RAILWAY_MAX_INT, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
export const railYaw = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 6.283185307179586 && !Object.is(v, -0);
export const railAccount = (s: Railway, pid: string) => s.accounts.find((a) => a.pid === pid);
export const railSource = (id: number) => RAILWAY_SOURCES.findIndex((row) => row[0] === id);
/** Conserved totals include both the depot cart and the line-2 kit train through line2Logs/line2Rails, and the
 * Works kiln's logs and stone. */
export function railCounts(s: Railway) {
  const source = s.sources.reduce((a, b) => a + b, 0) + (s.line?.hardwood.reduce((a, b) => a + b, 0) ?? 0);
  const carry = s.accounts.reduce((a, b) => a + b.carry, 0);
  const loose = s.piles.reduce((a, b) => a + (b.kind ? 0 : b.n), 0);
  const line2 = s.line2 ? line2Logs(s) + (s.works?.logs ?? 0) : 0;
  const jobs = railJobs(s);
  const stock = jobs.reduce((n, j) => n + j.stock, 0),
    allocation = jobs.reduce((n, j) => n + j.allocation, 0);
  const used = jobs.reduce((n, j) => n + j.used, 0),
    delivered = jobs.reduce((n, j) => n + j.delivered, 0);
  const completion = jobs.reduce((n, j) => n + j.completion, 0);
  const stone = {
    source: s.line?.rocks.reduce((a, b) => a + b, 0) ?? 0,
    carry: s.accounts.reduce((n, a) => n + (a.stone ?? 0), 0),
    loose: s.piles.reduce((n, p) => n + (p.kind === 1 ? p.n : 0), 0),
    stock: jobs.reduce((n, j) => n + (j.stoneStock ?? 0), 0),
    allocation: jobs.reduce((n, j) => n + (j.stoneAllocation ?? 0), 0),
    used: jobs.reduce((n, j) => n + (j.stoneUsed ?? 0), 0),
    rack: s.line?.stoneRack ?? 0,
    kiln: s.works?.stone ?? 0,
    produced: s.line?.stoneProduced ?? 0,
    delivered: jobs.reduce((n, j) => n + (j.stoneDelivered ?? 0), 0),
    total: 0,
  };
  stone.total =
    stone.source + stone.carry + stone.loose + stone.stock + stone.allocation + stone.used + stone.rack + stone.kiln;
  const l2 = s.line2;
  const rails = l2
    ? {
        forge: l2.forge.rack,
        shelf: l2.depotRails,
        carry: s.accounts.reduce((n, a) => n + (a.rails ?? 0), 0),
        loose: s.piles.reduce((n, p) => n + (p.kind === 2 ? p.n : 0), 0),
        stations: l2.jobs.reduce((n, j) => n + j.railStock + j.railAllocation + j.railUsed, 0),
        poured: l2.forge.poured,
        total: line2Rails(s),
        delivered: l2.jobs.reduce((n, j) => n + j.railDelivered, 0),
      }
    : null;
  const line2Delivered = l2 ? l2.forge.used + l2.jobs.reduce((n, j) => n + j.delivered, 0) : 0;
  return {
    source,
    carry,
    loose,
    stock,
    allocation,
    used,
    ...(l2 ? { line2 } : {}),
    rack: s.supply?.rack ?? 0,
    produced: (s.supply?.produced ?? 0) + (l2?.depotProduced ?? 0),
    total: source + carry + loose + stock + allocation + used + line2 + (s.supply?.rack ?? 0),
    delivered,
    score:
      (delivered + line2Delivered) * T1.deliveryScore +
      (rails?.delivered ?? 0) * 40 +
      (l2?.jobs.reduce((n, j) => n + j.completion, 0) ?? 0) * T1.completionScore +
      completion * T1.completionScore +
      stone.delivered * 25 +
      (s.line?.beam.state === 'allocated' || s.line?.beam.state === 'used' ? 1500 : 0),
    completion,
    starterRails: T1.starterRails,
    ...(s.line ? { stone } : {}),
    ...(rails ? { rails } : {}),
  };
}
export function railPhase(
  s: Railway,
  tick = s.lastTick,
): 'asleep' | 'waking' | 'idle' | 'deposit' | 'feeding' | 'laying' | 'done' {
  if (s.line) {
    const job = railCurrentJob(s);
    if (job.completion) return 'done';
    if (job.start < 0) return s.awake < 0 ? 'asleep' : tick < s.awake + T1.wakeTicks ? 'waking' : 'idle';
    const schedule = lineSchedule(LINE1_STATIONS[railActiveStation(s)]!, job.timing ?? LINE_TIMING);
    const feedEnd = schedule.depositTicks + schedule.feedTicks;
    return job.elapsed < Math.ceil((job.timing ?? LINE_TIMING).depositMs / 100)
      ? 'deposit'
      : job.elapsed < feedEnd
        ? 'feeding'
        : 'laying';
  }
  if (s.completion) return 'done';
  if (s.start < 0) return s.awake < 0 ? 'asleep' : tick < s.awake + T1.wakeTicks ? 'waking' : 'idle';
  return s.elapsed < T1.depositTicks ? 'deposit' : s.elapsed < T1.depositTicks + T1.feedTicks ? 'feeding' : 'laying';
}
