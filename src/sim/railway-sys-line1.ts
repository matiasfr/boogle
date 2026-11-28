// Line one's systems (docs/plans/ecs-migration-railway.md, section 2): its ops (chop, mine, the bills, piles, the
// racks, the axe, the jump and the great beam), its laying tick, and the beam's absent-carrier paths.
import { defineSystem, type World } from '../ecs/index.ts';
import { RAILWAY_SOURCES, RAILWAY_T1, RAILWAY_YIELD } from './railway-layout.ts';
import { LINE1_GREAT_TREE, LINE1_STATIONS, lineBeamGround } from './railway-line-layout.ts';
import { RAILS } from './railway-line2-layout.ts';
import { layProgress, type LineTiming } from './railway-line-schedule.ts';
import { RAIL_ROCKS } from './railway-works-layout.ts';
import { railInt, RAILWAY_MAX_INT } from './railway.ts';
import { railPos } from './railway-route.ts';
import { LOOSE_PILE_MAX } from './railway-supply.ts';
import {
  Account,
  Aperture,
  Beam,
  Boiler,
  Forge,
  Hardwood,
  Job,
  JobRun,
  Leg,
  Pile,
  Rail,
  Rock,
  Tree,
  Works,
} from './railway-components.ts';
import { takeGivers } from './railway-queries-gift.ts';
import { legKitPut, legKitRetaken } from './railway-sys-route-kit.ts';
import {
  activeStation,
  balanceOf,
  beamId,
  boilerHeld,
  carried,
  FOOT,
  forgeId,
  freePileSlots,
  held,
  hitYield,
  jobId,
  LOGS,
  railId,
  ready,
  roomOf,
  scheduleOf,
  STONE,
  timingOf,
  type AccountRow,
} from './railway-queries.ts';
import type { Act, Tick } from './railway-sys-core.ts';

const pileKind = (kind: unknown) => (kind === 1 || kind === RAILS || kind === FOOT ? kind : 0);
const pileCap = (kind: number) => (kind === FOOT ? 1 : LOOSE_PILE_MAX);
// Confirmed ids precede temporary -request ids; ties at the same point follow creation order on both peers.
const pileOrder = (id: number) => (id < 0 ? RAILWAY_MAX_INT - id : id);
/** n of `kind` onto back a (negative: off it). */
export function credit(a: AccountRow, kind: number, n: number) {
  if (kind === STONE) a.stone += n;
  else if (kind === RAILS) a.rails += n;
  else if (kind === FOOT) a.foot += n;
  else a.carry += n;
}
export const chop = defineSystem(
  'rail.chop',
  { reads: [Boiler, Beam, Pile, Job], writes: [Rail, Tree, Hardwood, Account], phase: 'act', order: 2 },
  (w, { a: aid, e, tick }: Act) => {
    if (!ready(w, tick)) return 0;
    const a = w.mut(Account, aid)!;
    const room = roomOf(w, a, LOGS);
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
      n = Math.min(rail.axe ? RAILWAY_YIELD.axe : hitYield(w), t.left, room);
      t.left -= n;
      // The notch tracks pieces taken, so a tree's felling hit cuts it through (15) at any yield.
      t.work = rail.axe ? Math.min(15, t.work + 5) : Math.min(15, (3 * (RAILWAY_T1.sourceYield - t.left)) >> 1);
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
      n = Math.min(RAILWAY_YIELD.axe, hw.left, room);
      hw.left -= n;
      if (n) hw.work = Math.min(15, hw.work + 5);
      a.carry += n;
    }
    return n;
  },
);
export const mine = defineSystem(
  'rail.mine',
  { reads: [Boiler, Rail, Beam, Pile, Job, Works], writes: [Rock, Account], phase: 'act', order: 3 },
  (w, { a: aid, e, tick }: Act) => {
    const a = w.get(Account, aid)!;
    const room = roomOf(w, a, STONE);
    if (!ready(w, tick) || room <= 0 || !railInt(e.id, RAIL_ROCKS.length - 1)) return 0;
    const rock = w.mut(Rock, w.lookup(Rock, e.id!)!)!;
    const n = Math.min(hitYield(w), rock.left, room);
    rock.left -= n;
    if (n) {
      // The crack tracks stone taken: two pieces a stage, so the breaking hit shows it broken (4) at any yield.
      rock.work = Math.min(4, (RAIL_ROCKS[e.id!]!.initial - rock.left + 1) >> 1);
      w.mut(Account, aid)!.stone += n;
      if (!rock.left) rock.age = 0;
    }
    return n;
  },
);
/** Funds a full line-one station (railway-line fund): the bill moves to allocation and the stretch starts. */
function fund(w: World, slot: number, tick: number, timing: LineTiming) {
  const spec = LINE1_STATIONS[slot]!;
  const id = jobId(w, slot);
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
export const deposit = defineSystem(
  'rail.deposit',
  { reads: [Boiler, Rail, Beam], writes: [Job, JobRun, Account], phase: 'act', order: 4 },
  (w, { a: aid, e, tick, timing }: Act) => {
    const slot = activeStation(w),
      spec = LINE1_STATIONS[slot]!;
    const j = w.get(Job, jobId(w, slot))!;
    if (!ready(w, tick) || e.kind === 2 || e.station !== spec.id || j.start >= 0 || j.completion) return 0;
    const stone = e.kind === 1;
    const a = w.mut(Account, aid)!;
    const carry = stone ? a.stone : a.carry;
    const n = Math.min(e.n!, carry, spec.bill[stone ? 1 : 0] - (stone ? j.stoneStock : j.stock));
    if (n === 0) return 0;
    const jm = w.mut(Job, jobId(w, slot))!;
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
/** Logs or rails put down are no longer a leg rack's units on a back (legKitPut: they are owed again). */
export const putDown = (w: World, aid: number, kind: number, n: number) =>
  legKitPut(w, aid, kind ? 0 : n, kind === RAILS ? n : 0);
/** A West landing stand-in's lost units, taken up again, count held again (greybox leg 2, the second re-check). */
export function pickedUp(w: World, aid: number, kind: number, n: number) {
  if (n > 0 && (kind === 0 || kind === RAILS)) legKitRetaken(w, aid, kind === 0 ? n : 0, kind === RAILS ? n : 0);
}
export const drop = defineSystem(
  'rail.drop',
  { reads: [Aperture, Rail], writes: [Pile, Account, Leg], phase: 'act', order: 5 },
  (w, { a: aid, e }: Act) => {
    const kind = pileKind(e.kind),
      cap = pileCap(kind);
    // A footing goes down whole, never with others.
    if (kind === FOOT && e.n !== 1) return 0;
    const a = w.mut(Account, aid)!;
    const carry = balanceOf(a, kind);
    let at: number | undefined;
    w.each([Pile], (id, p) => {
      if (
        p.kind === kind &&
        p.x === e.x &&
        p.z === e.z &&
        p.y === e.y &&
        p.n < cap &&
        (at === undefined || pileOrder(id) < pileOrder(at))
      )
        at = id;
    });
    const n = Math.min(e.n!, carry, at === undefined ? cap : cap - w.get(Pile, at)!.n);
    if (n <= 0) return 0;
    if (at === undefined) {
      if (freePileSlots(w) < 1 || w.nextId() >= RAILWAY_MAX_INT) return 0;
      w.spawn([Pile, { x: e.x!, y: e.y!, z: e.z!, n, kind, age: 0 }]);
      credit(a, kind, -n);
      putDown(w, aid, kind, n);
      return n;
    }
    const p = w.mut(Pile, at)!;
    p.n += n;
    if (n) p.age = 0;
    credit(a, kind, -n);
    putDown(w, aid, kind, n);
    return n;
  },
);
export const take = defineSystem(
  'rail.take',
  { reads: [Boiler, Rail, Beam, Works], writes: [Pile, Account, Leg], phase: 'act', order: 6 },
  (w, { a: aid, e }: Act) => {
    const a = w.mut(Account, aid)!;
    const kind = pileKind(e.kind);
    const p = railInt(e.id, RAILWAY_MAX_INT, -RAILWAY_MAX_INT) ? w.mut(Pile, e.id) : undefined;
    if (!p || kind !== p.kind) return 0;
    const room = roomOf(w, a, kind);
    const n = Math.min(p.n, room);
    p.n -= n;
    credit(a, kind, n);
    if (!p.n) w.despawn(e.id!);
    pickedUp(w, aid, kind, n);
    return n;
  },
);
export const rackTake = defineSystem(
  'rail.rackTake',
  { reads: [Boiler, Beam, Pile, Works], writes: [Rail, Account, Leg], phase: 'act', order: 7 },
  (w, { a: aid, e }: Act) => {
    const a = w.mut(Account, aid)!;
    if (e.kind === 2) return 0;
    const room = roomOf(w, a, e.kind === 1 ? STONE : LOGS);
    if (room <= 0) return 0;
    const rail = w.mut(Rail, railId(w))!;
    if (e.kind === 1) {
      const n = Math.min(rail.stoneRack, room);
      // Unattributed stone, including returned batches, stays available for pickup.
      let donated = 0;
      w.each([Account], (_id, row) => {
        donated += row.queuedStone;
      });
      const picked = Math.max(0, n - (rail.stoneRack - donated));
      if (picked) takeGivers(w, picked, () => {}, 'queuedStone');
      rail.stoneRack -= n;
      a.stone += n;
      return n;
    }
    const n = Math.min(rail.rack, room);
    const returned = Math.min(n, rail.returnedLogs);
    if (n > returned) takeGivers(w, n - returned, () => {});
    rail.returnedLogs -= returned;
    rail.rack -= n;
    a.carry += n;
    // The rack is the Village halt yard's log bin (docs/plans/halt-yard.md): leg kit left there and taken back counts
    // held again, as a pile's or another yard's take does. Stone is never leg kit, so its branch has nothing to count.
    pickedUp(w, aid, LOGS, n);
    return n;
  },
);
/** railAxeAvailable: the proper axe is the lit forge's first made thing (the great beam pass, 7 November). */
export const axe = defineSystem('rail.axe', { reads: [Forge], writes: [Rail], phase: 'act', order: 8 }, (w) => {
  const rail = w.get(Rail, railId(w))!;
  if (w.get(Forge, forgeId(w))!.lit < 0 || rail.axe) return 0;
  w.mut(Rail, railId(w))!.axe = true;
  return 1;
});
/** The great beam is needed: T3 active and unfunded, the machine ready. Your first axe fells the great tree once
 * Station 3 opens; beam and logs fund it in either order (7 November). */
const beamNeeded = (w: World, tick: number) =>
  ready(w, tick) && activeStation(w) === 2 && w.get(Job, jobId(w, 2))!.start < 0;
export const beamChop = defineSystem(
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
export const beamTake = defineSystem(
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
  Object.assign(b, { state: 'available', holder: '', epoch: 0, age: 0, x: LINE1_GREAT_TREE.x, y: 2970 });
  b.z = LINE1_GREAT_TREE.z;
  b.revision++;
}
const releasable = (w: World, pid: string, epoch: number, revision: number) => {
  const b = w.get(Beam, beamId(w))!;
  return (
    b.state === 'held' && b.holder === pid && b.epoch === epoch && b.revision === revision && revision < 2147483647
  );
};
export const beamDrop = defineSystem(
  'rail.beamDrop',
  { reads: [Account], writes: [Beam], phase: 'act', order: 11 },
  (w, { a: aid, e }: Act) => {
    const a = w.get(Account, aid)!;
    if (!held(w, a.pid) || e.revision !== w.get(Beam, beamId(w))!.revision) return 0;
    if (!releasable(w, a.pid, a.epoch, e.revision!)) return 0;
    release(w);
    if (railPos(e.x) && railPos(e.y) && railPos(e.z) && lineBeamGround(e.x, e.y, e.z))
      Object.assign(w.mut(Beam, beamId(w))!, { state: 'ground', x: e.x, y: e.y, z: e.z });
    return 1;
  },
);
export const beamDeposit = defineSystem(
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
export const jump = defineSystem(
  'rail.jump',
  { reads: [Job], writes: [Rail], phase: 'act', order: 13 },
  (w, { e }: Act) => {
    if (w.get(Rail, railId(w))!.jump) return 0;
    if (e.station !== undefined || !w.get(Job, jobId(w, 2))!.completion) return 0;
    w.mut(Rail, railId(w))!.jump = true;
    return 1;
  },
);
export function layLine1(w: World, tick: number) {
  const slot = activeStation(w),
    id = jobId(w, slot);
  const j = w.get(Job, id)!;
  if (j.start < 0 || j.completion) return;
  const spec = LINE1_STATIONS[slot]!,
    schedule = scheduleOf(spec, j);
  const run = w.mut(JobRun, id)!;
  run.elapsed = Math.min(schedule.totalTicks, run.elapsed + Math.max(0, tick - run.lastTick));
  run.lastTick = tick;
  const lay = layProgress(spec, schedule, run.elapsed);
  [run.used, run.allocation] = [lay.used, lay.allocation];
  if (slot > 0) [run.stoneUsed, run.stoneAllocation] = [lay.used2, lay.allocation2];
  if (run.elapsed === schedule.totalTicks) {
    w.mut(Job, id)!.completion = 1;
    if (slot === 2) w.mut(Beam, beamId(w))!.state = 'used';
  }
}
export const lineTick = defineSystem(
  'rail.lineTick',
  { reads: [Rail], writes: [Job, JobRun, Beam], phase: 'tick', order: 0 },
  (w, { tick }: Tick) => layLine1(w, tick),
);
export const beamRelease = defineSystem(
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
export const beamStood = defineSystem(
  'rail.beamStood',
  { writes: [Beam], phase: 'beam', order: 1 },
  (w, q: { pid: string; x: number; y: number; z: number }) => {
    const b = w.get(Beam, beamId(w))!;
    // The point comes from presence: the same bounds as rail.beamDrop and rail.boilerStood, and never -0.
    if (!railPos(q.x) || !railPos(q.y) || !railPos(q.z)) return false;
    if (b.state !== 'held' || b.holder !== q.pid || (b.x === q.x && b.y === q.y && b.z === q.z)) return false;
    Object.assign(w.mut(Beam, beamId(w))!, { x: q.x, y: q.y, z: q.z });
    return true;
  },
);
/** Where the beam's carrier stands (cm, at their feet), kept on the held beam so an absence that outlasts its grace
 * (and a server restart) puts it down there. Returns whether it moved. */
export const railBeamStood = (w: World, pid: string, x: number, y: number, z: number): boolean =>
  w.run(beamStood, { pid, x, y, z });
export const beamPutDown = defineSystem(
  'rail.beamPutDown',
  { writes: [Beam], phase: 'beam', order: 2 },
  (w, pid: string) => {
    const b = w.get(Beam, beamId(w))!;
    if (b.state !== 'held' || b.holder !== pid || b.revision >= 2147483647) return 0;
    const { x, y, z } = b;
    if (!releasable(w, pid, b.epoch, b.revision)) return 0;
    release(w);
    if (lineBeamGround(x, y, z)) Object.assign(w.mut(Beam, beamId(w))!, { state: 'ground', x, y, z });
    return 1;
  },
);
/** The carrier stayed away past the grace: the beam goes down where they last stood, or, off the work area, back to
 * the tree. Never while they hold it in a live session. */
export const railBeamPutDown = (w: World, pid: string): number => w.run(beamPutDown, pid);
