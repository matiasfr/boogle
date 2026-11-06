// Line one's deterministic material and singleton authority. Legacy T1 keeps its original path.
import type { RailAccount, RailAction, Railway } from './railway.ts';
import { LINE1_STATIONS, LINE1_GREAT_TREE, lineBeamGround } from './railway-line-layout.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from './railway-layout.ts';
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
const newJob = (): RailJob => ({
  stock: 0,
  allocation: 0,
  used: 0,
  delivered: 0,
  start: -1,
  elapsed: 0,
  lastTick: 0,
  completion: 0,
  stoneStock: 0,
  stoneAllocation: 0,
  stoneUsed: 0,
  stoneDelivered: 0,
  timing: { ...LINE_TIMING },
});
export const createRailLine = (): RailLine => ({
  jobs: [newJob(), newJob()],
  axe: false,
  jump: false,
  rocks: [8, 8, 8],
  rockWork: [0, 0, 0],
  rockAge: [0, 0, 0],
  stoneRack: 0,
  stoneProduced: 0,
  upgrades: RAILWAY_SOURCES.map(() => false),
  hardwood: [15, 15],
  hardwoodWork: [0, 0],
  beam: {
    state: 'standing',
    work: 0,
    holder: '',
    epoch: 0,
    revision: 0,
    x: LINE1_GREAT_TREE.x,
    y: 3000,
    z: LINE1_GREAT_TREE.z,
    age: 0,
  },
});
export const railCarry = (a: RailAccount) => a.carry + (a.stone ?? 0) + (a.rails ?? 0);
/** Balance of one material kind: 0 logs, 1 stone, 2 rails. */
const balanceOf = (a: RailAccount, kind: number) => (kind === 1 ? (a.stone ?? 0) : kind === 2 ? (a.rails ?? 0) : a.carry);
function credit(a: RailAccount, kind: number, n: number) {
  if (kind === 1) a.stone = (a.stone ?? 0) + n;
  else if (kind === 2) a.rails = (a.rails ?? 0) + n;
  else a.carry += n;
}
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
/** The original twelve units belong to the entire line. No receiver issues a replacement magazine. */
export const railPanelCount = (s: Railway) =>
  s.line
    ? railJobs(s).reduce(
        (count, job, index) =>
          count + (job.start < 0 ? 0 : linePanelCount(LINE1_STATIONS[index]!, job.elapsed, job.timing!)),
        0,
      )
    : 0;
export const railPanelStock = (s: Railway) => T1.starterRails - railPanelCount(s);
export const railAxeAvailable = (s: Railway) =>
  !!s.line && railActiveStation(s) === 2 && s.line.jobs[1].stock === 40 && !s.line.axe;
export function railBeamRelease(s: Railway, pid: string, epoch: number, revision: number): number {
  const b = s.line?.beam;
  if (
    !b ||
    b.state !== 'held' ||
    b.holder !== pid ||
    b.epoch !== epoch ||
    b.revision !== revision ||
    b.revision >= 2147483647
  )
    return 0;
  b.state = 'available';
  b.holder = '';
  b.epoch = 0;
  b.revision++;
  b.age = 0;
  b.x = LINE1_GREAT_TREE.x;
  b.y = 3000;
  b.z = LINE1_GREAT_TREE.z;
  return 1;
}
export function railBeamRecover(s: Railway, revision: number) {
  const b = s.line?.beam;
  if (!b || b.state !== 'ground' || b.revision !== revision || b.age !== 21 || b.revision >= 2147483647) return 0;
  b.state = 'available';
  b.x = LINE1_GREAT_TREE.x;
  b.y = 3000;
  b.z = LINE1_GREAT_TREE.z;
  b.age = 0;
  b.revision++;
  return 1;
}
function fund(s: Railway, job: RailJob | Railway, index: number, tick: number, timing: LineTiming) {
  const spec = LINE1_STATIONS[index]!;
  if (
    job.start >= 0 ||
    job.stock !== spec.bill[0] ||
    (job.stoneStock ?? 0) !== spec.bill[1] ||
    (spec.beam && s.line!.beam.state !== 'allocated')
  )
    return;
  job.stock = 0;
  job.allocation = spec.bill[0];
  job.start = job.lastTick = tick;
  if (index > 0) {
    job.stoneStock = 0;
    job.stoneAllocation = spec.bill[1];
  }
  job.timing = { ...timing };
}
/** Returns the accepted amount; receipt identity is owned by railApply, never by a visual callback. */
export function railLineApply(s: Railway, a: RailAccount, e: RailAction, tick: number, timing: LineTiming): number {
  const l = s.line!;
  const ready = s.awake >= 0 && tick >= s.awake + T1.wakeTicks;
  const index = railActiveStation(s),
    job = railCurrentJob(s),
    spec = LINE1_STATIONS[index]!;
  const held = l.beam.state === 'held' && l.beam.holder === a.pid;
  const free = held ? 0 : Math.max(0, 8 - railCarry(a));
  const stone = e.kind === 1;
  let n = 0;
  if (e.op === 'rail.wake' && s.awake < 0) {
    s.awake = tick;
    return 1;
  }
  if (e.op === 'rail.chop' && ready && free > 0) {
    const k = RAILWAY_SOURCES.findIndex((row) => row[0] === e.id);
    if (k >= 0 && s.sources[k]! > 0) {
      if (l.axe && !l.upgrades[k]) {
        if (s.supply!.produced > 2147483647 - 3910 - 5) return 0;
        s.sources[k]! += 5;
        s.supply!.produced += 5;
        l.upgrades[k] = true;
      }
      n = Math.min(l.axe ? 5 : 2, s.sources[k]!, free);
      s.sources[k]! -= n;
      s.work[k] = Math.min(15, s.work[k]! + (l.axe ? 5 : 3));
      a.carry += n;
      if (s.sources[k] === 0) {
        s.supply!.ages[k] = 0;
        s.falls!.yaw[k] = e.yaw!;
        s.falls!.collapsed[k] = e.collapsed!;
      }
    }
    const h = [209, 232].indexOf(e.id!);
    if (h >= 0 && l.axe) {
      n = Math.min(5, l.hardwood[h]!, free);
      l.hardwood[h]! -= n;
      if (n) l.hardwoodWork[h] = Math.min(15, l.hardwoodWork[h]! + 5);
      a.carry += n;
    }
  }
  if (e.op === 'rail.mine' && ready && free > 0 && Number.isInteger(e.id) && e.id! >= 0 && e.id! < 3) {
    const k = e.id!;
    n = Math.min(2, l.rocks[k]!, free);
    l.rocks[k]! -= n;
    if (n) {
      l.rockWork[k] = Math.min(4, l.rockWork[k]! + 1);
      a.stone = (a.stone ?? 0) + n;
      if (!l.rocks[k]) l.rockAge[k] = 0;
    }
  }
  if (e.op === 'rail.deposit' && ready && e.kind !== 2 && e.station === spec.id && job.start < 0 && !job.completion) {
    const carry = stone ? (a.stone ?? 0) : a.carry;
    n = Math.min(e.n!, carry, spec.bill[stone ? 1 : 0] - (stone ? (job.stoneStock ?? 0) : job.stock));
    if (n === 0) return 0;
    if (stone) {
      a.stone = carry - n;
      job.stoneStock = (job.stoneStock ?? 0) + n;
      job.stoneDelivered = (job.stoneDelivered ?? 0) + n;
    } else {
      a.carry -= n;
      job.stock += n;
      job.delivered += n;
    }
    fund(s, job, index, tick, timing);
  }
  const kind = e.kind === 1 || e.kind === 2 ? e.kind : 0;
  if (e.op === 'rail.drop') {
    const carry = balanceOf(a, kind);
    let p = s.piles.find((p) => (p.kind ?? 0) === kind && p.x === e.x && p.z === e.z && p.y === e.y && p.n < 8);
    if (!p && carry > 0 && s.piles.length < 128 && s.nextPile < 2147483647) {
      p = { id: s.nextPile++, x: e.x!, y: e.y!, z: e.z!, n: 0, kind, age: 0 };
      s.piles.push(p);
    }
    if (p) {
      n = Math.min(e.n!, carry, 8 - p.n);
      p.n += n;
      if (n) p.age = 0;
      credit(a, kind, -n);
    }
  }
  if (e.op === 'rail.take' && free > 0) {
    const p = s.piles.find((p) => p.id === e.id);
    if (p && kind === (p.kind ?? 0)) {
      n = Math.min(p.n, free);
      p.n -= n;
      credit(a, kind, n);
      if (!p.n) s.piles.splice(s.piles.indexOf(p), 1);
    }
  }
  if (e.op === 'rail.rackTake' && free > 0 && e.kind !== 2) {
    n = Math.min(stone ? l.stoneRack : s.supply!.rack, free);
    if (stone) {
      l.stoneRack -= n;
      a.stone = (a.stone ?? 0) + n;
    } else {
      s.supply!.rack -= n;
      a.carry += n;
    }
  }
  if (e.op === 'rail.axe' && railAxeAvailable(s)) {
    l.axe = true;
    n = 1;
  }
  const b = l.beam;
  const beamNeeded = ready && index === 2 && job.start < 0 && l.axe;
  if (e.op === 'rail.beamChop' && beamNeeded && b.state === 'standing') {
    b.work++;
    n = 1;
    if (b.work === 12) {
      b.state = 'available';
      b.revision++;
    }
  }
  if (
    e.op === 'rail.beamTake' &&
    beamNeeded &&
    (b.state === 'available' || b.state === 'ground') &&
    e.revision === b.revision &&
    b.revision < 2147483647 &&
    railCarry(a) === 0
  ) {
    b.state = 'held';
    b.holder = a.pid;
    b.epoch = a.epoch;
    b.revision++;
    b.age = 0;
    n = 1;
  }
  if (e.op === 'rail.beamDrop' && held && e.revision === b.revision) {
    n = railBeamRelease(s, a.pid, a.epoch, e.revision);
    if (
      n &&
      Number.isSafeInteger(e.x) &&
      Number.isSafeInteger(e.y) &&
      Number.isSafeInteger(e.z) &&
      lineBeamGround(e.x!, e.y!, e.z!)
    ) {
      b.state = 'ground';
      b.x = e.x!;
      b.y = e.y!;
      b.z = e.z!;
    }
  }
  if (
    e.op === 'rail.beamDeposit' &&
    e.station === 'T3' &&
    beamNeeded &&
    held &&
    b.epoch === a.epoch &&
    e.revision === b.revision &&
    job.stock === 40 &&
    b.revision < 2147483647
  ) {
    b.state = 'allocated';
    b.holder = '';
    b.epoch = 0;
    b.revision++;
    n = 1;
    fund(s, job, index, tick, timing);
  }
  if (e.op === 'rail.jump' && !l.jump) {
    l.jump = true;
    n = 1;
  }
  return n;
}
export function railLineTick(s: Railway, tick: number) {
  const index = railActiveStation(s),
    job = railCurrentJob(s);
  if (job.start < 0 || job.completion) return;
  const spec = LINE1_STATIONS[index]!,
    schedule = lineSchedule(spec, job.timing ?? LINE_TIMING);
  job.elapsed = Math.min(schedule.totalTicks, job.elapsed + Math.max(0, tick - job.lastTick));
  job.lastTick = tick;
  const laying = Math.max(0, job.elapsed - schedule.depositTicks - schedule.feedTicks);
  job.used = Math.min(spec.bill[0], Math.floor((laying * spec.bill[0]) / schedule.layTicks));
  job.allocation = spec.bill[0] - job.used;
  if (index > 0) {
    job.stoneUsed = Math.min(spec.bill[1], Math.floor((laying * spec.bill[1]) / schedule.layTicks));
    job.stoneAllocation = spec.bill[1] - job.stoneUsed;
  }
  if (job.elapsed === schedule.totalTicks) {
    job.completion = 1;
    if (index === 2) s.line!.beam.state = 'used';
  }
}
