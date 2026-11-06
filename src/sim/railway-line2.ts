// Line two's deterministic accounts: the forge, its rails, Q1-Q3, the depot rack, the quarry lever and the hook device.
// Plain typed rows in id order. Every transfer is one atomic apply; flights and racks only display the result.
import type { RailAccount, RailAction, Railway } from './railway.ts';
import { RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE2_FORGE as FORGE, LINE2_STATIONS, LINE2_DEPOT as DEPOT, RAILS } from './railway-line2-layout.ts';
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
  depotProduced: number;
  depotLast: number;
  lever: boolean;
  hook: boolean;
};
const newJob = (timing: LineTiming): RailQJob => ({
  stock: 0,
  railStock: 0,
  allocation: 0,
  railAllocation: 0,
  used: 0,
  railUsed: 0,
  delivered: 0,
  railDelivered: 0,
  start: -1,
  elapsed: 0,
  lastTick: 0,
  completion: 0,
  timing: { ...timing },
});
export const createRailLine2 = (timing: LineTiming): RailLine2 => ({
  forge: { used: 0, lit: -1, rack: 0, poured: 0, lastPour: 0 },
  jobs: LINE2_STATIONS.map(() => newJob(timing)),
  depot: 0,
  depotProduced: 0,
  depotLast: -1,
  lever: false,
  hook: false,
});
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
const free = (s: Railway, a: RailAccount) => {
  const held = s.line?.beam.state === 'held' && s.line.beam.holder === a.pid;
  return held ? 0 : Math.max(0, T1.carry - (a.carry + (a.stone ?? 0) + (a.rails ?? 0)));
};
function fund(job: RailQJob, k: number, tick: number, timing: LineTiming) {
  const spec = LINE2_STATIONS[k]!;
  if (job.start >= 0 || job.stock !== spec.bill[0] || job.railStock !== spec.bill[1]) return;
  job.stock = job.railStock = 0;
  job.allocation = spec.bill[0];
  job.railAllocation = spec.bill[1];
  job.start = job.lastTick = tick;
  // Each stretch pins the room's timing when funded; Q2/Q3 lay faster, as in Place.
  job.timing = { ...timing, cruiseCmPerTick: Math.max(1, Math.floor((timing.cruiseCmPerTick * spec.speed) / 100)) };
}
/** Returns the accepted amount. Line one's own ops never reach these branches. */
export function railLine2Apply(s: Railway, a: RailAccount, e: RailAction, tick: number, timing: LineTiming): number {
  const l = s.line2;
  if (!l) return 0;
  const room = free(s, a);
  if (e.op === 'rail.deposit' && e.station === 'F' && (e.kind ?? 0) === 0 && line2Open(s)) {
    const n = Math.min(e.n!, a.carry, FORGE.logs - l.forge.used);
    if (n <= 0) return 0;
    a.carry -= n;
    l.forge.used += n;
    if (l.forge.used === FORGE.logs) l.forge.lit = l.forge.lastPour = tick;
    return n;
  }
  const k = line2Active(s);
  if (
    e.op === 'rail.deposit' &&
    k >= 0 &&
    e.station === LINE2_STATIONS[k]!.id &&
    tick >= l.forge.lit + FORGE.turnTicks
  ) {
    const job = l.jobs[k]!,
      spec = LINE2_STATIONS[k]!;
    if (job.start >= 0) return 0;
    const rails = e.kind === RAILS;
    if (e.kind !== undefined && e.kind !== 0 && !rails) return 0;
    const n = Math.min(
      e.n!,
      rails ? (a.rails ?? 0) : a.carry,
      spec.bill[rails ? 1 : 0] - (rails ? job.railStock : job.stock),
    );
    if (n <= 0) return 0;
    if (rails) {
      a.rails = (a.rails ?? 0) - n;
      job.railStock += n;
      job.railDelivered += n;
    } else {
      a.carry -= n;
      job.stock += n;
      job.delivered += n;
    }
    fund(job, k, tick, timing);
    return n;
  }
  if (e.op === 'rail.forgeTake' && room > 0) {
    const n = Math.min(l.forge.rack, room);
    l.forge.rack -= n;
    a.rails = (a.rails ?? 0) + n;
    return n;
  }
  if (e.op === 'rail.depotTake' && room > 0) {
    const n = Math.min(l.depot, room);
    l.depot -= n;
    a.carry += n;
    return n;
  }
  // Before Q3 the drive is uncoupled: a pull does nothing, even from a jump onto the apron.
  if (e.op === 'rail.lever' && line2Completed(s) >= 3 && !l.lever) {
    l.lever = true;
    return 1;
  }
  if (e.op === 'rail.hook' && line2Completed(s) >= 2 && !l.hook) {
    l.hook = true;
    return 1;
  }
  return 0;
}
export function railLine2Tick(s: Railway, tick: number) {
  const l = s.line2;
  if (!l) return;
  const f = l.forge;
  if (f.lit >= 0) {
    while (f.rack < FORGE.rackMax && tick - f.lastPour >= FORGE.pourTicks) {
      f.rack++;
      f.poured++;
      f.lastPour += FORGE.pourTicks;
    }
    if (f.rack >= FORGE.rackMax) f.lastPour = tick;
  }
  const k = line2Active(s);
  if (k < 0) return;
  const job = l.jobs[k]!,
    spec = LINE2_STATIONS[k]!;
  // The depot runs from Q1's completion while a rack-fed stretch still needs logs.
  if (spec.depot && job.start < 0) {
    if (l.depotLast < 0) l.depotLast = tick;
    const need = spec.bill[0] - job.stock - l.depot;
    if (need > 0 && tick - l.depotLast >= DEPOT.everyTicks) {
      const n = Math.min(DEPOT.load, need);
      l.depot += n;
      l.depotProduced += n;
      l.depotLast = tick;
    } else if (need <= 0) l.depotLast = tick;
  }
  if (job.start < 0 || job.completion) return;
  const schedule = line2Schedule(k, job);
  job.elapsed = Math.min(schedule.totalTicks, job.elapsed + Math.max(0, tick - job.lastTick));
  job.lastTick = tick;
  const laying = Math.max(0, job.elapsed - schedule.depositTicks - schedule.feedTicks);
  job.used = Math.min(spec.bill[0], Math.floor((laying * spec.bill[0]) / schedule.layTicks));
  job.allocation = spec.bill[0] - job.used;
  job.railUsed = Math.min(spec.bill[1], Math.floor((laying * spec.bill[1]) / schedule.layTicks));
  job.railAllocation = spec.bill[1] - job.railUsed;
  if (job.elapsed === schedule.totalTicks) job.completion = 1;
}
/** Bounded catch-up for the funded stretch only; the forge and depot never produce offline. */
export function railLine2Resume(s: Railway, ticks: number, tick: number) {
  const k = line2Active(s);
  if (k < 0) return 0;
  const job = s.line2!.jobs[k]!;
  if (job.start < 0 || job.completion) return 0;
  const n = Math.min(ticks, line2Schedule(k, job).totalTicks - job.elapsed);
  job.elapsed += n;
  railLine2Tick(s, tick);
  return n;
}
export const line2Logs = (l: RailLine2) =>
  l.forge.used + l.depot + l.jobs.reduce((n, j) => n + j.stock + j.allocation + j.used, 0);
export const line2Rails = (s: Railway) =>
  (s.line2?.forge.rack ?? 0) +
  s.accounts.reduce((n, a) => n + (a.rails ?? 0), 0) +
  s.piles.reduce((n, p) => n + (p.kind === RAILS ? p.n : 0), 0) +
  (s.line2?.jobs.reduce((n, j) => n + j.railStock + j.railAllocation + j.railUsed, 0) ?? 0);

// ---------------------------------------------------------------- durable shape
const FIELDS = [
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
const CLOCK = [
  'depositMs',
  'feedIntervalMs',
  'logFlightMs',
  'stoneFlightMs',
  'beamFlightMs',
  'cruiseCmPerTick',
  'departureTicks',
] as const;
export type RailLine2JSON = { f: number[]; j: number[][]; d: number[]; v: number; h: number };
export const saveRailLine2 = (l: RailLine2): RailLine2JSON => ({
  f: [l.forge.used, l.forge.lit, l.forge.rack, l.forge.poured, l.forge.lastPour],
  j: l.jobs.map((j) => [...FIELDS.map((k) => j[k]), ...CLOCK.map((k) => j.timing[k])]),
  d: [l.depot, l.depotProduced, l.depotLast],
  v: Number(l.lever),
  h: Number(l.hook),
});
const int = (v: unknown, max = 2147483647, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
export function loadRailLine2(value: unknown): RailLine2 {
  const j = value as RailLine2JSON | null;
  if (
    !j ||
    typeof j !== 'object' ||
    Array.isArray(j) ||
    Object.keys(j).sort().join() !== 'd,f,h,j,v' ||
    !Array.isArray(j.f) ||
    j.f.length !== 5 ||
    !Array.isArray(j.d) ||
    j.d.length !== 3 ||
    !Array.isArray(j.j) ||
    j.j.length !== LINE2_STATIONS.length ||
    j.j.some(
      (row) =>
        !Array.isArray(row) || row.length !== FIELDS.length + CLOCK.length || row.some((n) => !int(n, 2147483647, -1)),
    ) ||
    !int(j.v, 1) ||
    !int(j.h, 1)
  )
    throw new Error('railway: line2 encoding');
  const [used, lit, rack, poured, lastPour] = j.f;
  const [depot, depotProduced, depotLast] = j.d;
  if (
    !int(used, FORGE.logs) ||
    !int(lit, 2147483647, -1) ||
    !int(rack, 4096) ||
    !int(poured) ||
    !int(lastPour) ||
    !int(depot, 64) ||
    !int(depotProduced) ||
    !int(depotLast, 2147483647, -1)
  )
    throw new Error('railway: line2 bounds');
  return {
    forge: { used, lit, rack, poured, lastPour },
    jobs: j.j.map((row) => {
      const job = {} as RailQJob;
      FIELDS.forEach((key, i) => (job[key] = row[i]!));
      job.timing = Object.fromEntries(CLOCK.map((key, i) => [key, row[FIELDS.length + i]!])) as LineTiming;
      return job;
    }),
    depot,
    depotProduced,
    depotLast,
    lever: !!j.v,
    hook: !!j.h,
  };
}
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
    for (const key of FIELDS)
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
  if (l.depot > l.depotProduced) throw new Error('railway: depot stock');
  if (l.lever && line2Completed(s) < 3) throw new Error('railway: lever before Q3');
  if (l.hook && line2Completed(s) < 2) throw new Error('railway: hook before Q2');
  if (line2Rails(s) !== f.poured) throw new Error('railway: rail conservation');
}
