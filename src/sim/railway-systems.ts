// The railway's rules as E systems (docs/plans/ecs-e.md, section 4). The same rules as before the move, one system per
// action op (line one's first, then line two's when line one moved nothing, as railLineApply || railLine2Apply did),
// the receipt and remember systems around them, the rule tick, the supply pulse, offline resume, sessions and the
// beam's and boiler's absent-carrier paths. Each declares what it reads and writes. Pure; the server runs them on arrival and a
// client's prediction runs the very same ones on a clone of its mirror.
//
//   railApply(w, pid, e, tick, timing)   one action: receipt, the op, remember (the request history)
//   railTick(w, tick)                    the rule tick: line one's job, line two's forge and job, the depot cart's trip
//                                        (./railway-cart.ts), the two trains (./railway-train.ts) with line 2's
//                                        footing wagon, the Works kiln's casts (./railway-works.ts), the job clocks
//   the Works block                      rail.breaker, rail.strike, rail.kiln, rail.footTake, rail.footSet,
//                                        rail.cradle, rail.turn and the shed's commissioning (the wagon's roll-out)
//   rail.glide                           the glider's one shared take on Needle Bell's summit, once Q5 is laid
//   railBoilerStood / railBoilerPutDown  follow the hauled boiler; put an absent hauler's down where they stood
//   railFootRelease / railFootHolders   return an absent carrier's footing to the Works rack
//   railResume / railSession / railSupplyPulse / railBeamRelease / railBeamStood / railBeamPutDown
import { defineSystem, type System, type World } from '../ecs/index.ts';
import { MAX_PLAYERS, okPid } from './roster.ts';
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_GREAT_TREE, LINE1_STATIONS, lineBeamGround } from './railway-line-layout.ts';
import {
  LINE2_FORGE as FORGE,
  LINE2_PACK as PACK,
  LINE2_STATIONS,
  LINE2_BOILER,
  LINE2_KIT,
  line2BoilerGround,
  RAILS,
  type Line2Station,
} from './railway-line2-layout.ts';
import { lineSchedule, type LineTiming } from './railway-line-schedule.ts';
import { CART, CART_PHASE, CART_ROAD, cartCycleTicks, cartEnd } from './railway-cart.ts';
import {
  TRAIN,
  TRAIN_PHASE,
  TRAIN_HOME,
  TRAIN_STOPS,
  LINE_HALTS,
  reqAdd,
  reqDrop,
  reqHas,
  reqIndex,
  trainAlong,
  trainArrives,
  trainDir,
  trainNextStop,
  trainSpeed,
  trainStopsOf,
  trainWayOut,
  type ServiceStop,
} from './railway-train.ts';
import { RAIL_ROCKS, WORKS } from './railway-works-layout.ts';
import { SEAM_STALL, SEAM_THROAT } from './railway-works.ts';
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
  Cart,
  Boiler,
  Train,
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
  Shed,
  Tree,
  Works,
  WorksClock,
} from './railway-world.ts';

type Act = { a: number; e: RailAction; tick: number; timing: LineTiming };
type Row<C> = C extends { defaults: infer R } ? { -readonly [K in keyof R]: R[K] } : never;
const REGROW_MINUTES = 31;
const TIMING_KEYS = Object.keys(LINE_TIMING) as (keyof LineTiming)[];

// ---------------------------------------------------------------- reads shared by systems
const railId = (w: World) => w.single(Rail);
const beamId = (w: World) => w.single(Beam);
const forgeId = (w: World) => w.single(Forge);
const cartId = (w: World) => w.single(Cart);
const boilerId = (w: World) => w.single(Boiler);
const trainId = (w: World, slot: number) => w.lookup(Train, slot)!;
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
const boilerHeld = (w: World, pid: string) => {
  const b = w.get(Boiler, boilerId(w))!;
  return b.state === 'held' && b.holder === pid;
};
type AccountRow = Row<typeof Account>;
/** A big thing fills your back: the great beam, the boiler or a footing. */
const heldBig = (w: World, a: Readonly<AccountRow>) => held(w, a.pid) || boilerHeld(w, a.pid) || a.foot > 0;
const carried = (a: Readonly<AccountRow>) => a.carry + a.stone + a.rails;
/** What a back carries (railCarryMax): the pack is shared progression, like the axe. */
const carryMax = (w: World) => (w.get(Rail, railId(w))!.pack ? PACK.carry : T1.carry);
const free = (w: World, a: Readonly<AccountRow>) => (heldBig(w, a) ? 0 : Math.max(0, carryMax(w) - carried(a)));
/** Pile kinds: 0 logs, 1 stone, 2 rails, 3 a footing (one to a pile, one to a back). */
const FOOT = 3;
const pileKind = (kind: unknown) => (kind === 1 || kind === RAILS || kind === FOOT ? kind : 0);
const pileCap = (kind: number) => (kind === FOOT ? 1 : 8);
/** What a back can take of a kind: a footing only onto an empty back. */
const roomFor = (w: World, a: Readonly<AccountRow>, kind: number) =>
  kind === FOOT ? Number(!heldBig(w, a) && carried(a) === 0) : free(w, a);
const balanceOf = (a: Readonly<AccountRow>, kind: number) =>
  kind === 1 ? a.stone : kind === RAILS ? a.rails : kind === FOOT ? a.foot : a.carry;
function credit(a: AccountRow, kind: number, n: number) {
  if (kind === 1) a.stone += n;
  else if (kind === RAILS) a.rails += n;
  else if (kind === FOOT) a.foot += n;
  else a.carry += n;
}
const qCompleted = (w: World) => LINE2_STATIONS.filter((_s, k) => w.get(QJob, qjob(w, k))!.completion).length;
/** The stops line k serves now (trainStops): line 2's pier once Q6 is laid. */
const stopsOf = (w: World, k: number) => trainStopsOf(k, qCompleted(w) >= LINE2_STATIONS.length);
const worksId = (w: World) => w.single(Works);
const shedId = (w: World) => w.single(Shed);
/** The Q station taking materials now, or -1 before the forge is lit / after Q3 (line2Active). */
export function railLine2Active(w: World) {
  return qActive(w);
}
function qActive(w: World) {
  if (w.get(Forge, forgeId(w))!.lit < 0) return -1;
  return LINE2_STATIONS.findIndex((_s, k) => !w.get(QJob, qjob(w, k))!.completion);
}
/** Station 6 waits for the train (docs/plans/boiler-first-choice.md, step 3; owner, 9 November): while the active
 * stretch is train-fed and trains don't run, its kit is the train's, so the frame takes nothing by hand and the forge
 * rack gives no rails (they stay for the kit). The view's `trainOwed` (src/entities/railway/forge-offer.ts) mirrors it. */
const trainOwed = (w: World) => {
  const k = qActive(w);
  return k >= 0 && LINE2_STATIONS[k]!.feed === 'train' && w.get(Rail, railId(w))!.trains < 0;
};
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
  { reads: [Boiler, Beam], writes: [Rail, Tree, Hardwood, Account], phase: 'act', order: 2 },
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
  { reads: [Boiler, Rail, Beam], writes: [Rock, Account], phase: 'act', order: 3 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    if (!ready(w, tick) || free(w, a) <= 0 || !railInt(e.id, RAIL_ROCKS.length - 1)) return 0;
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
  { reads: [Boiler, Rail, Beam], writes: [Job, JobRun, Account], phase: 'act', order: 4 },
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
  const kind = pileKind(e.kind),
    cap = pileCap(kind);
  // A footing goes down whole, never with others.
  if (kind === FOOT && e.n !== 1) return 0;
  const a = w.mut(Account, aid)!;
  const carry = balanceOf(a, kind);
  let at = -1;
  w.each([Pile], (id, p) => {
    if (at < 0 && p.kind === kind && p.x === e.x && p.z === e.z && p.y === e.y && p.n < cap) at = id;
  });
  if (at < 0) {
    if (carry <= 0 || w.count(Pile) >= RAILWAY_PILES || w.nextId() >= 2147483647) return 0;
    const n = Math.min(e.n!, carry, cap);
    w.spawn([Pile, { x: e.x!, y: e.y!, z: e.z!, n, kind, age: 0 }]);
    credit(a, kind, -n);
    return n;
  }
  const p = w.mut(Pile, at)!;
  const n = Math.min(e.n!, carry, cap - p.n);
  p.n += n;
  if (n) p.age = 0;
  credit(a, kind, -n);
  return n;
});
const take = defineSystem(
  'rail.take',
  { reads: [Boiler, Rail, Beam], writes: [Pile, Account], phase: 'act', order: 6 },
  (w, { a: aid, e }: Act) => {
    const a = w.mut(Account, aid)!;
    const kind = pileKind(e.kind);
    const room = roomFor(w, a, kind);
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
  { reads: [Boiler, Beam], writes: [Rail, Account], phase: 'act', order: 7 },
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
  { reads: [Rail, Job, Account, Boiler], writes: [Beam], phase: 'act', order: 10 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    const b = w.get(Beam, beamId(w))!;
    if (
      !beamNeeded(w, tick) ||
      (b.state !== 'available' && b.state !== 'ground') ||
      e.revision !== b.revision ||
      b.revision >= 2147483647 ||
      carried(a) !== 0 ||
      a.foot ||
      boilerHeld(w, a.pid)
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
      railInt(e.x, 200000, -200000) &&
      railInt(e.y, 200000, -200000) &&
      railInt(e.z, 200000, -200000) &&
      lineBeamGround(e.x, e.y, e.z)
    )
      Object.assign(w.mut(Beam, beamId(w))!, { state: 'ground', x: e.x, y: e.y, z: e.z });
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
// ---------------------------------------------------------------- the unique boiler (Server kind; effects belong to accepted events)
function boilerPedestal(w: World) {
  const b = w.mut(Boiler, boilerId(w))!;
  Object.assign(b, {
    state: 'pedestal',
    holder: '',
    epoch: 0,
    age: 0,
    x: LINE2_BOILER.x,
    y: LINE2_BOILER.y,
    z: LINE2_BOILER.z,
  });
  b.revision++;
}
function boilerReleasable(w: World, pid: string, epoch: number, revision: number) {
  const b = w.get(Boiler, boilerId(w))!;
  return (
    b.state === 'held' && b.holder === pid && b.epoch === epoch && b.revision === revision && revision < RAILWAY_MAX_INT
  );
}
const boilerTake = defineSystem(
  'rail.boilerTake',
  { reads: [Account, Beam], writes: [Boiler], phase: 'act', order: 29 },
  (w, { a: aid, e }: Act) => {
    const a = w.get(Account, aid)!,
      b = w.get(Boiler, boilerId(w))!;
    if (
      (b.state !== 'pedestal' && b.state !== 'ground') ||
      e.revision !== b.revision ||
      b.revision >= RAILWAY_MAX_INT ||
      carried(a) ||
      a.foot ||
      held(w, a.pid)
    )
      return 0;
    Object.assign(w.mut(Boiler, boilerId(w))!, {
      state: 'held',
      holder: a.pid,
      epoch: a.epoch,
      age: 0,
      revision: b.revision + 1,
    });
    return 1;
  },
);
const boilerDrop = defineSystem(
  'rail.boilerDrop',
  { reads: [Account], writes: [Boiler], phase: 'act', order: 30 },
  (w, { a: aid, e }: Act) => {
    const a = w.get(Account, aid)!;
    if (!boilerReleasable(w, a.pid, a.epoch, e.revision!)) return 0;
    boilerPedestal(w);
    if (
      railInt(e.x, 200000, -200000) &&
      railInt(e.y, 200000, -200000) &&
      railInt(e.z, 200000, -200000) &&
      line2BoilerGround(e.x, e.y, e.z)
    )
      Object.assign(w.mut(Boiler, boilerId(w))!, { state: 'ground', x: e.x, y: e.y, z: e.z });
    return 1;
  },
);
const boilerFit = defineSystem(
  'rail.boilerFit',
  { reads: [Account], writes: [Boiler, Rail, Train], phase: 'act', order: 31 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    if (w.get(Rail, railId(w))!.trains >= 0 || !boilerReleasable(w, a.pid, a.epoch, e.revision!)) return 0;
    const b = w.mut(Boiler, boilerId(w))!;
    Object.assign(b, { state: 'fitted', holder: '', epoch: 0, age: 0, revision: b.revision + 1 });
    w.mut(Rail, railId(w))!.trains = tick;
    TRAIN_HOME.forEach((at, slot) =>
      Object.assign(w.mut(Train, trainId(w, slot))!, {
        phase: TRAIN_PHASE.STAND,
        at,
        to: at,
        sweep: slot ? 1 : -1,
        depart: tick + TRAIN.wakeTicks,
        req: 0,
        from: TRAIN_STOPS[slot]![at]!,
        v0: 0,
        dest: TRAIN_STOPS[slot]![at]!,
      }),
    );
    return 1;
  },
);
/** A stop request, from the halt's lever or aboard (docs/plans/works-late-game.md, step 1): one bit per halt per way,
 * so a repeat (or a friend's same ask) moves nothing. The train's own tick serves and clears it. A train standing at
 * that halt, leaving the way you asked, waits a full dwell from now. */
const call = defineSystem(
  'rail.call',
  { reads: [Rail, QJob], writes: [Train], phase: 'act', order: 32 },
  (w, { e, tick }: Act) => {
    const halt = railInt(e.id, LINE_HALTS.length - 1) ? LINE_HALTS[e.id] : undefined;
    if (!halt || (e.dir !== -1 && e.dir !== 1) || w.get(Rail, railId(w))!.trains < 0) return 0;
    // The pier halt is there once Q6 is laid.
    const n = stopsOf(w, halt.line).length;
    if (halt.stop >= n) return 0;
    const id = trainId(w, halt.line),
      r = w.get(Train, id)!;
    if (reqHas(r.req, halt.stop, e.dir, n)) return 0;
    const row = w.mut(Train, id)!;
    row.req = reqAdd(r.req, halt.stop, e.dir, n);
    const leaving = reqIndex(r.at, r.sweep, n) === reqIndex(halt.stop, e.dir, n);
    if (r.phase === TRAIN_PHASE.STAND && r.at === halt.stop && leaving && tick > r.depart) row.depart = tick;
    return 1;
  },
);
const jump = defineSystem('rail.jump', { writes: [Rail], phase: 'act', order: 13 }, (w) => {
  if (w.get(Rail, railId(w))!.jump) return 0;
  w.mut(Rail, railId(w))!.jump = true;
  return 1;
});

// ---------------------------------------------------------------- line two's ops
function gateDown(w: World, spec: Line2Station) {
  const rail = w.get(Rail, railId(w))!;
  return !spec.gate || (spec.gate === 'quarry' ? rail.lever : rail.sea);
}
function fundQ(w: World, k: number, tick: number, timing: LineTiming) {
  const spec = LINE2_STATIONS[k]!;
  const id = qjob(w, k);
  const j = w.get(QJob, id)!;
  if (j.start >= 0 || !gateDown(w, spec) || j.stock !== spec.bill[0] || j.railStock !== spec.bill[1]) return;
  const jm = w.mut(QJob, id)!,
    run = w.mut(QJobRun, id)!;
  jm.stock = jm.railStock = 0;
  run.allocation = spec.bill[0];
  run.railAllocation = spec.bill[1];
  jm.start = run.lastTick = tick;
  // Rails still on the shelf or aboard the cart go back to the forge rack: they only ever wait for an unfunded
  // stretch.
  const rail = w.get(Rail, railId(w))!,
    aboard = w.get(Cart, cartId(w))!.rails,
    trainRails = w.get(Train, trainId(w, 1))!.rails;
  if (spec.shelf && (rail.depotRails || rail.shelfOut || aboard || trainRails)) {
    w.mut(Forge, forgeId(w))!.rack += rail.depotRails + aboard + trainRails;
    Object.assign(w.mut(Rail, railId(w))!, { depotRails: 0, shelfOut: 0 });
    if (aboard) w.mut(Cart, cartId(w))!.rails = 0;
    if (trainRails) w.mut(Train, trainId(w, 1))!.rails = 0;
  }
  // Each stretch pins the room's timing when funded; Q2/Q3 lay faster, as in Place.
  Object.assign(jm, timingOf(timing), {
    cruiseCmPerTick: Math.max(1, Math.floor((timing.cruiseCmPerTick * spec.speed) / 100)),
  });
}
const deposit2 = defineSystem(
  'rail.deposit2',
  {
    reads: [Boiler, Beam, Job],
    writes: [Rail, Forge, ForgeClock, QJob, QJobRun, Account, Cart, Train],
    phase: 'act',
    order: 20,
  },
  (w, { a: aid, e, tick, timing }: Act) => {
    const a = w.mut(Account, aid)!;
    const fid = forgeId(w);
    if (boilerHeld(w, a.pid)) return 0;
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
    // A gate holds the machine, not deliveries to its frame.
    if (j.start >= 0 || trainOwed(w)) return 0;
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
  { reads: [Boiler, Rail, Beam, QJob, Shed], writes: [Forge, Account], phase: 'act', order: 21 },
  (w, { a: aid }: Act) => {
    if (trainOwed(w)) return 0;
    const a = w.mut(Account, aid)!;
    let room = free(w, a);
    // Once no Q station takes rails, the cradle is the rack's only use: take just what it still needs, so a full
    // back of spare rails never stands between you and the footings (which need an empty back). Once the cradle is
    // fitted nothing uses rails, so the rack gives none.
    const h = w.get(Shed, shedId(w))!;
    if (qActive(w) < 0) room = h.fitted >= 0 ? 0 : Math.min(room, WORKS.cradleRails - h.cradleRails - a.rails);
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
  { reads: [Boiler, Beam], writes: [Rail, Account], phase: 'act', order: 22 },
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
  { reads: [Boiler, Beam], writes: [Rail, Account], phase: 'act', order: 25 },
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
const lever = defineSystem(
  'rail.lever',
  { writes: [Rail, QJob, QJobRun, Forge, Cart, Train], phase: 'act', order: 23 },
  (w, { tick, timing }: Act) => {
    if (qCompleted(w) < 3 || w.get(Rail, railId(w))!.lever) return 0;
    w.mut(Rail, railId(w))!.lever = true;
    fundQ(w, 3, tick, timing);
    return 1;
  },
);
const hook = defineSystem('rail.hook', { reads: [QJob], writes: [Rail], phase: 'act', order: 24 }, (w) => {
  if (qCompleted(w) < 2 || w.get(Rail, railId(w))!.hook) return 0;
  w.mut(Rail, railId(w))!.hook = true;
  return 1;
});
// The glider on Needle Bell's summit (glider piece B): sealed until Q5 is laid, then one shared take for the room.
// Order 40: after the Works block (33-39).
const glide = defineSystem('rail.glide', { reads: [QJob], writes: [Rail], phase: 'act', order: 40 }, (w) => {
  if (qCompleted(w) < 5 || w.get(Rail, railId(w))!.glide) return 0;
  w.mut(Rail, railId(w))!.glide = true;
  return 1;
});
const seaSwitch = defineSystem(
  'rail.seaSwitch',
  { writes: [Rail, QJob, QJobRun, Forge, Cart, Train], phase: 'act', order: 28 },
  (w, { tick, timing }: Act) => {
    if (w.get(Rail, railId(w))!.sea) return 0;
    w.mut(Rail, railId(w))!.sea = true;
    fundQ(w, 4, tick, timing);
    return 1;
  },
);

// ---------------------------------------------------------------- the Works and the Roundhouse (./railway-works.ts)
// Server kind: every op is judged from the actor's own position by railValid; each transfer is one apply.
/** The breaker on the boiler's old pedestal: the forge's third made thing, cast when Q6 is laid. A room-wide rung.
 * Not while you haul the boiler (docs/plans/boiler-first-choice.md, Part 2): a guard for worlds where the two met. */
const breaker = defineSystem(
  'rail.breaker',
  { reads: [Account, Boiler], writes: [Works], phase: 'act', order: 33 },
  (w, { a: aid }: Act) => {
    if (w.get(Works, worksId(w))!.breaker !== 1 || boilerHeld(w, w.get(Account, aid)!.pid)) return 0;
    w.mut(Works, worksId(w))!.breaker = 2;
    return 1;
  },
);
/** One generous strike opens a seam (0 the stall slab, 1 the throat); a repeat strike moves nothing. Not while you
 * haul the boiler. */
const strike = defineSystem(
  'rail.strike',
  { reads: [Account, Boiler], writes: [Works], phase: 'act', order: 34 },
  (w, { a: aid, e }: Act) => {
    const works = w.get(Works, worksId(w))!;
    if (!railInt(e.id, 1) || works.breaker !== 2 || boilerHeld(w, w.get(Account, aid)!.pid)) return 0;
    const bit = e.id ? SEAM_THROAT : SEAM_STALL;
    if (works.seams & bit) return 0;
    w.mut(Works, worksId(w))!.seams = works.seams | bit;
    return 1;
  },
);
/** Logs and stone off your back into the kiln's bills; it lights the moment both are full. */
const kiln = defineSystem(
  'rail.kiln',
  { writes: [Works, WorksClock, Account], phase: 'act', order: 35 },
  (w, { a: aid, tick }: Act) => {
    const id = worksId(w),
      works = w.get(Works, id)!;
    if (!(works.seams & SEAM_THROAT) || works.lit >= 0) return 0;
    const a = w.get(Account, aid)!;
    const logs = Math.min(a.carry, WORKS.kilnLogs - works.logs),
      stone = Math.min(a.stone, WORKS.kilnStone - works.stone);
    if (logs + stone <= 0) return 0;
    const am = w.mut(Account, aid)!,
      wm = w.mut(Works, id)!;
    am.carry -= logs;
    am.stone -= stone;
    wm.logs += logs;
    wm.stone += stone;
    if (wm.logs === WORKS.kilnLogs && wm.stone === WORKS.kilnStone) wm.lit = w.mut(WorksClock, id)!.lastCast = tick;
    return logs + stone;
  },
);
/** The wagon rolls out to wait on line 2 once the cradle is fitted and the table points at line 2 (any op that makes
 * that true calls this); it couples at the train's next village stop. The roll-out is a request at line 2's village
 * end, so a train out on the line comes back for it. */
function commission(w: World, tick: number) {
  const h = w.get(Shed, shedId(w))!,
    t = trainId(w, 1);
  if (h.fitted >= 0 && h.table === 1 && h.ready < 0 && !w.get(Train, t)!.wagon) {
    w.mut(Shed, shedId(w))!.ready = tick + WORKS.rollTicks;
    const row = w.mut(Train, t)!;
    row.req = reqAdd(row.req, 0, 1, stopsOf(w, 1).length);
  }
}
/** Shoulder a footing (rack 0 the Works rack, 1 the pier rack): it fills an empty back. */
const footTake = defineSystem(
  'rail.footTake',
  { reads: [Beam, Boiler], writes: [Works, Account], phase: 'act', order: 36 },
  (w, { a: aid, e }: Act) => {
    const a = w.get(Account, aid)!,
      works = w.get(Works, worksId(w))!;
    if (!railInt(e.rack, 1) || roomFor(w, a, FOOT) < 1) return 0;
    const key = e.rack ? 'pierRack' : 'rack';
    if (works[key] <= 0) return 0;
    w.mut(Works, worksId(w))![key]--;
    w.mut(Account, aid)!.foot = 1;
    return 1;
  },
);
/** Set the footing on your back: 0 the stall (after the slab), 1 the cradle (after the stall), 2 the pier (after
 * Q6, while the pier still needs one that is not already racked there or aboard the wagon). */
const footSet = defineSystem(
  'rail.footSet',
  { reads: [QJob], writes: [Works, Shed, Account, Train], phase: 'act', order: 37 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    if (a.foot !== 1 || !railInt(e.site, 2)) return 0;
    const works = w.get(Works, worksId(w))!,
      h = w.get(Shed, shedId(w))!;
    if (e.site === 0) {
      if (!(works.seams & SEAM_STALL) || h.stall >= WORKS.stall) return 0;
      w.mut(Shed, shedId(w))!.stall++;
    } else if (e.site === 1) {
      if (h.stall !== WORKS.stall || h.cradle >= WORKS.cradle) return 0;
      w.mut(Shed, shedId(w))!.cradle++;
      fit(w, tick);
    } else {
      const aboard = w.get(Train, trainId(w, 1))!.foot;
      if (qCompleted(w) < LINE2_STATIONS.length || works.pierSet + works.pierRack + aboard >= WORKS.pier) return 0;
      const wm = w.mut(Works, worksId(w))!;
      wm.pierSet++;
      if (wm.pierSet === WORKS.pier) wm.crossing = tick;
    }
    w.mut(Account, aid)!.foot = 0;
    return 1;
  },
);
/** Whichever op completes the cradle (its eight rails; WORKS.cradle footings, none since 10 November) fits it. */
function fit(w: World, tick: number) {
  const h = w.get(Shed, shedId(w))!;
  if (h.fitted >= 0 || h.cradle !== WORKS.cradle || h.cradleRails !== WORKS.cradleRails) return;
  w.mut(Shed, shedId(w))!.fitted = tick;
  commission(w, tick);
}
/** Rails off your back onto the cradle, up to its eight, once the stall stands. */
const cradle = defineSystem(
  'rail.cradle',
  { writes: [Shed, Account, Train], reads: [QJob], phase: 'act', order: 38 },
  (w, { a: aid, tick }: Act) => {
    const h = w.get(Shed, shedId(w))!;
    if (h.stall !== WORKS.stall) return 0;
    const n = Math.min(w.get(Account, aid)!.rails, WORKS.cradleRails - h.cradleRails);
    if (n <= 0) return 0;
    w.mut(Account, aid)!.rails -= n;
    w.mut(Shed, shedId(w))!.cradleRails += n;
    fit(w, tick);
    return n;
  },
);
/** Turn the table to a road, on the revision the actor saw. Only when ready (owner, 10 November): once the cradle is
 * fitted and before the wagon rolls out, so the one turn there is sends the wagon out. Earlier, while it rolls out or
 * waits for its train, and after it couples, a turn is refused: no press is accepted and silent. */
const turn = defineSystem(
  'rail.turn',
  { reads: [QJob], writes: [Shed, Train], phase: 'act', order: 39 },
  (w, { e, tick }: Act) => {
    const h = w.get(Shed, shedId(w))!;
    if (h.stall !== WORKS.stall || !railInt(e.to, 1) || e.revision !== h.tableRev || e.to === h.table) return 0;
    if (h.tableRev >= RAILWAY_MAX_INT) return 0;
    if (h.fitted < 0 || h.ready >= 0 || w.get(Train, trainId(w, 1))!.wagon) return 0;
    const hm = w.mut(Shed, shedId(w))!;
    hm.table = e.to;
    hm.tableRev++;
    commission(w, tick);
    return 1;
  },
);

/** The systems for each op, in the order they are tried: the first that moves something answers. */
// An op system that reads no action (the axe, the jump, the lever, the hook, the glider) takes it all the same.
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
  'rail.seaSwitch': [seaSwitch],
  'rail.hook': [hook],
  'rail.glide': [glide],
  'rail.depotRailTake': [depotRailTake],
  'rail.pack': [pack],

  'rail.boilerTake': [boilerTake],
  'rail.boilerDrop': [boilerDrop],
  'rail.boilerFit': [boilerFit],
  'rail.call': [call],
  'rail.breaker': [breaker],
  'rail.strike': [strike],
  'rail.kiln': [kiln],
  'rail.footTake': [footTake],
  'rail.footSet': [footSet],
  'rail.cradle': [cradle],
  'rail.turn': [turn],
};

export function railOutcome(w: World, pid: string, epoch: number, request: number): RailResult | null {
  return w.run(receipt, { pid, epoch, request });
}
/** All transfers recheck capacity at application, after preceding actions. */
export function railApply(w: World, pid: string, e: RailAction, tick: number, timing: LineTiming = LINE_TIMING) {
  const previous = railOutcome(w, pid, e.epoch, e.request);
  // The receipt answers 'snapshot-required' for a pid with no account, so one is here.
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
/** What the depot still owes stretch k: logs to mint at the camp (a stretch's output is capped at its bill, so logs
 * taken from the rack and dropped elsewhere are not replaced) and the rails its shelf is still owed (rails on a back are
 * not brought again: the cart moves at most the stretch's rail bill, shelfOut). Counts what the cart has aboard. */
function depotNeed(w: World, k: number, j: Readonly<{ stock: number; railStock: number }>) {
  const spec = LINE2_STATIONS[k]!,
    rail = w.get(Rail, railId(w))!,
    cart = w.get(Cart, cartId(w))!,
    train = w.get(Train, trainId(w, 1))!;
  const logs = Math.max(
    0,
    Math.min(spec.bill[0] - j.stock - rail.depot - cart.logs - train.logs, spec.bill[0] - rail[DEPOT_OUT[k]!]),
  );
  const rails = spec.shelf
    ? Math.max(
        0,
        Math.min(spec.bill[1] - j.railStock - rail.depotRails - cart.rails - train.rails, spec.bill[1] - rail.shelfOut),
      )
    : 0;
  return { logs, rails };
}
/** The stretch the cart serves now (a depot stretch not yet funded), or -1. */
function cartServing(w: World) {
  const k = qActive(w);
  if (k < 0 || !LINE2_STATIONS[k]!.depot || LINE2_STATIONS[k]!.feed === 'train') return -1;
  return w.get(QJob, qjob(w, k))!.start < 0 ? k : -1;
}
// The cart's three transfers, each one atomic: logs minted onto it at the camp (counted production), rails moved onto
// it off the forge rack at the forge stop, and everything aboard onto the rack and shelf at the rack. `depot` and
// `depotRails` change only at the unload.
function cartMint(w: World, k: number, n: number) {
  if (n <= 0) return;
  const rm = w.mut(Rail, railId(w))!;
  rm.depotProduced += n;
  rm[DEPOT_OUT[k]!] += n;
  w.mut(Cart, cartId(w))!.logs += n;
}
function cartTakeRails(w: World, n: number) {
  if (n <= 0) return;
  w.mut(Forge, forgeId(w))!.rack -= n;
  w.mut(Rail, railId(w))!.shelfOut += n;
  w.mut(Cart, cartId(w))!.rails += n;
}
function cartUnload(w: World) {
  const c = w.get(Cart, cartId(w))!;
  if (!c.logs && !c.rails) return;
  const rm = w.mut(Rail, railId(w))!;
  rm.depot += c.logs;
  rm.depotRails += c.rails;
  Object.assign(w.mut(Cart, cartId(w))!, { logs: 0, rails: 0 });
}
/** The rails the cart still wants at the forge stop for the stretch it serves (k), up to what it holds. */
function cartWants(w: World, k: number) {
  if (k < 0 || !LINE2_STATIONS[k]!.shelf) return 0;
  const { rails } = depotNeed(w, k, w.get(QJob, qjob(w, k))!);
  return Math.min(CART.rails - w.get(Cart, cartId(w))!.rails, rails);
}
/** The cart's trip at `tick`: each phase ends on its clock (or, at rest and at the forge, on a condition), and the next
 * starts where it ended, so the pose stays continuous and the server sends the cart only at a phase change. */
function cartStep(w: World, tick: number) {
  const id = cartId(w);
  const P = CART_PHASE;
  for (let guard = 0; guard < 16; guard++) {
    const c = w.get(Cart, id)!;
    const k = cartServing(w);
    const end = cartEnd(c);
    const next = (phase: number, depart: number, more: { from?: number; to?: number } = {}) =>
      Object.assign(w.mut(Cart, id)!, { phase, depart, ...more });
    switch (c.phase) {
      case P.REST: {
        if (k < 0) return;
        const need = depotNeed(w, k, w.get(QJob, qjob(w, k))!);
        if (!need.logs && !need.rails) return;
        next(P.LOAD, tick, { from: 0, to: CART_ROAD.rackCm(k) });
        cartMint(w, k, Math.min(CART.load, need.logs));
        continue;
      }
      case P.FORGE: {
        const want = cartWants(w, k);
        if (want > 0 && w.get(Forge, forgeId(w))!.rack > 0) {
          cartTakeRails(w, Math.min(want, w.get(Forge, forgeId(w))!.rack));
          w.mut(Cart, id)!.depart = tick; // the leave clock starts at the last rails aboard
        }
        if (cartWants(w, k) > 0) return; // waiting for the forge
        const now = w.get(Cart, id)!;
        const dwell = now.rails > 0 ? CART.leaveTicks : 0;
        if (tick < now.depart + dwell) return;
        if (k < 0 && !now.logs && !now.rails) next(P.HOME, tick);
        else next(P.RUN, tick, { from: CART_ROAD.forgeCm, to: k >= 0 ? CART_ROAD.rackCm(k) : now.to });
        continue;
      }
      default:
        if (tick < end) return;
        if (c.phase === P.LOAD) next(P.OUT, end);
        else if (c.phase === P.OUT) next(P.FORGE, end);
        else if (c.phase === P.RUN) {
          // Its stretch funded on the way and the next one's rack is further on: the load goes on there.
          if (k >= 0 && CART_ROAD.rackCm(k) > c.to && c.logs + c.rails > 0)
            next(P.RUN, end, { from: c.to, to: CART_ROAD.rackCm(k) });
          else {
            next(P.DROP, end);
            cartUnload(w);
          }
        } else if (c.phase === P.DROP) next(P.BACK, end);
        else if (c.phase === P.BACK) next(P.HOME, end);
        else next(P.REST, end);
    }
  }
}
/** Footings the pier still needs that are neither set, racked there, nor aboard the wagon (`aboard`). */
function pierOwed(w: World, aboard: number) {
  const works = w.get(Works, worksId(w))!;
  return WORKS.pier - works.pierSet - works.pierRack - aboard;
}
/** Line 2 arriving with the wagon: at the quarry it loads what the Works rack has and the pier still needs; at the
 * pier it unloads everything onto the pier rack. One apply each. */
function wagonArrives(w: World, row: Row<typeof Train>) {
  if (!row.wagon) return;
  if (row.at === 1) {
    const works = w.get(Works, worksId(w))!;
    const need = pierOwed(w, row.foot);
    const n = Math.min(WORKS.wagonCap - row.foot, works.rack, need);
    if (n <= 0) return;
    w.mut(Works, worksId(w))!.rack -= n;
    row.foot += n;
  } else if (row.at === 3 && row.foot) {
    w.mut(Works, worksId(w))!.pierRack += row.foot;
    row.foot = 0;
  }
}
/** The stops line 2 makes with no request (docs/plans/works-late-game.md, step 1): Far Head while the Q6 kit is
 * aboard; the quarry going out while the wagon has room, the Works rack a footing and the pier a need; the pier while
 * the wagon carries footings. Line 1 carries nothing by train. */
function serviceOf(w: World, slot: number, r: Readonly<Row<typeof Train>>): ServiceStop {
  if (slot !== 1) return () => false;
  return (k, dir) =>
    (k === 2 && r.logs + r.rails > 0) ||
    (k === 1 &&
      dir > 0 &&
      r.wagon &&
      r.foot < WORKS.wagonCap &&
      w.get(Works, worksId(w))!.rack > 0 &&
      pierOwed(w, r.foot) > 0) ||
    (k === 3 && r.wagon && r.foot > 0);
}
/** A running train asked to stop at a halt nearer than its leg's end, which it can still brake for: the leg is
 * replaced from where it is now, at the speed it has now, so the pose stays continuous. Never a longer leg. */
function replan(w: World, id: number, slot: number, stops: readonly number[], tick: number) {
  const r = w.get(Train, id)!,
    dir = trainDir(r),
    s = trainAlong(r, slot, tick);
  const v = Math.min(TRAIN.speed, Math.round(trainSpeed(r, slot, tick)));
  const to = trainNextStop(stops, s, v, dir, r.req, serviceOf(w, slot, r));
  if (to < 0 || to === r.to || (stops[to]! - s) * dir >= (r.dest - s) * dir) return;
  Object.assign(w.mut(Train, id)!, { to, from: s, v0: v, dest: stops[to]!, depart: tick });
}
/** One train row per line; transfers and phase changes are atomic inside this tick apply. */
function trainStep(w: World, tick: number) {
  const on = w.get(Rail, railId(w))!.trains;
  if (on < 0) return;
  for (let slot = 0; slot < 2; slot++) {
    const id = trainId(w, slot),
      stops = stopsOf(w, slot),
      n = stops.length;
    for (let guard = 0; guard < 16; guard++) {
      const r = w.get(Train, id)!;
      if (r.phase === TRAIN_PHASE.RUN) {
        const arrival = trainArrives(r);
        if (tick < arrival) {
          replan(w, id, slot, stops, tick);
          break;
        }
        const came = trainDir(r);
        const row = w.mut(Train, id)!;
        Object.assign(row, { phase: TRAIN_PHASE.STAND, at: r.to, from: r.dest, v0: 0, depart: arrival });
        // Q6's kit unloads at Far Head (stop 2).
        if (slot === 1 && row.at === 2 && (row.logs || row.rails)) {
          const rail = w.mut(Rail, railId(w))!;
          rail.depot += row.logs;
          rail.depotRails += row.rails;
          row.logs = row.rails = 0;
        }
        if (slot === 1) wagonArrives(w, row);
        // The way out, judged on arrival (the departure judges it again, with what was asked meanwhile).
        row.sweep = trainWayOut(n, row.at, came, row.req, serviceOf(w, slot, row));
        continue;
      }
      // The footing wagon couples to line 2 standing at the village once it has rolled out; a train standing there
      // when it is due holds its departure for it (at most WORKS.rollTicks).
      if (slot === 1 && r.at === 0 && !r.wagon) {
        const due = w.get(Shed, shedId(w))!.ready;
        if (due >= 0 && tick >= due) {
          w.mut(Train, id)!.wagon = true;
          continue;
        }
        if (due >= 0) break;
      }
      const k = qActive(w),
        kitServing = slot === 1 && k === 5 && w.get(QJob, qjob(w, 5))!.start < 0;
      const dwell = TRAIN.dwellTicks;
      if (kitServing && r.at === 0) {
        const need = depotNeed(w, 5, w.get(QJob, qjob(w, 5))!);
        const n = Math.min(LINE2_KIT.logs - r.logs, need.logs);
        const rails = Math.min(LINE2_KIT.rails - r.rails, need.rails, w.get(Forge, forgeId(w))!.rack);
        if (n || rails) {
          const rail = w.mut(Rail, railId(w))!,
            row = w.mut(Train, id)!;
          rail.out5 += n;
          rail.depotProduced += n;
          row.logs += n;
          rail.shelfOut += rails;
          row.rails += rails;
          if (rails) w.mut(Forge, forgeId(w))!.rack -= rails;
        }
        if (
          depotNeed(w, 5, w.get(QJob, qjob(w, 5))!).rails > 0 &&
          w.get(Forge, forgeId(w))!.lit >= 0 &&
          tick < r.depart + dwell + TRAIN.kitWaitTicks
        )
          break;
      }
      if (
        tick < r.depart + dwell ||
        tick < on + TRAIN.wakeTicks ||
        (slot === 0 && w.get(Cart, cartId(w))!.phase !== CART_PHASE.REST)
      )
        break;
      // Leaving: the way out serves this halt's request that way; the leg runs to the next stop it makes.
      const service = serviceOf(w, slot, r);
      const sweep = trainWayOut(n, r.at, r.sweep, r.req, service);
      const req = reqDrop(r.req, r.at, sweep, n);
      const from = r.from;
      const to = trainNextStop(stops, from, 0, sweep, req, service);
      if (to < 0) break; // nowhere ahead to go (never at a stop of the line: the way out points inward)
      const dest = stops[to]!;
      Object.assign(w.mut(Train, id)!, { phase: TRAIN_PHASE.RUN, to, sweep, depart: tick, req, from, v0: 0, dest });
      break;
    }
  }
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
  if (run.elapsed === schedule.totalTicks) {
    w.mut(QJob, id)!.completion = 1;
    if (k === 4 && w.get(Boiler, boilerId(w))!.state === 'none') boilerPedestal(w);
    // The forge's third made thing: Q6 laid casts the breaker on the boiler's old pedestal.
    if (k === LINE2_STATIONS.length - 1 && w.get(Works, worksId(w))!.breaker === 0)
      w.mut(Works, worksId(w))!.breaker = 1;
  }
}
const line2Tick = defineSystem(
  'rail.line2Tick',
  { writes: [Forge, ForgeClock, QJob, QJobRun, Boiler, Works], phase: 'tick', order: 1 },
  (w, tick: number) => layLine2(w, tick),
);
/** The depot cart, after the forge has poured this tick (so a waiting cart takes a rail the tick it lands). */
const cartTick = defineSystem(
  'rail.cartTick',
  { reads: [QJob, Train], writes: [Cart, Rail, Forge], phase: 'tick', order: 2 },
  (w, tick: number) => cartStep(w, tick),
);
const trainTick = defineSystem(
  'rail.trainTick',
  { reads: [QJob, Cart, Shed], writes: [Train, Rail, Forge, Works], phase: 'tick', order: 3 },
  (w, tick: number) => trainStep(w, tick),
);
/** The Works kiln: once lit with the throat open, one footing down the rollers every castTicks while the rack has
 * room, WORKS.total in all. A full rack waits; the next cast comes as soon as there is room. */
const worksTick = defineSystem(
  'rail.worksTick',
  { writes: [Works, WorksClock], phase: 'tick', order: 5 },
  (w, tick: number) => {
    const id = worksId(w),
      works = w.get(Works, id)!;
    if (
      works.lit < 0 ||
      !(works.seams & SEAM_THROAT) ||
      works.poured >= WORKS.total ||
      works.rack >= WORKS.rackCap ||
      tick - w.get(WorksClock, id)!.lastCast < WORKS.castTicks
    )
      return;
    const wm = w.mut(Works, id)!;
    wm.rack++;
    wm.poured++;
    w.mut(WorksClock, id)!.lastCast = tick;
  },
);
/** The wire's job clock: `ahead` and `end` follow from what the tick advanced (written only when they change). */
const jobClock = defineSystem(
  'rail.jobClock',
  { reads: [JobRun, QJobRun], writes: [Job, QJob], phase: 'tick', order: 4 },
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
  w.run(cartTick, tick);
  w.run(trainTick, tick);
  w.run(worksTick, tick);
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
  const k = cartServing(w);
  const trips = k >= 0 ? Math.floor(ticks / cartCycleTicks(k)) : 0;
  if (trips > 0) {
    // The cart's trips while away, each transfer as the tick would make it: the load under way lands, then whole trips
    // mint logs at the camp and move rails off the (credited) forge rack, and land them. It is home again after.
    cartUnload(w);
    const { logs, rails } = depotNeed(w, k, w.get(QJob, qjob(w, k))!);
    const n = Math.min(logs, trips * CART.load);
    cartMint(w, k, n);
    cartTakeRails(w, Math.min(rails, trips * CART.rails, w.get(Forge, fid)!.rack));
    cartUnload(w);
    Object.assign(w.mut(Cart, cartId(w))!, { phase: CART_PHASE.REST, depart: tick, from: 0 });
    made += n;
  }
  return made;
}
/** Bounded catch-up for the funded stretch only (the yards' credit comes first, from awayCredit). */
const resume = defineSystem(
  'rail.resume',
  {
    writes: [Rail, RailClock, Job, JobRun, QJob, QJobRun, Beam, Forge, ForgeClock, Cart, Boiler, Train, Works],
    phase: 'resume',
    order: 0,
  },
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
  { writes: [Account, Beam, Boiler], phase: 'session', order: 0 },
  (w, { pid, epoch }: { pid: string; epoch: number }) => {
    if (!okPid(pid) || !railInt(epoch, RAILWAY_MAX_INT, 1)) return false;
    const id = w.lookup(Account, pid);
    if (id !== undefined) {
      const old = w.get(Account, id)!;
      if (epoch !== old.epoch + 1) return false;
      Object.assign(w.mut(Account, id)!, { epoch, request: 0 });
      // A player who comes back (a reconnect, a reload) still carries the beam they held: it moves to the new session.
      if (boilerHeld(w, pid)) w.mut(Boiler, boilerId(w))!.epoch = epoch;
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
  { writes: [Rail, RailClock, Pile, Forge, Tree, Rock, Beam, Boiler, Works], phase: 'supply', order: 0 },
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
          // An abandoned footing goes back to the Works rack (past its cap if it must).
          else if (pile.kind === FOOT) w.mut(Works, worksId(w))!.rack += pile.n;
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
    const boiler = w.get(Boiler, boilerId(w))!;
    if (boiler.state === 'ground') {
      const row = w.mut(Boiler, boilerId(w))!;
      row.age = Math.min(RECOVERY_MINUTES, row.age + recover);
      if (e.boiler === row.revision && row.age === 21 && row.revision < RAILWAY_MAX_INT) {
        boilerPedestal(w);
        moved++;
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
    // The point comes from presence: the same bounds as rail.beamDrop and rail.boilerStood, and never -0.
    if (!railInt(q.x, 200000, -200000) || !railInt(q.y, 200000, -200000) || !railInt(q.z, 200000, -200000))
      return false;
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

const boilerStood = defineSystem(
  'rail.boilerStood',
  { writes: [Boiler], phase: 'boiler', order: 1 },
  (w, q: { pid: string; x: number; y: number; z: number }) => {
    const b = w.get(Boiler, boilerId(w))!;
    // The point comes from presence: the same bounds as rail.boilerDrop, and never -0 (off the int schema).
    if (!railInt(q.x, 200000, -200000) || !railInt(q.y, 200000, -200000) || !railInt(q.z, 200000, -200000))
      return false;
    if (b.state !== 'held' || b.holder !== q.pid || (b.x === q.x && b.y === q.y && b.z === q.z)) return false;
    Object.assign(w.mut(Boiler, boilerId(w))!, { x: q.x, y: q.y, z: q.z });
    return true;
  },
);
/** Where the boiler's hauler stands (cm, at their feet), kept on the held boiler as the beam's is
 * (docs/plans/boiler-first-choice.md, Part 3), so an absence past its grace puts it down there. Returns whether it
 * moved. */
export const railBoilerStood = (w: World, pid: string, x: number, y: number, z: number): boolean =>
  w.run(boilerStood, { pid, x, y, z });
const boilerPutDown = defineSystem(
  'rail.boilerPutDown',
  { writes: [Boiler], phase: 'boiler', order: 2 },
  (w, pid: string) => {
    const b = w.get(Boiler, boilerId(w))!;
    const { x, y, z } = b;
    if (!boilerReleasable(w, pid, b.epoch, b.revision)) return 0;
    // Never stood (no presence reached the server since the take): it is still where it was taken from, and one taken
    // off the pedestal goes back onto it rather than lying at its foot.
    const unmoved = x === LINE2_BOILER.x && y === LINE2_BOILER.y && z === LINE2_BOILER.z;
    boilerPedestal(w);
    if (!unmoved && line2BoilerGround(x, y, z))
      Object.assign(w.mut(Boiler, boilerId(w))!, { state: 'ground', x, y, z });
    return 1;
  },
);
/** The hauler stayed away past the grace: the boiler goes down where they last stood, or, off the haul area, back to
 * the pedestal (the beam's rule; owner, 6 November). Never while they hold it in a live session. */
export const railBoilerPutDown = (w: World, pid: string): number => w.run(boilerPutDown, pid);

const footRelease = defineSystem(
  'rail.footRelease',
  { writes: [Account, Works], phase: 'foot', order: 0 },
  (w, q: { pid: string; epoch: number }) => {
    const id = w.lookup(Account, q.pid);
    const a = id === undefined ? undefined : w.get(Account, id)!;
    if (!a || a.foot !== 1 || a.epoch !== q.epoch) return 0;
    w.mut(Account, id!)!.foot = 0;
    w.mut(Works, worksId(w))!.rack++;
    return 1;
  },
);
/** A footing's carrier stayed away past the grace: it goes back to the Works rack, so the kiln's sixteen always reach
 * their sites. What keeps it on a returned carrier's back is the host's live-session check: `r:open` makes the session
 * active and bumps the account epoch in one synchronous step. `epoch` only refuses a release for a session that has
 * since changed; the host passes the current one, so in practice it never does. */
export const railFootRelease = (w: World, pid: string, epoch: number): number => w.run(footRelease, { pid, epoch });
/** Who carries a footing, and in which session (the host's leaver check; accepted state only). */
export function railFootHolders(w: World) {
  const out: { pid: string; epoch: number }[] = [];
  w.each([Account], (_id, a) => void (a.foot > 0 && out.push({ pid: a.pid, epoch: a.epoch })));
  return out;
}
