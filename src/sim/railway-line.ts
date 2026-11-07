// Line one's shapes and read helpers on the read model; its rules are systems in ./railway-systems.ts.
import type { RailAccount, Railway } from './railway.ts';
import { LINE1_STATIONS, LINE1_RAIL_PAIRS, lineBeamGround } from './railway-line-layout.ts';
import { RAILWAY_T1 as T1 } from './railway-layout.ts';
import { lineSchedule, linePanelCount, type LineTiming } from './railway-line-schedule.ts';

export const LINE_TIMING: Readonly<LineTiming> = {
  depositMs: 320,
  feedIntervalMs: 70,
  logFlightMs: 550,
  stoneFlightMs: 450,
  beamFlightMs: 900,
  cruiseCmPerTick: 50,
  departureTicks: 20,
};
export type RailJob = {
  stock: number;
  allocation: number;
  used: number;
  delivered: number;
  start: number;
  elapsed: number;
  lastTick: number;
  completion: number;
  stoneStock: number;
  stoneAllocation: number;
  stoneUsed: number;
  stoneDelivered: number;
  timing: LineTiming;
};
export type RailBeam = {
  state: 'standing' | 'available' | 'held' | 'ground' | 'allocated' | 'used';
  work: number;
  holder: string;
  epoch: number;
  revision: number;
  x: number;
  y: number;
  z: number;
  age: number;
};
export type RailLine = {
  jobs: [RailJob, RailJob];
  axe: boolean;
  jump: boolean;
  rocks: number[];
  rockWork: number[];
  rockAge: number[];
  stoneRack: number;
  stoneProduced: number;
  upgrades: boolean[];
  hardwood: number[];
  hardwoodWork: number[];
  beam: RailBeam;
};
export const railCarry = (a: RailAccount) => a.carry + (a.stone ?? 0) + (a.rails ?? 0);
export const railJobs = (s: Railway): (RailJob | Railway)[] => (s.line ? [s, ...s.line.jobs] : [s]);
export const railActiveStation = (s: Railway) =>
  s.line ? (!s.completion ? 0 : !s.line.jobs[0].completion ? 1 : 2) : 0;
export const railCurrentJob = (s: Railway) => railJobs(s)[railActiveStation(s)]!;
export const railActiveJob = railCurrentJob;
export const railMaxDuration = (s: Railway) =>
  s.line
    ? lineSchedule(LINE1_STATIONS[railActiveStation(s)]!, railCurrentJob(s).timing ?? LINE_TIMING).totalTicks
    : T1.depositTicks + T1.feedTicks + T1.layTicks;
export const railLineOpen = (s: Railway) => !!s.line?.jobs[1].completion;
/** Rail pairs laid on line one. The original twelve stock units belong to the entire line and lay a pair at a time;
 * no receiver issues a replacement magazine. */
export const railPanelCount = (s: Railway) =>
  s.line
    ? railJobs(s).reduce(
        (count, job, index) =>
          count + (job.start < 0 ? 0 : linePanelCount(LINE1_STATIONS[index]!, job.elapsed, job.timing!)),
        0,
      )
    : 0;
/** Rail pairs still on the machine's stack. */
export const railPanelStock = (s: Railway) => LINE1_RAIL_PAIRS - railPanelCount(s);
/** Whether a stroke at the great tree bites (wake aside): Station 3 is open, unfunded, and the tree still stands. A
 * client checks it before sending, so a stroke the rule would refuse rebounds on the next frame ("a swing always
 * answers", 3 November). */
export const railBeamChoppable = (s: Railway) =>
  !!s.line && railActiveStation(s) === 2 && s.line.jobs[1].start < 0 && s.line.beam.state === 'standing';
/** The proper axe is the lit forge's first made thing (owner, 7 November: the great beam pass). */
export const railAxeAvailable = (s: Railway) => !!s.line && !!s.line2 && s.line2.forge.lit >= 0 && !s.line.axe;
const int = (v: unknown, max = 2147483647, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
const FIELDS = [
  'stock',
  'allocation',
  'used',
  'delivered',
  'start',
  'elapsed',
  'lastTick',
  'completion',
  'stoneStock',
  'stoneAllocation',
  'stoneUsed',
  'stoneDelivered',
] as const;
/** Whole-document invariants of line one on the read model; throws on the first broken one. */
export function validateRailLine(s: Railway) {
  const l = s.line!;
  if (!s.falls || !s.supply) throw new Error('railway: line requires playable state');
  const jobs = railJobs(s);
  jobs.forEach((job, index) => {
    const spec = LINE1_STATIONS[index]!;
    if (!job.timing) throw new Error('railway: missing funded timing');
    const schedule = lineSchedule(spec, job.timing);
    for (const key of FIELDS) {
      const n = job[key] ?? 0;
      if (!int(n, key === 'completion' ? 1 : 2147483647, key === 'start' ? -1 : 0))
        throw new Error('railway: job bounds');
    }
    if (job.elapsed > schedule.totalTicks || job.stock > spec.bill[0] || (job.stoneStock ?? 0) > spec.bill[1])
      throw new Error('railway: job bounds');
    if (
      index > 0 &&
      !jobs[index - 1]!.completion &&
      (job.start >= 0 || job.delivered > 0 || (job.stoneDelivered ?? 0) > 0)
    )
      throw new Error('railway: ordered stations');
    if (job.start < 0) {
      if (
        job.allocation ||
        job.used ||
        job.elapsed ||
        job.completion ||
        (job.stoneAllocation ?? 0) ||
        (job.stoneUsed ?? 0) ||
        job.stock !== job.delivered ||
        (job.stoneStock ?? 0) !== (job.stoneDelivered ?? 0)
      )
        throw new Error('railway: unfunded job');
      if (job.stock === spec.bill[0] && (job.stoneStock ?? 0) === spec.bill[1] && !spec.beam)
        throw new Error('railway: unstarted full job');
    } else {
      const fraction = Math.max(0, job.elapsed - schedule.depositTicks - schedule.feedTicks) / schedule.layTicks;
      if (
        s.awake < 0 ||
        job.start < s.awake + 31 ||
        job.lastTick < job.start ||
        job.stock ||
        (job.stoneStock ?? 0) ||
        job.delivered !== spec.bill[0] ||
        (job.stoneDelivered ?? 0) !== spec.bill[1] ||
        job.used !== Math.min(spec.bill[0], Math.floor(fraction * spec.bill[0])) ||
        (job.stoneUsed ?? 0) !== Math.min(spec.bill[1], Math.floor(fraction * spec.bill[1])) ||
        job.allocation + job.used !== spec.bill[0] ||
        (job.stoneAllocation ?? 0) + (job.stoneUsed ?? 0) !== spec.bill[1] ||
        job.completion !== Number(job.elapsed === schedule.totalTicks)
      )
        throw new Error('railway: funded job');
    }
  });
  if (l.axe && !(s.line2 && s.line2.forge.lit >= 0)) throw new Error('railway: axe before the forge');
  if (
    s.sources.some((n, k) => n > (l.upgrades[k] ? 15 : 10)) ||
    s.work.some((n) => !int(n, 15)) ||
    l.upgrades.some((v) => v && !l.axe)
  )
    throw new Error('railway: upgraded source');
  if (l.rocks.some((n, k) => (n > 0 && l.rockAge[k] !== 0) || 8 - n > 2 * l.rockWork[k]! || 8 - n < l.rockWork[k]!))
    throw new Error('railway: rock work');
  if (l.hardwood.some((n, k) => 15 - n > l.hardwoodWork[k]! || l.hardwoodWork[k]! % 5 !== 0))
    throw new Error('railway: hardwood work');
  const stone =
    l.rocks.reduce((a, b) => a + b, 0) +
    s.accounts.reduce((n, a) => n + (a.stone ?? 0), 0) +
    s.piles.reduce((n, p) => n + (p.kind === 1 ? p.n : 0), 0) +
    l.stoneRack +
    jobs.reduce((n, j) => n + (j.stoneStock ?? 0) + (j.stoneAllocation ?? 0) + (j.stoneUsed ?? 0), 0);
  if (stone !== 24 + l.stoneProduced) throw new Error('railway: stone conservation');
  const b = l.beam;
  if (b.state === 'ground' ? !lineBeamGround(b.x, b.y, b.z) : b.age !== 0) throw new Error('railway: beam ground');
  if (b.state === 'standing' ? b.work >= 12 : b.work !== 12) throw new Error('railway: beam work');
  if (b.work && !l.jobs[0].completion) throw new Error('railway: beam work before T3');
  if (b.state === 'held') {
    const a = s.accounts.find((a) => a.pid === b.holder);
    if (!a || b.epoch < 1 || b.epoch > a.epoch || railCarry(a) !== 0) throw new Error('railway: beam holder');
  } else if (b.holder || b.epoch) throw new Error('railway: beam orphan identity');
  // The beam may be laid before the 40 logs: allocated with the job unfunded, never with its bill already full.
  const laid = b.state === 'allocated' || b.state === 'used';
  if (
    (l.jobs[1].start >= 0 && !laid) ||
    (l.jobs[1].start < 0 && (b.state === 'used' || (laid && l.jobs[1].stock === 40))) ||
    (b.state === 'used') !== !!l.jobs[1].completion
  )
    throw new Error('railway: beam allocation');
}
