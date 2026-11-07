// The railway's rules as E systems (docs/plans/ecs-e.md, section 4). The same rules as before the move, one system per
// action op (line one's first, then line two's when line one moved nothing, as railLineApply || railLine2Apply did),
// the receipt and remember systems around them, the rule tick, the supply pulse, offline resume, sessions and the
// beam's absent-carrier paths. Each declares what it reads and writes. Pure; the server runs them on arrival and a
// client's prediction runs the very same ones on a clone of its mirror.
//
//   railApply(w, pid, e, tick, timing)   one action: receipt, the op, remember (the request history)
//   railTick(w, tick)                    the rule tick: line one's job, line two's forge, depot and job, the job clocks
//   railResume / railSession / railSupplyPulse / railBeamRelease / railBeamStood / railBeamPutDown
import { defineSystem, type System, type World } from '../ecs/index.ts';
import { MAX_PLAYERS, okPid } from './roster.ts';
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_GREAT_TREE, LINE1_STATIONS, lineBeamGround } from './railway-line-layout.ts';
import {
  LINE2_DEPOT as DEPOT,
  LINE2_FORGE as FORGE,
  LINE2_PACK as PACK,
  LINE2_STATIONS,
  RAILS,
} from './railway-line2-layout.ts';
import { lineSchedule, type LineTiming } from './railway-line-schedule.ts';
import { LINE_TIMING } from './railway-line.ts';
import {
  railGrows,
  railGrowthAllowed,
  RECOVERY_MINUTES,
  type SupplyIntervals,
  type SupplyPulse,
} from './railway-supply.ts';
import { railInt, RAILWAY_MAX_INT, RAILWAY_OUTCOMES, RAILWAY_PILES } from './railway.ts';
import type { RailAction, RailResult } from './railway.ts';
import {
  Account,
  Beam,
  DEPOT_OUT,
  Forge,
  ForgeClock,
  Hardwood,
  Job,
  JobRun,
  Outcome,
  Pile,
  QJob,
  QJobRun,
  Rail,
  RailClock,
  RAIL_STATUS,
  Rock,
  Tree,
} from './railway-world.ts';

type Act = { a: number; e: RailAction; tick: number; timing: LineTiming };
type Row<C> = C extends { defaults: infer R } ? { -readonly [K in keyof R]: R[K] } : never;
const REGROW_MINUTES = 31;
const TIMING_KEYS = Object.keys(LINE_TIMING) as (keyof LineTiming)[];

// ---------------------------------------------------------------- reads shared by systems
const railId = (w: World) => w.single(Rail);
const beamId = (w: World) => w.single(Beam);
const forgeId = (w: World) => w.single(Forge);
const job = (w: World, slot: number) => w.lookup(Job, slot)!;
const qjob = (w: World, slot: number) => w.lookup(QJob, slot)!;
/** The line-one station taking materials now (railActiveStation). */
function activeStation(w: World) {
  return !w.get(Job, job(w, 0))!.completion ? 0 : !w.get(Job, job(w, 1))!.completion ? 1 : 2;
}
function ready(w: World, tick: number) {
  const awake = w.get(Rail, railId(w))!.awake;
  return awake >= 0 && tick >= awake + T1.wakeTicks;
}
const held = (w: World, pid: string) => {
  const b = w.get(Beam, beamId(w))!;
  return b.state === 'held' && b.holder === pid;
};
type AccountRow = Row<typeof Account>;
const carried = (a: Readonly<AccountRow>) => a.carry + a.stone + a.rails;
/** What a back carries (railCarryMax): the pack is shared progression, like the axe. */
const carryMax = (w: World) => (w.get(Rail, railId(w))!.pack ? PACK.carry : T1.carry);
const free = (w: World, a: Readonly<AccountRow>) => (held(w, a.pid) ? 0 : Math.max(0, carryMax(w) - carried(a)));
const balanceOf = (a: Readonly<AccountRow>, kind: number) => (kind === 1 ? a.stone : kind === 2 ? a.rails : a.carry);
function credit(a: AccountRow, kind: number, n: number) {
  if (kind === 1) a.stone += n;
  else if (kind === RAILS) a.rails += n;
  else a.carry += n;
}
const qCompleted = (w: World) => LINE2_STATIONS.filter((_s, k) => w.get(QJob, qjob(w, k))!.completion).length;
/** The Q station taking materials now, or -1 before the forge is lit / after Q3 (line2Active). */
export function railLine2Active(w: World) {
  return qActive(w);
}
function qActive(w: World) {
  if (w.get(Forge, forgeId(w))!.lit < 0) return -1;
  return LINE2_STATIONS.findIndex((_s, k) => !w.get(QJob, qjob(w, k))!.completion);
}
const timingOf = (t: LineTiming) => Object.fromEntries(TIMING_KEYS.map((k) => [k, t[k]])) as LineTiming;
const scheduleOf = (spec: (typeof LINE1_STATIONS)[number] | (typeof LINE2_STATIONS)[number], j: LineTiming) =>
  lineSchedule(spec, timingOf(j));

// ---------------------------------------------------------------- the request history
const receipt = defineSystem(
  'rail.receipt',
  { reads: [Outcome, Account], phase: 'act', order: 0 },
  (w, q: { pid: string; epoch: number; request: number }): RailResult | null => {
    let old: RailResult | null = null;
    w.each([Outcome], (_id, r) => {
      if (!old && r.pid === q.pid && r.epoch === q.epoch && r.request === q.request)
        old = { ...r, status: RAIL_STATUS[r.status]! };
    });
    if (old) return old;
    const id = w.lookup(Account, q.pid);
    const a = id === undefined ? undefined : w.get(Account, id);
    if (!a || q.epoch !== a.epoch || q.request <= a.request)
      return { pid: q.pid, epoch: q.epoch, request: q.request, status: 'snapshot-required', accepted: 0 };
    return null;
  },
);
const remember = defineSystem(
  'rail.remember',
  { writes: [Account, Outcome], phase: 'act', order: 100 },
  (w, q: { a: number; e: RailAction; n: number; rejected: boolean }): RailResult => {
    const a = w.mut(Account, q.a)!;
    a.request = q.e.request;
    const status = q.rejected ? 'rejected' : q.n ? 'accepted' : 'noop';
    const r: RailResult = { pid: a.pid, epoch: q.e.epoch, request: q.e.request, status, accepted: q.n };
    w.spawn([Outcome, { ...r, status: RAIL_STATUS.indexOf(status) }]);
    if (w.count(Outcome) + 1 > RAILWAY_OUTCOMES) w.despawn(w.ids(Outcome)[0]!);
    return { ...r };
  },
);

// ---------------------------------------------------------------- line one's ops
const wake = defineSystem('rail.wake', { writes: [Rail], phase: 'act', order: 1 }, (w, { tick }: Act) => {
  const rail = w.get(Rail, railId(w))!;
  if (rail.awake >= 0) return 0;
  w.mut(Rail, railId(w))!.awake = tick;
  return 1;
});
const chop = defineSystem(
  'rail.chop',
  { reads: [Beam], writes: [Rail, Tree, Hardwood, Account], phase: 'act', order: 2 },
  (w, { a: aid, e, tick }: Act) => {
    if (!ready(w, tick)) return 0;
    const a = w.mut(Account, aid)!;
    const room = free(w, a);
    if (room <= 0) return 0;
    const rail = w.get(Rail, railId(w))!;
    let n = 0;
    const k = RAILWAY_SOURCES.findIndex((row) => row[0] === e.id);
    const treeId = k >= 0 ? w.lookup(Tree, k)! : -1;
    if (k >= 0 && w.get(Tree, treeId)!.left > 0) {
      const t = w.mut(Tree, treeId)!;
      if (rail.axe && !t.big) {
        if (rail.produced > 2147483647 - 3910 - 5) return 0;
        t.left += 5;
        w.mut(Rail, railId(w))!.produced += 5;
        t.big = true;
      }
      n = Math.min(rail.axe ? 5 : 2, t.left, room);
      t.left -= n;
      t.work = Math.min(15, t.work + (rail.axe ? 5 : 3));
      a.carry += n;
      if (t.left === 0) {
        t.age = 0;
        t.yaw = e.yaw!;
        t.fell = e.collapsed!;
      }
    }
    const h = [209, 232].indexOf(e.id!);
    if (h >= 0 && rail.axe) {
      const hw = w.mut(Hardwood, w.lookup(Hardwood, h)!)!;
      n = Math.min(5, hw.left, room);
      hw.left -= n;
      if (n) hw.work = Math.min(15, hw.work + 5);
      a.carry += n;
    }
    return n;
  },
);
const mine = defineSystem(
  'rail.mine',
  { reads: [Rail, Beam], writes: [Rock, Account], phase: 'act', order: 3 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    if (!ready(w, tick) || free(w, a) <= 0 || !Number.isInteger(e.id) || e.id! < 0 || e.id! >= 3) return 0;
    const rock = w.mut(Rock, w.lookup(Rock, e.id!)!)!;
    const n = Math.min(2, rock.left, free(w, a));
    rock.left -= n;
    if (n) {
      rock.work = Math.min(4, rock.work + 1);
      w.mut(Account, aid)!.stone += n;
      if (!rock.left) rock.age = 0;
    }
    return n;
  },
);
/** Funds a full line-one station (railway-line fund): the bill moves to allocation and the stretch starts. */
function fund(w: World, slot: number, tick: number, timing: LineTiming) {
  const spec = LINE1_STATIONS[slot]!;
  const id = job(w, slot);
  const j = w.get(Job, id)!;
  if (
    j.start >= 0 ||
    j.stock !== spec.bill[0] ||
    j.stoneStock !== spec.bill[1] ||
    (spec.beam && w.get(Beam, beamId(w))!.state !== 'allocated')
  )
    return;
  const jm = w.mut(Job, id)!,
    run = w.mut(JobRun, id)!;
  jm.stock = 0;
  run.allocation = spec.bill[0];
  jm.start = run.lastTick = tick;
  if (slot > 0) {
    jm.stoneStock = 0;
    run.stoneAllocation = spec.bill[1];
  }
  Object.assign(jm, timingOf(timing));
}
const deposit = defineSystem(
  'rail.deposit',
  { reads: [Rail, Beam], writes: [Job, JobRun, Account], phase: 'act', order: 4 },
  (w, { a: aid, e, tick, timing }: Act) => {
    const slot = activeStation(w),
      spec = LINE1_STATIONS[slot]!;
    const j = w.get(Job, job(w, slot))!;
    if (!ready(w, tick) || e.kind === 2 || e.station !== spec.id || j.start >= 0 || j.completion) return 0;
    const stone = e.kind === 1;
    const a = w.mut(Account, aid)!;
    const carry = stone ? a.stone : a.carry;
    const n = Math.min(e.n!, carry, spec.bill[stone ? 1 : 0] - (stone ? j.stoneStock : j.stock));
    if (n === 0) return 0;
    const jm = w.mut(Job, job(w, slot))!;
    if (stone) {
      a.stone = carry - n;
      jm.stoneStock += n;
      jm.stoneDelivered += n;
    } else {
      a.carry -= n;
      jm.stock += n;
      jm.delivered += n;
    }
    fund(w, slot, tick, timing);
    return n;
  },
);
const drop = defineSystem('rail.drop', { writes: [Pile, Account], phase: 'act', order: 5 }, (w, { a: aid, e }: Act) => {
  const kind = e.kind === 1 || e.kind === 2 ? e.kind : 0;
  const a = w.mut(Account, aid)!;
  const carry = balanceOf(a, kind);
  let at = -1;
  w.each([Pile], (id, p) => {
    if (at < 0 && p.kind === kind && p.x === e.x && p.z === e.z && p.y === e.y && p.n < 8) at = id;
  });
  if (at < 0) {
    if (carry <= 0 || w.count(Pile) >= RAILWAY_PILES || w.nextId() >= 2147483647) return 0;
    const n = Math.min(e.n!, carry, 8);
    w.spawn([Pile, { x: e.x!, y: e.y!, z: e.z!, n, kind, age: 0 }]);
    credit(a, kind, -n);
    return n;
  }
  const p = w.mut(Pile, at)!;
  const n = Math.min(e.n!, carry, 8 - p.n);
  p.n += n;
  if (n) p.age = 0;
  credit(a, kind, -n);
  return n;
});
const take = defineSystem(
  'rail.take',
  { reads: [Rail, Beam], writes: [Pile, Account], phase: 'act', order: 6 },
  (w, { a: aid, e }: Act) => {
    const a = w.mut(Account, aid)!;
    const room = free(w, a);
    const kind = e.kind === 1 || e.kind === 2 ? e.kind : 0;
    const p = room > 0 && railInt(e.id, RAILWAY_MAX_INT, -RAILWAY_MAX_INT) ? w.mut(Pile, e.id) : undefined;
    if (!p || kind !== p.kind) return 0;
    const n = Math.min(p.n, room);
    p.n -= n;
    credit(a, kind, n);
    if (!p.n) w.despawn(e.id!);
    return n;
  },
);
const rackTake = defineSystem(
  'rail.rackTake',
  { reads: [Beam], writes: [Rail, Account], phase: 'act', order: 7 },
  (w, { a: aid, e }: Act) => {
    const a = w.mut(Account, aid)!;
    const room = free(w, a);
    if (room <= 0 || e.kind === 2) return 0;
    const rail = w.mut(Rail, railId(w))!;
    if (e.kind === 1) {
      const n = Math.min(rail.stoneRack, room);
      rail.stoneRack -= n;
      a.stone += n;
      return n;
    }
    const n = Math.min(rail.rack, room);
    rail.rack -= n;
    a.carry += n;
    return n;
  },
);
/** railAxeAvailable: the proper axe is the lit forge's first made thing (the great beam pass, 7 November). */
const axe = defineSystem('rail.axe', { reads: [Forge], writes: [Rail], phase: 'act', order: 8 }, (w) => {
  const rail = w.get(Rail, railId(w))!;
  if (w.get(Forge, forgeId(w))!.lit < 0 || rail.axe) return 0;
  w.mut(Rail, railId(w))!.axe = true;
  return 1;
});
/** The great beam is needed: T3 active and unfunded, the machine ready. Your first axe fells the great tree once
 * Station 3 opens; beam and logs fund it in either order (7 November). */
const beamNeeded = (w: World, tick: number) =>
  ready(w, tick) && activeStation(w) === 2 && w.get(Job, job(w, 2))!.start < 0;
const beamChop = defineSystem(
  'rail.beamChop',
  { reads: [Rail, Job], writes: [Beam], phase: 'act', order: 9 },
  (w, { tick }: Act) => {
    if (!beamNeeded(w, tick) || w.get(Beam, beamId(w))!.state !== 'standing') return 0;
    const b = w.mut(Beam, beamId(w))!;
    b.work++;
    if (b.work === 12) {
      b.state = 'available';
      b.revision++;
    }
    return 1;
  },
);
const beamTake = defineSystem(
  'rail.beamTake',
  { reads: [Rail, Job, Account], writes: [Beam], phase: 'act', order: 10 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    const b = w.get(Beam, beamId(w))!;
    if (
      !beamNeeded(w, tick) ||
      (b.state !== 'available' && b.state !== 'ground') ||
      e.revision !== b.revision ||
      b.revision >= 2147483647 ||
      carried(a) !== 0
    )
      return 0;
    Object.assign(w.mut(Beam, beamId(w))!, { state: 'held', holder: a.pid, epoch: a.epoch, age: 0 });
    w.mut(Beam, beamId(w))!.revision++;
    return 1;
  },
);
/** The beam back at the great tree, available (railBeamRelease's effect). */
function release(w: World) {
  const b = w.mut(Beam, beamId(w))!;
  Object.assign(b, { state: 'available', holder: '', epoch: 0, age: 0, x: LINE1_GREAT_TREE.x, y: 3000 });
  b.z = LINE1_GREAT_TREE.z;
  b.revision++;
}
const releasable = (w: World, pid: string, epoch: number, revision: number) => {
  const b = w.get(Beam, beamId(w))!;
  return (
    b.state === 'held' && b.holder === pid && b.epoch === epoch && b.revision === revision && revision < 2147483647
  );
};
const beamDrop = defineSystem(
  'rail.beamDrop',
  { reads: [Account], writes: [Beam], phase: 'act', order: 11 },
  (w, { a: aid, e }: Act) => {
    const a = w.get(Account, aid)!;
    if (!held(w, a.pid) || e.revision !== w.get(Beam, beamId(w))!.revision) return 0;
    if (!releasable(w, a.pid, a.epoch, e.revision!)) return 0;
    release(w);
    if (
      Number.isSafeInteger(e.x) &&
      Number.isSafeInteger(e.y) &&
      Number.isSafeInteger(e.z) &&
      lineBeamGround(e.x!, e.y!, e.z!)
    )
      Object.assign(w.mut(Beam, beamId(w))!, { state: 'ground', x: e.x!, y: e.y!, z: e.z! });
    return 1;
  },
);
const beamDeposit = defineSystem(
  'rail.beamDeposit',
  { reads: [Rail, Account], writes: [Beam, Job, JobRun], phase: 'act', order: 12 },
  (w, { a: aid, e, tick, timing }: Act) => {
    const a = w.get(Account, aid)!;
    const b = w.get(Beam, beamId(w))!;
    if (
      e.station !== 'T3' ||
      !beamNeeded(w, tick) ||
      !held(w, a.pid) ||
      b.epoch !== a.epoch ||
      e.revision !== b.revision ||
      b.revision >= 2147483647
    )
      return 0;
    const bm = w.mut(Beam, beamId(w))!;
    Object.assign(bm, { state: 'allocated', holder: '', epoch: 0 });
    bm.revision++;
    fund(w, 2, tick, timing);
    return 1;
  },
);
const jump = defineSystem('rail.jump', { writes: [Rail], phase: 'act', order: 13 }, (w) => {
  if (w.get(Rail, railId(w))!.jump) return 0;
  w.mut(Rail, railId(w))!.jump = true;
  return 1;
});

// ---------------------------------------------------------------- line two's ops
function fundQ(w: World, k: number, tick: number, timing: LineTiming) {
  const spec = LINE2_STATIONS[k]!;
  const id = qjob(w, k);
  const j = w.get(QJob, id)!;
  if (j.start >= 0 || j.stock !== spec.bill[0] || j.railStock !== spec.bill[1]) return;
  const jm = w.mut(QJob, id)!,
    run = w.mut(QJobRun, id)!;
  jm.stock = jm.railStock = 0;
  run.allocation = spec.bill[0];
  run.railAllocation = spec.bill[1];
  jm.start = run.lastTick = tick;
  // Rails still on the shelf go back to the forge rack: the shelf only ever holds an unfunded stretch's rails.
  const rail = w.get(Rail, railId(w))!;
  if (spec.shelf && rail.depotRails) {
    w.mut(Forge, forgeId(w))!.rack += rail.depotRails;
    w.mut(Rail, railId(w))!.depotRails = 0;
  }
  // Each stretch pins the room's timing when funded; Q2/Q3 lay faster, as in Place.
  Object.assign(jm, timingOf(timing), {
    cruiseCmPerTick: Math.max(1, Math.floor((timing.cruiseCmPerTick * spec.speed) / 100)),
  });
}
const deposit2 = defineSystem(
  'rail.deposit2',
  { reads: [Beam, Job], writes: [Rail, Forge, ForgeClock, QJob, QJobRun, Account], phase: 'act', order: 20 },
  (w, { a: aid, e, tick, timing }: Act) => {
    const a = w.mut(Account, aid)!;
    const fid = forgeId(w);
    if (e.station === 'F' && (e.kind ?? 0) === 0 && w.get(Job, job(w, 2))!.completion) {
      const f = w.get(Forge, fid)!;
      const n = Math.min(e.n!, a.carry, FORGE.logs - f.used);
      if (n <= 0) return 0;
      a.carry -= n;
      const fm = w.mut(Forge, fid)!;
      fm.used += n;
      if (fm.used === FORGE.logs) fm.lit = w.mut(ForgeClock, fid)!.lastPour = tick;
      return n;
    }
    const k = qActive(w);
    if (k < 0 || e.station !== LINE2_STATIONS[k]!.id || tick < w.get(Forge, fid)!.lit + FORGE.turnTicks) return 0;
    const j = w.get(QJob, qjob(w, k))!,
      spec = LINE2_STATIONS[k]!;
    // A gated frame takes nothing until its gate is down (the quarry lever, which needs Q3).
    if (j.start >= 0 || (spec.gate === 'quarry' && !w.get(Rail, railId(w))!.lever)) return 0;
    const rails = e.kind === RAILS;
    if (e.kind !== undefined && e.kind !== 0 && !rails) return 0;
    const n = Math.min(e.n!, rails ? a.rails : a.carry, spec.bill[rails ? 1 : 0] - (rails ? j.railStock : j.stock));
    if (n <= 0) return 0;
    const jm = w.mut(QJob, qjob(w, k))!;
    if (rails) {
      a.rails -= n;
      jm.railStock += n;
      jm.railDelivered += n;
    } else {
      a.carry -= n;
      jm.stock += n;
      jm.delivered += n;
    }
    fundQ(w, k, tick, timing);
    return n;
  },
);
const forgeTake = defineSystem(
  'rail.forgeTake',
  { reads: [Rail, Beam], writes: [Forge, Account], phase: 'act', order: 21 },
  (w, { a: aid }: Act) => {
    const a = w.mut(Account, aid)!;
    const room = free(w, a);
    if (room <= 0) return 0;
    const f = w.mut(Forge, forgeId(w))!;
    const n = Math.min(f.rack, room);
    f.rack -= n;
    a.rails += n;
    return n;
  },
);
const depotTake = defineSystem(
  'rail.depotTake',
  { reads: [Beam], writes: [Rail, Account], phase: 'act', order: 22 },
  (w, { a: aid }: Act) => {
    const a = w.mut(Account, aid)!;
    const room = free(w, a);
    if (room <= 0) return 0;
    const rail = w.mut(Rail, railId(w))!;
    const n = Math.min(rail.depot, room);
    rail.depot -= n;
    a.carry += n;
    return n;
  },
);
/** Rails from the shelf by a `shelf` stretch's rack (moved there from the forge; railValid checks the stretch). */
const depotRailTake = defineSystem(
  'rail.depotRailTake',
  { reads: [Beam], writes: [Rail, Account], phase: 'act', order: 25 },
  (w, { a: aid }: Act) => {
    const a = w.mut(Account, aid)!;
    const room = free(w, a);
    if (room <= 0) return 0;
    const rail = w.mut(Rail, railId(w))!;
    const n = Math.min(rail.depotRails, room);
    rail.depotRails -= n;
    a.rails += n;
    return n;
  },
);
/** The pack chest: there once the forge has its first bill; one open gives every back LINE2_PACK.carry. */
const pack = defineSystem('rail.pack', { reads: [Forge], writes: [Rail], phase: 'act', order: 26 }, (w) => {
  if (w.get(Forge, forgeId(w))!.used < FORGE.bills[0] || w.get(Rail, railId(w))!.pack) return 0;
  w.mut(Rail, railId(w))!.pack = true;
  return 1;
});
// Before Q3 the drive is uncoupled: a pull does nothing, even from a jump onto the apron.
const lever = defineSystem('rail.lever', { reads: [QJob], writes: [Rail], phase: 'act', order: 23 }, (w) => {
  if (qCompleted(w) < 3 || w.get(Rail, railId(w))!.lever) return 0;
  w.mut(Rail, railId(w))!.lever = true;
  return 1;
});
const hook = defineSystem('rail.hook', { reads: [QJob], writes: [Rail], phase: 'act', order: 24 }, (w) => {
  if (qCompleted(w) < 2 || w.get(Rail, railId(w))!.hook) return 0;
  w.mut(Rail, railId(w))!.hook = true;
  return 1;
});

/** The systems for each op, in the order they are tried: the first that moves something answers. */
// An op system that reads no action (the axe, the jump, the lever, the hook) takes it all the same.
const OPS: Record<string, readonly System<never, number>[]> = {
  'rail.wake': [wake],
  'rail.chop': [chop],
  'rail.mine': [mine],
  'rail.deposit': [deposit, deposit2],
  'rail.drop': [drop],
  'rail.take': [take],
  'rail.rackTake': [rackTake],
  'rail.axe': [axe],
  'rail.beamChop': [beamChop],
  'rail.beamTake': [beamTake],
  'rail.beamDrop': [beamDrop],
  'rail.beamDeposit': [beamDeposit],
  'rail.jump': [jump],
  'rail.forgeTake': [forgeTake],
  'rail.depotTake': [depotTake],
  'rail.lever': [lever],
  'rail.hook': [hook],
  'rail.depotRailTake': [depotRailTake],
  'rail.pack': [pack],
};

export function railOutcome(w: World, pid: string, epoch: number, request: number): RailResult | null {
  return w.run(receipt, { pid, epoch, request });
}
/** All transfers recheck capacity at application, after preceding actions. */
export function railApply(w: World, pid: string, e: RailAction, tick: number, timing: LineTiming = LINE_TIMING) {
  const previous = railOutcome(w, pid, e.epoch, e.request);
  if (previous) return previous;
  const a = w.lookup(Account, pid)!;
  let n = 0;
  for (const sys of Object.hasOwn(OPS, e.op) ? OPS[e.op]! : [])
    if ((n = w.run(sys as System<Act, number>, { a, e, tick, timing }))) break;
  return w.run(remember, { a, e, n, rejected: e.op === 'rail.reject' });
}

// ---------------------------------------------------------------- the rule tick
function layLine1(w: World, tick: number) {
  const slot = activeStation(w),
    id = job(w, slot);
  const j = w.get(Job, id)!;
  if (j.start < 0 || j.completion) return;
  const spec = LINE1_STATIONS[slot]!,
    schedule = scheduleOf(spec, j);
  const run = w.mut(JobRun, id)!;
  run.elapsed = Math.min(schedule.totalTicks, run.elapsed + Math.max(0, tick - run.lastTick));
  run.lastTick = tick;
  const laying = Math.max(0, run.elapsed - schedule.depositTicks - schedule.feedTicks);
  run.used = Math.min(spec.bill[0], Math.floor((laying * spec.bill[0]) / schedule.layTicks));
  run.allocation = spec.bill[0] - run.used;
  if (slot > 0) {
    run.stoneUsed = Math.min(spec.bill[1], Math.floor((laying * spec.bill[1]) / schedule.layTicks));
    run.stoneAllocation = spec.bill[1] - run.stoneUsed;
  }
  if (run.elapsed === schedule.totalTicks) {
    w.mut(Job, id)!.completion = 1;
    if (slot === 2) w.mut(Beam, beamId(w))!.state = 'used';
  }
}
const lineTick = defineSystem(
  'rail.lineTick',
  { reads: [Rail], writes: [Job, JobRun, Beam], phase: 'tick', order: 0 },
  (w, tick: number) => layLine1(w, tick),
);
/** What the depot still owes stretch k: logs to mint (a stretch's output is capped at its bill, so logs taken from the
 * rack and dropped elsewhere are not replaced), the rails its shelf is still owed, and how many of them the forge rack
 * can give now. */
function depotNeed(w: World, k: number, j: Readonly<{ stock: number; railStock: number }>) {
  const spec = LINE2_STATIONS[k]!,
    rail = w.get(Rail, railId(w))!;
  const logs = Math.max(0, Math.min(spec.bill[0] - j.stock - rail.depot, spec.bill[0] - rail[DEPOT_OUT[k]!]));
  const owed = spec.shelf ? Math.max(0, spec.bill[1] - j.railStock - rail.depotRails) : 0;
  const rails = Math.min(owed, w.get(Forge, forgeId(w))!.rack);
  return { logs, rails, owed };
}
/** One atomic depot load for stretch k: `logs` minted (counted production) and `rails` moved from the forge rack. */
function depotLoad(w: World, k: number, logs: number, rails: number) {
  if (logs <= 0 && rails <= 0) return false;
  const rm = w.mut(Rail, railId(w))!;
  if (logs > 0) {
    rm.depot += logs;
    rm.depotProduced += logs;
    rm[DEPOT_OUT[k]!] += logs;
  }
  if (rails > 0) {
    w.mut(Forge, forgeId(w))!.rack -= rails;
    rm.depotRails += rails;
  }
  return true;
}
function layLine2(w: World, tick: number) {
  const fid = forgeId(w);
  const f = w.get(Forge, fid)!;
  if (f.lit >= 0) {
    if (f.rack < FORGE.rackMax && tick - w.get(ForgeClock, fid)!.lastPour >= FORGE.pourTicks) {
      const fm = w.mut(Forge, fid)!,
        cm = w.mut(ForgeClock, fid)!;
      while (fm.rack < FORGE.rackMax && tick - cm.lastPour >= FORGE.pourTicks) {
        fm.rack++;
        fm.poured++;
        cm.lastPour += FORGE.pourTicks;
      }
    }
    if (w.get(Forge, fid)!.rack >= FORGE.rackMax) w.mut(ForgeClock, fid)!.lastPour = tick;
  }
  const k = qActive(w);
  if (k < 0) return;
  const id = qjob(w, k);
  const j = w.get(QJob, id)!,
    spec = LINE2_STATIONS[k]!;
  // The depot runs from Q1's completion while a rack-fed stretch still needs logs (and, for a shelf stretch, rails).
  if (spec.depot && j.start < 0) {
    const rid = railId(w);
    const clock = w.mut(RailClock, rid)!;
    if (clock.depotLast < 0) clock.depotLast = tick;
    const { logs, rails, owed } = depotNeed(w, k, j);
    if ((logs || owed) && tick - clock.depotLast >= DEPOT.everyTicks) {
      // One load: up to DEPOT.load logs minted at the camp, and up to DEPOT.load rails moved off the forge rack. With
      // the logs in and the rack short of a load, the cart waits for the forge (its clock is not reset).
      const load = Math.min(DEPOT.load, rails);
      if ((logs || load >= Math.min(DEPOT.load, owed)) && depotLoad(w, k, Math.min(DEPOT.load, logs), load))
        clock.depotLast = tick;
    } else if (!logs && !owed) clock.depotLast = tick;
  }
  if (j.start < 0 || j.completion) return;
  const schedule = scheduleOf(spec, j);
  const run = w.mut(QJobRun, id)!;
  run.elapsed = Math.min(schedule.totalTicks, run.elapsed + Math.max(0, tick - run.lastTick));
  run.lastTick = tick;
  const laying = Math.max(0, run.elapsed - schedule.depositTicks - schedule.feedTicks);
  run.used = Math.min(spec.bill[0], Math.floor((laying * spec.bill[0]) / schedule.layTicks));
  run.allocation = spec.bill[0] - run.used;
  run.railUsed = Math.min(spec.bill[1], Math.floor((laying * spec.bill[1]) / schedule.layTicks));
  run.railAllocation = spec.bill[1] - run.railUsed;
  if (run.elapsed === schedule.totalTicks) w.mut(QJob, id)!.completion = 1;
}
const line2Tick = defineSystem(
  'rail.line2Tick',
  { writes: [Forge, ForgeClock, Rail, RailClock, QJob, QJobRun], phase: 'tick', order: 1 },
  (w, tick: number) => layLine2(w, tick),
);
/** The wire's job clock: `ahead` and `end` follow from what the tick advanced (written only when they change). */
const jobClock = defineSystem(
  'rail.jobClock',
  { reads: [JobRun, QJobRun], writes: [Job, QJob], phase: 'tick', order: 2 },
  (w) => {
    const settle = (c: typeof Job | typeof QJob, run: typeof JobRun | typeof QJobRun, id: number) => {
      const j = w.get(c, id)!,
        r = w.get(run, id)!;
      const ahead = j.start >= 0 ? r.elapsed - (r.lastTick - j.start) : 0;
      const end = j.completion ? r.lastTick : -1;
      if (j.ahead !== ahead || j.end !== end) Object.assign(w.mut(c, id)!, { ahead, end });
    };
    for (const id of w.ids(Job)) settle(Job, JobRun, id);
    for (const id of w.ids(QJob)) settle(QJob, QJobRun, id);
  },
);
/** After an action the server applied (not in a prediction, whose job clocks are the mirror's). */
export const railSettle = (w: World) => w.run(jobClock, undefined);
export function railTick(w: World, tick: number) {
  w.run(lineTick, tick);
  w.run(line2Tick, tick);
  w.run(jobClock, undefined);
}

// ---------------------------------------------------------------- offline catch-up, sessions, supply, the beam
/** The away credit's yards (./railway-away.ts): `ticks` of production for the forge's rack and the depot cart, as the
 * rule tick would make them, never past the rack or the stretch's need. Counted like a tick: poured and the depot's
 * output grow with what is made. Applied before the funded job finishes, so nothing is made for a stretch not yet
 * reached. */
function awayCredit(w: World, ticks: number, tick: number) {
  if (ticks <= 0) return 0;
  let made = 0;
  const fid = forgeId(w);
  if (w.get(Forge, fid)!.lit >= 0) {
    const f = w.mut(Forge, fid)!;
    const n = Math.min(FORGE.rackMax - f.rack, Math.floor(ticks / FORGE.pourTicks));
    if (n > 0) {
      f.rack += n;
      f.poured += n;
      made += n;
    }
    if (f.rack >= FORGE.rackMax) {
      const c = w.mut(ForgeClock, fid)!;
      c.lastPour = Math.max(c.lastPour, tick);
    }
  }
  const k = qActive(w);
  const spec = k >= 0 ? LINE2_STATIONS[k]! : null;
  const j = k >= 0 ? w.get(QJob, qjob(w, k))! : null;
  if (spec?.depot && j && j.start < 0) {
    // The cart's trips while away: logs minted and shelf rails moved off the (credited) forge rack, as the tick would.
    const loads = Math.floor(ticks / DEPOT.everyTicks) * DEPOT.load;
    const { logs, rails } = depotNeed(w, k, j);
    const n = Math.min(logs, loads);
    depotLoad(w, k, n, Math.min(rails, loads));
    made += n;
    w.mut(RailClock, railId(w))!.depotLast = tick;
  }
  return made;
}
/** Bounded catch-up for the funded stretch only (the yards' credit comes first, from awayCredit). */
const resume = defineSystem(
  'rail.resume',
  { writes: [Rail, RailClock, Job, JobRun, QJob, QJobRun, Beam, Forge, ForgeClock], phase: 'resume', order: 0 },
  (w, { ticks, marker, tick, yard }: { ticks: number; marker: number; tick: number; yard: number }) => {
    const clock = w.mut(RailClock, railId(w))!;
    if (marker <= clock.resumeMarker) return 0;
    clock.resumeMarker = marker;
    awayCredit(w, yard, tick);
    const slot = activeStation(w),
      id = job(w, slot);
    const j = w.get(Job, id)!;
    if (j.start < 0 || j.completion) {
      const k = qActive(w);
      if (k < 0) return 0;
      const q = w.get(QJob, qjob(w, k))!;
      if (q.start < 0 || q.completion) return 0;
      const run = w.mut(QJobRun, qjob(w, k))!;
      const n = Math.min(ticks, scheduleOf(LINE2_STATIONS[k]!, q).totalTicks - run.elapsed);
      run.elapsed += n;
      layLine2(w, tick);
      return n;
    }
    const run = w.mut(JobRun, id)!;
    const n = Math.min(ticks, scheduleOf(LINE1_STATIONS[slot]!, j).totalTicks - run.elapsed);
    run.elapsed += n;
    layLine1(w, tick);
    return n;
  },
);
/** One away credit, consumed once per absolute marker: `yard` production ticks for the yards first (the forge and
 * the depot), then up to `ticks` for the funded job. Returns the job ticks advanced. */
export function railResume(w: World, ticks: number, marker: number, tick: number, yard = 0): number {
  const n = w.run(resume, { ticks, marker, tick, yard });
  w.run(jobClock, undefined);
  return n;
}
const session = defineSystem(
  'rail.session',
  { writes: [Account, Beam], phase: 'session', order: 0 },
  (w, { pid, epoch }: { pid: string; epoch: number }) => {
    if (!okPid(pid) || !railInt(epoch, RAILWAY_MAX_INT, 1)) return false;
    const id = w.lookup(Account, pid);
    if (id !== undefined) {
      const old = w.get(Account, id)!;
      if (epoch !== old.epoch + 1) return false;
      Object.assign(w.mut(Account, id)!, { epoch, request: 0 });
      // A player who comes back (a reconnect, a reload) still carries the beam they held: it moves to the new session.
      if (held(w, pid)) w.mut(Beam, beamId(w))!.epoch = epoch;
      return true;
    }
    if (epoch !== 1 || w.count(Account) >= MAX_PLAYERS) return false;
    w.spawn([Account, { pid, carry: 0, stone: 0, rails: 0, epoch, request: 0 }]);
    return true;
  },
);
export const railSession = (w: World, pid: string, epoch: number): boolean => w.run(session, { pid, epoch });

const DEFAULT_INTERVALS: SupplyIntervals = { regrow: REGROW_MINUTES, recover: RECOVERY_MINUTES };
/** Keep the saved 31/21 progress units and stage codes unchanged. The global minute phase supplies a deterministic
 * fractional remainder without more per-source state. Clamp elapsed time before multiplying. */
const progressUnits = (marker: number, minutes: number, interval: number, units: number) => {
  const phase = marker % interval;
  return (
    Math.floor(((phase + Math.min(minutes, interval)) * units) / interval) - Math.floor((phase * units) / interval)
  );
};
/** Idempotent accepted event. Nearby/unknown players are excluded by the host before it stamps recover ids. */
const supply = defineSystem(
  'rail.supply',
  { writes: [Rail, RailClock, Pile, Forge, Tree, Rock, Beam], phase: 'supply', order: 0 },
  (w, { e, intervals }: { e: SupplyPulse; intervals: SupplyIntervals }) => {
    const rid = railId(w);
    const clock = w.get(RailClock, rid)!;
    if (e.marker < clock.supplyMarker) return 0;
    const marker = clock.supplyMarker;
    const minutes = marker ? Math.min(1440, e.marker - marker) : 0;
    const regrow = progressUnits(marker, minutes, intervals.regrow, REGROW_MINUTES);
    const recover = progressUnits(marker, minutes, intervals.recover, RECOVERY_MINUTES);
    w.mut(RailClock, rid)!.supplyMarker = e.marker;
    const rail = w.mut(Rail, rid)!;
    let moved = 0;
    w.each(
      [Pile],
      (id, pile) => {
        pile.age = Math.min(RECOVERY_MINUTES, pile.age + recover);
        if (pile.age === RECOVERY_MINUTES && e.recover.includes(id)) {
          if (pile.kind === 1) rail.stoneRack += pile.n;
          // Abandoned rails return to the forge's rack; logs to the recovery rack.
          else if (pile.kind === RAILS) w.mut(Forge, forgeId(w))!.rack += pile.n;
          else rail.rack += pile.n;
          moved += pile.n;
          pile.n = 0;
          w.despawn(id);
        }
      },
      [Pile],
    );
    w.each(
      [Tree],
      (_id, t) => {
        if (t.left !== 0) return;
        const age = t.age;
        if (age < REGROW_MINUTES) t.age = Math.min(REGROW_MINUTES, age + regrow);
        // Each visible stage takes a separate accepted minute, even after a long offline gap.
        if (
          age < REGROW_MINUTES ||
          !minutes ||
          !railGrows(e.grow, t.slot) ||
          !railGrowthAllowed(t.slot, true) ||
          rail.produced > 2147483647 - RAILWAY_SUPPLY - 30 - 15
        )
          return;
        t.age = age + 1;
        if (t.age !== 35) return;
        const yieldCount = rail.axe ? 15 : T1.sourceYield;
        Object.assign(t, { left: yieldCount, big: rail.axe, work: 0, yaw: 0, fell: false });
        rail.produced += yieldCount;
      },
      [Tree],
    );
    const b = w.get(Beam, beamId(w))!;
    if (b.state === 'ground') {
      w.mut(Beam, beamId(w))!.age = Math.min(RECOVERY_MINUTES, b.age + recover);
      // Back to the tree: an abandoned beam recovers once its minutes are up (railBeamRecover).
      const g = w.get(Beam, beamId(w))!;
      if (e.beam !== undefined && g.revision === e.beam && g.age === 21 && g.revision < 2147483647) {
        Object.assign(w.mut(Beam, beamId(w))!, { state: 'available', x: LINE1_GREAT_TREE.x, y: 3000, age: 0 });
        const bm = w.mut(Beam, beamId(w))!;
        bm.z = LINE1_GREAT_TREE.z;
        bm.revision++;
        moved += 1;
      }
    }
    w.each([Rock], (id, r) => {
      if (r.left !== 0) return;
      const rm = w.mut(Rock, id)!;
      rm.age = Math.min(REGROW_MINUTES, rm.age + regrow);
      if (rm.age === REGROW_MINUTES && rail.stoneProduced <= 2147483647 - 32) {
        Object.assign(rm, { left: 8, work: 0, age: 0 });
        rail.stoneProduced += 8;
      }
    });
    return moved;
  },
);
export function railSupplyPulse(w: World, e: SupplyPulse, intervals: SupplyIntervals = DEFAULT_INTERVALS) {
  return w.run(supply, { e, intervals });
}

const beamRelease = defineSystem(
  'rail.beamRelease',
  { writes: [Beam], phase: 'beam', order: 0 },
  (w, q: { pid: string; epoch: number; revision: number }) => {
    if (!releasable(w, q.pid, q.epoch, q.revision)) return 0;
    release(w);
    return 1;
  },
);
/** The carrier's session ended (a lost socket past its grace, or a release): the beam goes back to the tree. */
export const railBeamRelease = (w: World, pid: string, epoch: number, revision: number): number =>
  w.run(beamRelease, { pid, epoch, revision });
const beamStood = defineSystem(
  'rail.beamStood',
  { writes: [Beam], phase: 'beam', order: 1 },
  (w, q: { pid: string; x: number; y: number; z: number }) => {
    const b = w.get(Beam, beamId(w))!;
    if (b.state !== 'held' || b.holder !== q.pid || (b.x === q.x && b.y === q.y && b.z === q.z)) return false;
    Object.assign(w.mut(Beam, beamId(w))!, { x: q.x, y: q.y, z: q.z });
    return true;
  },
);
/** Where the beam's carrier stands (cm, at their feet), kept on the held beam so an absence that outlasts its grace
 * (and a server restart) puts it down there. Returns whether it moved. */
export const railBeamStood = (w: World, pid: string, x: number, y: number, z: number): boolean =>
  w.run(beamStood, { pid, x, y, z });
const beamPutDown = defineSystem('rail.beamPutDown', { writes: [Beam], phase: 'beam', order: 2 }, (w, pid: string) => {
  const b = w.get(Beam, beamId(w))!;
  if (b.state !== 'held' || b.holder !== pid || b.revision >= 2147483647) return 0;
  const { x, y, z } = b;
  if (!releasable(w, pid, b.epoch, b.revision)) return 0;
  release(w);
  if (lineBeamGround(x, y, z)) Object.assign(w.mut(Beam, beamId(w))!, { state: 'ground', x, y, z });
  return 1;
});
/** The carrier stayed away past the grace: the beam goes down where they last stood, or, off the work area, back to
 * the tree. Never while they hold it in a live session. */
export const railBeamPutDown = (w: World, pid: string): number => w.run(beamPutDown, pid);
