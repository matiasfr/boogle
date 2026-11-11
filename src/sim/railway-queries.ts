// The railway's derived facts on the world (docs/plans/ecs-migration-railway.md, section 2, "Queries"): pure reads of
// `(world)` or `(world, tick)` that the systems share. Queries never write. The view-side twins on `Railway`
// (railActiveStation, line2Active, ...) still exist until M12b; each now has a world twin here or in its domain's file
// (railway-queries-line1.ts, -line2.ts, -trains.ts, -works.ts), and test/railway-queries.test.ts holds each pair equal.
import type { RowOf, World } from '../ecs/index.ts';
import { RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_STATIONS } from './railway-line-layout.ts';
import { LINE2_PACK as PACK, LINE2_STATIONS, pierLaid, type Line2Station } from './railway-line2-layout.ts';
import { layProgress, lineSchedule, type LineTiming } from './railway-line-schedule.ts';
import { CART } from './railway-cart.ts';
import { trainStopsOf, type RailTrain } from './railway-train.ts';
import { LINE2 } from './railway-lines.ts';
import { LINE_SLOTS } from './railway-trains.ts';
import { WORKS } from './railway-works-layout.ts';
import { LINE_TIMING } from './railway-line.ts';
import {
  Account,
  Beam,
  Boiler,
  Cart,
  DEPOT_OUT,
  Forge,
  Job,
  JobRun,
  Line,
  QJob,
  QJobRun,
  Rail,
  Shed,
  Train,
  Works,
} from './railway-components.ts';

export type Row<C> = C extends { defaults: infer R } ? { -readonly [K in keyof R]: R[K] } : never;
const TIMING_KEYS = Object.keys(LINE_TIMING) as (keyof LineTiming)[];
export const railId = (w: World) => w.single(Rail);
export const beamId = (w: World) => w.single(Beam);
export const forgeId = (w: World) => w.single(Forge);
export const cartId = (w: World) => w.single(Cart);
export const boilerId = (w: World) => w.single(Boiler);
export const trainId = (w: World, slot: number) => w.lookup(Train, slot)!;
export const lineId = (w: World, line: number) => w.lookup(Line, line)!;
export const LINE2_SLOTS = LINE_SLOTS[LINE2]!;
/** What line 2's trains carry between them (the Q6 kit, footings). */
export const aboard = (w: World, key: 'logs' | 'rails' | 'foot') =>
  LINE2_SLOTS.reduce((n, k) => n + w.get(Train, trainId(w, k))![key], 0);
/** The slot the footing wagon is coupled to, or -1. */
export const wagonSlot = (w: World) => LINE2_SLOTS.find((k) => w.get(Train, trainId(w, k))!.wagon) ?? -1;
export const job = (w: World, slot: number) => w.lookup(Job, slot)!;
export const qjob = (w: World, slot: number) => w.lookup(QJob, slot)!;
/** The line-one station taking materials now (railActiveStation). */
export function activeStation(w: World) {
  return !w.get(Job, job(w, 0))!.completion ? 0 : !w.get(Job, job(w, 1))!.completion ? 1 : 2;
}
export function ready(w: World, tick: number) {
  const awake = w.get(Rail, railId(w))!.awake;
  return awake >= 0 && tick >= awake + T1.wakeTicks;
}
export const held = (w: World, pid: string) => {
  const b = w.get(Beam, beamId(w))!;
  return b.state === 'held' && b.holder === pid;
};
export const boilerHeld = (w: World, pid: string) => {
  const b = w.get(Boiler, boilerId(w))!;
  return b.state === 'held' && b.holder === pid;
};
export type AccountRow = Row<typeof Account>;
/** A big thing fills your back: the great beam, the boiler or a footing. */
export const heldBig = (w: World, a: Readonly<AccountRow>) => held(w, a.pid) || boilerHeld(w, a.pid) || a.foot > 0;
export const carried = (a: Readonly<AccountRow>) => a.carry + a.stone + a.rails;
/** What a back carries (railCarryMax): the pack is shared progression, like the axe. */
export const carryMax = (w: World) => (w.get(Rail, railId(w))!.pack ? PACK.carry : T1.carry);
export const free = (w: World, a: Readonly<AccountRow>) => (heldBig(w, a) ? 0 : Math.max(0, carryMax(w) - carried(a)));
/** Pile kinds: 0 logs, 1 stone, 2 rails, 3 a footing (one to a pile, one to a back). */
export const FOOT = 3;
/** What a back can take of a kind: a footing only onto an empty back. */
export const roomFor = (w: World, a: Readonly<AccountRow>, kind: number) =>
  kind === FOOT ? Number(!heldBig(w, a) && carried(a) === 0) : free(w, a);
export const qCompleted = (w: World) => LINE2_STATIONS.filter((_s, k) => w.get(QJob, qjob(w, k))!.completion).length;
/** The stops line k serves now (trainStops): line 2's pier once Q6 is laid. */
export const stopsOf = (w: World, k: number) => trainStopsOf(k, pierLaid(qCompleted(w)));
export const worksId = (w: World) => w.single(Works);
export const shedId = (w: World) => w.single(Shed);
/** The Q station taking materials now, or -1 before the forge is lit / after Q3 (line2Active). */
export function railLine2Active(w: World) {
  return qActive(w);
}
export function qActive(w: World) {
  if (w.get(Forge, forgeId(w))!.lit < 0) return -1;
  return LINE2_STATIONS.findIndex((_s, k) => !w.get(QJob, qjob(w, k))!.completion);
}
/** Station 6 waits for the train (docs/plans/boiler-first-choice.md, step 3; owner, 9 November): while the active
 * stretch is train-fed and trains don't run, its kit is the train's, so the frame takes nothing by hand and the forge
 * rack gives no rails (they stay for the kit). The view's `trainOwed` (src/entities/railway/forge-offer.ts) mirrors it. */
export const trainOwed = (w: World) => {
  const k = qActive(w);
  return k >= 0 && LINE2_STATIONS[k]!.feed === 'train' && w.get(Rail, railId(w))!.trains < 0;
};
export const timingOf = (t: LineTiming) => Object.fromEntries(TIMING_KEYS.map((k) => [k, t[k]])) as LineTiming;
export const scheduleOf = (spec: (typeof LINE1_STATIONS)[number] | (typeof LINE2_STATIONS)[number], j: LineTiming) =>
  lineSchedule(spec, timingOf(j));
export function gateDown(w: World, spec: Line2Station) {
  const rail = w.get(Rail, railId(w))!;
  return !spec.gate || (spec.gate === 'quarry' ? rail.lever : rail.sea);
}
/** What the depot still owes stretch k: logs to mint at the camp (a stretch's output is capped at its bill, so logs
 * taken from the rack and dropped elsewhere are not replaced) and the rails its shelf is still owed (rails on a back are
 * not brought again: the cart moves at most the stretch's rail bill, shelfOut). Counts what the cart has aboard. */
export function depotNeed(w: World, k: number, j: Readonly<{ stock: number; railStock: number }>) {
  const spec = LINE2_STATIONS[k]!,
    rail = w.get(Rail, railId(w))!,
    cart = w.get(Cart, cartId(w))!;
  const logs = Math.max(
    0,
    Math.min(spec.bill[0] - j.stock - rail.depot - cart.logs - aboard(w, 'logs'), spec.bill[0] - rail[DEPOT_OUT[k]!]),
  );
  const rails = spec.shelf
    ? Math.max(
        0,
        Math.min(
          spec.bill[1] - j.railStock - rail.depotRails - cart.rails - aboard(w, 'rails'),
          spec.bill[1] - rail.shelfOut,
        ),
      )
    : 0;
  return { logs, rails };
}
/** The stretch the cart serves now (a depot stretch not yet funded), or -1. */
export function cartServing(w: World) {
  const k = qActive(w);
  if (k < 0 || !LINE2_STATIONS[k]!.depot || LINE2_STATIONS[k]!.feed === 'train') return -1;
  return w.get(QJob, qjob(w, k))!.start < 0 ? k : -1;
}
/** The rails the cart still wants at the forge stop for the stretch it serves (k), up to what it holds. */
export function cartWants(w: World, k: number) {
  if (k < 0 || !LINE2_STATIONS[k]!.shelf) return 0;
  const { rails } = depotNeed(w, k, w.get(QJob, qjob(w, k))!);
  return Math.min(CART.rails - w.get(Cart, cartId(w))!.rails, rails);
}
// ---------------------------------------------------------------- the job clocks and the facts views read (M8)
// The facts below are the world twins of the read model's (`railJobs`, `railCounts`, ... on a `Railway`): same names, a
// world first. A fact that reads a job's timed fields (elapsed, used, allocation and the second material's pair) takes
// an optional `at`: absent, it reads the run rows the rule tick advances (the server's world, a seed, a test); given, it
// reads the job clock at that tick (jobProgress), which is what a client's mirror and its predicted clones hold, since
// their run rows never move.
type Station = (typeof LINE1_STATIONS)[number] | (typeof LINE2_STATIONS)[number];
export type JobRunRow = RowOf<typeof JobRun>;
export type QJobRunRow = RowOf<typeof QJobRun>;
// One schedule per station and timing (the mirror kept the same cache per job clock): a query never re-solves it.
const schedules = new WeakMap<Station, { key: string; schedule: ReturnType<typeof lineSchedule> }>();
function scheduleFor(spec: Station, j: LineTiming) {
  const key = TIMING_KEYS.map((k) => j[k]).join(',');
  const hit = schedules.get(spec);
  if (hit?.key === key) return hit.schedule;
  const schedule = scheduleOf(spec, j);
  schedules.set(spec, { key, schedule });
  return schedule;
}
/** A job's timed fields at `tick`, as the rule tick would leave them, from its Job or QJob row alone: elapsed is
 * `tick - start + ahead` up to the schedule's total, a completed job has used its whole bill and stopped at `end`, an
 * unfunded one is all zero. The same arithmetic as the tick (layProgress). Never writes. */
export function jobProgress(w: World, c: typeof Job, id: number, tick: number): JobRunRow;
export function jobProgress(w: World, c: typeof QJob, id: number, tick: number): QJobRunRow;
export function jobProgress(w: World, c: typeof Job | typeof QJob, id: number, tick: number) {
  const j = w.get(c, id)!;
  const spec: Station = c === Job ? LINE1_STATIONS[j.slot]! : LINE2_STATIONS[j.slot]!;
  let elapsed = 0,
    lastTick = 0,
    used = 0,
    allocation = 0,
    used2 = 0,
    allocation2 = 0;
  if (j.start >= 0) {
    const schedule = scheduleFor(spec, j);
    if (j.completion) {
      [elapsed, lastTick, used, used2] = [schedule.totalTicks, j.end, spec.bill[0], spec.bill[1]];
    } else {
      elapsed = Math.min(schedule.totalTicks, Math.max(0, tick - j.start + j.ahead));
      lastTick = Math.max(j.start, tick);
      ({ used, allocation, used2, allocation2 } = layProgress(spec, schedule, elapsed));
    }
  }
  return c === Job
    ? { allocation, used, stoneAllocation: allocation2, stoneUsed: used2, elapsed, lastTick }
    : { allocation, railAllocation: allocation2, used, railUsed: used2, elapsed, lastTick };
}
/** A line-one job: its row and its timed fields (the run row, or the clock at `at`). */
export type JobRead = { id: number; job: Readonly<RowOf<typeof Job>>; run: Readonly<JobRunRow> };
export type QJobRead = { id: number; job: Readonly<RowOf<typeof QJob>>; run: Readonly<QJobRunRow> };
// A client's worlds (the mirror's, and each predicted clone of it) hold run rows that never move: a timed fact read on
// one without `at` would answer with no progress at all, so it throws instead (review of M8, P3).
const clockWorlds = new WeakSet<object>();
/** Mark a world whose job clocks are its Job/QJob rows alone (a mirror's, a predicted clone): timed facts need `at`. */
export function clockWorld<W extends object>(w: W): W {
  clockWorlds.add(w);
  return w;
}
/** A copy of w, marked as w is (a predicted clone of a mirror's world is a client's world too). */
export function cloneWorld(w: World): World {
  const copy = w.clone();
  return clockWorlds.has(w) ? clockWorld(copy) : copy;
}
const NEEDS_AT = "railway: a client's world needs the tick (at) for a timed fact";
/** A job read: the rows, the run row (no `at`) or the clock at `at`. On a client's world without `at` its `run` throws
 * when read, so a fact that reads only the Job/QJob row still works and a timed one never answers with nothing. */
function jobRead<C extends typeof Job | typeof QJob>(
  w: World,
  c: C,
  run: typeof JobRun | typeof QJobRun,
  id: number,
  at?: number,
) {
  const row = w.get(c, id)!;
  if (at !== undefined) return { id, job: row, run: jobProgress(w, c as typeof Job, id, at) };
  if (!clockWorlds.has(w)) return { id, job: row, run: w.get(run, id)! };
  return {
    id,
    job: row,
    get run(): never {
      throw new Error(NEEDS_AT);
    },
  };
}
/** Line one's jobs, T1 to T3 (railJobs). */
export const railJobs = (w: World, at?: number): JobRead[] =>
  LINE1_STATIONS.map((_s, slot) => jobRead(w, Job, JobRun, job(w, slot), at) as JobRead);
/** Line two's jobs, Q1 to Q6. */
export const line2Jobs = (w: World, at?: number): QJobRead[] =>
  LINE2_STATIONS.map((_s, slot) => jobRead(w, QJob, QJobRun, qjob(w, slot), at) as QJobRead);
/** The line-one station taking materials now (activeStation). */
export const railActiveStation = activeStation;
/** The line-one job taking materials now. */
export const railCurrentJob = (w: World, at?: number) => railJobs(w, at)[activeStation(w)]!;
/** A player's account row, or undefined. */
export const railAccount = (w: World, pid: string) => {
  const id = w.lookup(Account, pid);
  return id === undefined ? undefined : w.get(Account, id)!;
};
/** What a back carries (carryMax). */
export const railCarryMax = carryMax;

/** Footings the pier still needs that are neither set, racked there, nor aboard the wagon (`aboard`). */
export function pierOwed(w: World, aboard: number) {
  const works = w.get(Works, worksId(w))!;
  return WORKS.pier - works.pierSet - works.pierRack - aboard;
}
/** Q6's kit is still owed to Far Head and none of it is aboard: the train must go home to the village to load it. */
export function kitOwed(w: World, r: Readonly<RailTrain>) {
  if (r.logs + r.rails > 0 || qActive(w) !== 5) return false;
  const j = w.get(QJob, qjob(w, 5))!;
  if (j.start >= 0) return false;
  const need = depotNeed(w, 5, j);
  return need.logs > 0 || need.rails > 0;
}
