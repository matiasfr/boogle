// Compact line-one additions. Counts and durable singleton identity are verified before replacing state.
import type { Railway } from './railway.ts';
import { createRailLine, railJobs, railCarry, type RailJob, type RailLine } from './railway-line.ts';
import { LINE1_STATIONS, lineBeamGround } from './railway-line-layout.ts';
import { lineSchedule, type LineTiming } from './railway-line-schedule.ts';

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
const CLOCK = [
  'depositMs',
  'feedIntervalMs',
  'logFlightMs',
  'stoneFlightMs',
  'beamFlightMs',
  'cruiseCmPerTick',
  'departureTicks',
] as const;
const STATES = ['standing', 'available', 'held', 'ground', 'allocated', 'used'] as const;
export const packRailTiming = (timing: LineTiming) => CLOCK.map((key) => timing[key]);
export const unpackRailTiming = (row: unknown): LineTiming => {
  if (!Array.isArray(row) || row.length !== CLOCK.length) throw new Error('railway: timing encoding');
  return Object.fromEntries(CLOCK.map((key, i) => [key, row[i]])) as LineTiming;
};
export const packRailNibbles = (values: number[]) =>
  btoa(
    Array.from({ length: values.length / 2 }, (_, i) =>
      String.fromCharCode(values[i * 2]! * 16 + values[i * 2 + 1]!),
    ).join(''),
  );
export const unpackRailNibbles = (text: string): number[] => {
  const raw = atob(text);
  if (raw.length !== 194 || btoa(raw) !== text) throw new Error('railway: source encoding');
  return [...raw].flatMap((c) => [Math.floor(c.charCodeAt(0) / 16), c.charCodeAt(0) % 16]);
};
export type RailLineJSON = {
  j: number[][];
  a: number;
  q: number;
  r: number[];
  w: number[];
  g: number[];
  k: number;
  p: number;
  u: string;
  h: number[];
  hw: number[];
  b: (number | string)[];
};
const int = (v: unknown, max = 2147483647, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
const bit = (v: unknown) => int(v, 1);
export const packRailFlags = (values: boolean[]) => {
  let out = '';
  for (let i = 0; i < values.length; i += 4) {
    let n = 0;
    for (let j = 0; j < 4; j++) if (values[i + j]) n |= 1 << j;
    out += n.toString(16);
  }
  return out;
};
export const unpackRailFlags = (text: string, count: number) =>
  Array.from({ length: count }, (_, i) => (Number.parseInt(text[Math.floor(i / 4)]!, 16) & (1 << (i % 4))) !== 0);
export function saveRailLine(l: RailLine, pids: string[]): RailLineJSON {
  const b = l.beam;
  return {
    j: l.jobs.map((j) => [...FIELDS.map((k) => j[k]), ...CLOCK.map((k) => j.timing[k])]),
    a: Number(l.axe),
    q: Number(l.jump),
    r: [...l.rocks],
    w: [...l.rockWork],
    g: [...l.rockAge],
    k: l.stoneRack,
    p: l.stoneProduced,
    u: packRailFlags(l.upgrades),
    h: [...l.hardwood],
    hw: [...l.hardwoodWork],
    b: [
      STATES.indexOf(b.state),
      b.work,
      b.holder ? pids.indexOf(b.holder) : -1,
      b.epoch,
      b.revision,
      b.x,
      b.y,
      b.z,
      b.age,
    ],
  };
}
export function loadRailLine(value: unknown, pids: string[]): RailLine {
  const j = value as RailLineJSON | null;
  if (
    !j ||
    typeof j !== 'object' ||
    Array.isArray(j) ||
    Object.keys(j).sort().join() !== 'a,b,g,h,hw,j,k,p,q,r,u,w' ||
    !Array.isArray(j.j) ||
    j.j.length !== 2 ||
    j.j.some((row) => !Array.isArray(row) || row.length !== 19) ||
    !bit(j.a) ||
    !bit(j.q) ||
    !Array.isArray(j.b) ||
    j.b.length !== 9 ||
    !int(j.b[0], 5) ||
    !int(j.b[2], pids.length - 1, -1) ||
    typeof j.u !== 'string' ||
    j.u.length !== 97 ||
    !/^[0-9a-f]+$/.test(j.u) ||
    !int(j.k) ||
    !int(j.p) ||
    j.p % 8 !== 0
  )
    throw new Error('railway: line encoding');
  for (const [key, size, max] of [
    ['r', 3, 8],
    ['w', 3, 4],
    ['g', 3, 31],
    ['h', 2, 15],
    ['hw', 2, 15],
  ] as const)
    if (!Array.isArray(j[key]) || j[key].length !== size || j[key].some((n) => !int(n, max)))
      throw new Error('railway: source encoding');
  const l = createRailLine();
  l.jobs = j.j.map((row) => {
    const job = {} as RailJob;
    FIELDS.forEach((key, i) => (job[key] = row[i]!));
    job.timing = Object.fromEntries(CLOCK.map((key, i) => [key, row[FIELDS.length + i]!])) as LineTiming;
    return job;
  }) as [RailJob, RailJob];
  l.axe = !!j.a;
  l.jump = !!j.q;
  l.rocks = [...j.r];
  l.rockWork = [...j.w];
  l.rockAge = [...j.g];
  l.stoneRack = j.k;
  l.stoneProduced = j.p;
  l.upgrades = unpackRailFlags(j.u, 388);
  l.hardwood = [...j.h];
  l.hardwoodWork = [...j.hw];
  const [state, work, holder, epoch, revision, x, y, z, age] = j.b;
  if (
    !int(work, 12) ||
    !int(epoch) ||
    !int(revision) ||
    !int(x, 200000, -200000) ||
    !int(y, 200000, -200000) ||
    !int(z, 200000, -200000) ||
    !int(age, 21)
  )
    throw new Error('railway: beam encoding');
  l.beam = {
    state: STATES[state as number]!,
    work,
    holder: holder === -1 ? '' : pids[holder as number]!,
    epoch,
    revision,
    x,
    y,
    z,
    age,
  };
  return l;
}
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
  if (l.axe && (!l.jobs[0].completion || l.jobs[1].delivered !== 40)) throw new Error('railway: axe before threshold');
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
  if (b.work && !l.axe) throw new Error('railway: beam axe');
  if (b.state === 'held') {
    const a = s.accounts.find((a) => a.pid === b.holder);
    if (!a || b.epoch < 1 || b.epoch > a.epoch || railCarry(a) !== 0) throw new Error('railway: beam holder');
  } else if (b.holder || b.epoch) throw new Error('railway: beam orphan identity');
  if (
    (b.state === 'allocated' || b.state === 'used') !== l.jobs[1].start >= 0 ||
    (b.state === 'used') !== !!l.jobs[1].completion
  )
    throw new Error('railway: beam allocation');
}
