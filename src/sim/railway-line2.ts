// Line two's shapes, read helpers and invariants on the read model: the forge, its rails, Q1-Q3, the depot rack, the
// quarry lever and the hook device. Its rules are systems in ./railway-systems.ts.
import type { Railway } from './railway.ts';
import { LINE2_FORGE as FORGE, LINE2_STATIONS, RAILS } from './railway-line2-layout.ts';
import { lineSchedule, type LineTiming } from './railway-line-schedule.ts';

export type RailForge = { used: number; lit: number; rack: number; poured: number; lastPour: number };
export type RailQJob = {
  stock: number;
  railStock: number;
  allocation: number;
  railAllocation: number;
  used: number;
  railUsed: number;
  delivered: number;
  railDelivered: number;
  start: number;
  elapsed: number;
  lastTick: number;
  completion: number;
  timing: LineTiming;
};
export type RailLine2 = {
  forge: RailForge;
  jobs: RailQJob[];
  depot: number;
  /** Total minted by the depot; always the sum of `depotOut`. */
  depotProduced: number;
  depotLast: number;
  /** Depot logs minted for each stretch, in station order; never more than that stretch's log bill. */
  depotOut: number[];
  lever: boolean;
  hook: boolean;
};
/** The first path (T3) is open: the forge frame takes logs. */
export const line2Open = (s: Railway) => !!s.line?.jobs[1].completion;
export const line2Lit = (s: Railway) => !!s.line2 && s.line2.forge.lit >= 0;
/** Completed Q stretches, 0-3. */
export const line2Completed = (s: Railway) => s.line2?.jobs.filter((j) => j.completion).length ?? 0;
/** The Q station that takes materials now, or -1 before the forge is lit / after Q3. */
export const line2Active = (s: Railway) => {
  if (!line2Lit(s)) return -1;
  const k = s.line2!.jobs.findIndex((j) => !j.completion);
  return k;
};
/** The quarry gate is down only with Q3 complete and the lever pulled. */
export const line2GateOpen = (s: Railway) => line2Completed(s) >= 3 && !!s.line2?.lever;
export const line2Schedule = (k: number, job: RailQJob) => lineSchedule(LINE2_STATIONS[k]!, job.timing);
export const line2Logs = (l: RailLine2) =>
  l.forge.used + l.depot + l.jobs.reduce((n, j) => n + j.stock + j.allocation + j.used, 0);
export const line2Rails = (s: Railway) =>
  (s.line2?.forge.rack ?? 0) +
  s.accounts.reduce((n, a) => n + (a.rails ?? 0), 0) +
  s.piles.reduce((n, p) => n + (p.kind === RAILS ? p.n : 0), 0) +
  (s.line2?.jobs.reduce((n, j) => n + j.railStock + j.railAllocation + j.railUsed, 0) ?? 0);

// ---------------------------------------------------------------- invariants on the read model
const JOB_FIELDS = [
  'stock',
  'railStock',
  'allocation',
  'railAllocation',
  'used',
  'railUsed',
  'delivered',
  'railDelivered',
  'start',
  'elapsed',
  'lastTick',
  'completion',
] as const;
const int = (v: unknown, max = 2147483647, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
/** Whole-document invariants; throws before any live state is replaced. */
export function validateRailLine2(s: Railway) {
  const l = s.line2!;
  const f = l.forge;
  if ((f.used > 0 || f.lit >= 0) && !line2Open(s)) throw new Error('railway: forge before path');
  if (f.lit >= 0 !== (f.used === FORGE.logs)) throw new Error('railway: forge lit');
  if (f.lit < 0 && (f.rack || f.poured || f.lastPour)) throw new Error('railway: unlit pour');
  if (f.lit >= 0 && f.lastPour < f.lit) throw new Error('railway: pour clock');
  l.jobs.forEach((job, k) => {
    const spec = LINE2_STATIONS[k]!;
    for (const key of JOB_FIELDS)
      if (!int(job[key], key === 'completion' ? 1 : 2147483647, key === 'start' ? -1 : 0))
        throw new Error('railway: line2 job bounds');
    const schedule = line2Schedule(k, job);
    if (job.elapsed > schedule.totalTicks || job.stock > spec.bill[0] || job.railStock > spec.bill[1])
      throw new Error('railway: line2 job bounds');
    const before = k === 0 ? f.lit >= 0 : !!l.jobs[k - 1]!.completion;
    if (!before && (job.start >= 0 || job.delivered > 0 || job.railDelivered > 0))
      throw new Error('railway: line2 ordered stations');
    if (job.start < 0) {
      if (
        job.allocation ||
        job.used ||
        job.railAllocation ||
        job.railUsed ||
        job.elapsed ||
        job.completion ||
        job.stock !== job.delivered ||
        job.railStock !== job.railDelivered ||
        (job.stock === spec.bill[0] && job.railStock === spec.bill[1])
      )
        throw new Error('railway: line2 unfunded job');
    } else {
      const fraction = Math.max(0, job.elapsed - schedule.depositTicks - schedule.feedTicks) / schedule.layTicks;
      if (
        job.start < f.lit ||
        job.lastTick < job.start ||
        job.stock ||
        job.railStock ||
        job.delivered !== spec.bill[0] ||
        job.railDelivered !== spec.bill[1] ||
        job.used !== Math.min(spec.bill[0], Math.floor(fraction * spec.bill[0])) ||
        job.railUsed !== Math.min(spec.bill[1], Math.floor(fraction * spec.bill[1])) ||
        job.allocation + job.used !== spec.bill[0] ||
        job.railAllocation + job.railUsed !== spec.bill[1] ||
        job.completion !== Number(job.elapsed === schedule.totalTicks)
      )
        throw new Error('railway: line2 funded job');
    }
  });
  if ((l.depot || l.depotProduced || l.depotLast >= 0) && !l.jobs[0]!.completion)
    throw new Error('railway: early depot');
  if (
    l.depotOut.length !== LINE2_STATIONS.length ||
    l.depotOut.some((n, k) => !int(n, LINE2_STATIONS[k]!.bill[0]) || (n > 0 && !LINE2_STATIONS[k]!.depot)) ||
    l.depotOut.reduce((a, b) => a + b, 0) !== l.depotProduced
  )
    throw new Error('railway: depot output');
  if (l.depot > l.depotProduced) throw new Error('railway: depot stock');
  if (l.lever && line2Completed(s) < 3) throw new Error('railway: lever before Q3');
  if (l.hook && line2Completed(s) < 2) throw new Error('railway: hook before Q2');
  if (line2Rails(s) !== f.poured) throw new Error('railway: rail conservation');
}
