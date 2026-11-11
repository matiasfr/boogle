// The derived `Railway` read model (docs/plans/ecs-e.md, section 4): rebuilt from the world (./railway-components.ts)
// for the views, the read helpers (railCounts, railPhase, line2Active, ...) and validation, and never written back.
//
//   railwayView(world)             today's `Railway` shape, from the components
//   fillRailway(target, world)     the same, into an existing object (a mirror's stable read model)
//   refreshRailway(s, world)       patch it with what changed since (the replicated components' change marks)
//   copyRailway(s)                 a copy with nothing shared (the predictor's scratch read model)
import type { AnyComponent, World } from '../ecs/index.ts';
import { RAILWAY_SOURCES } from './railway-layout.ts';
import { LINE1_CATALOG, LINE1_STATIONS } from './railway-line-layout.ts';
import { RAIL_ROCKS } from './railway-works-layout.ts';
import type { RailShed, RailWorks } from './railway-works.ts';
import { LINE2_STATIONS } from './railway-line2-layout.ts';
import type { RailBeam, RailJob } from './railway-line.ts';
import type { RailBoiler, RailQJob } from './railway-line2.ts';
import type { RailTrain } from './railway-train.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import type { RailLineRow } from './railway-trains.ts';
import type { RailCart } from './railway-cart.ts';
import type { RailRing, Railway, RailResult } from './railway.ts';
import {
  Account,
  Aperture,
  Beam,
  Boiler,
  Cart,
  DEPOT_OUT,
  Forge,
  ForgeClock,
  Hardwood,
  Job,
  JobRun,
  Line,
  Outcome,
  Pile,
  QJob,
  QJobRun,
  Rail,
  RAIL_REPLICATED,
  RAIL_STATUS,
  RailClock,
  Rock,
  Shed,
  TIMING,
  Train,
  Tree,
  Works,
  WorksClock,
} from './railway-components.ts';

type Bits = { left: number; work: number };
/** A plain copy of a row's schema fields (rows carry the store's bookkeeping, which a read model must not). */
function copyOf(c: AnyComponent, row: object): unknown {
  const out: Record<string, unknown> = {};
  for (const f of c.names) out[f] = (row as Record<string, unknown>)[f];
  return out;
}
function bySlot<T>(w: World, c: AnyComponent, n: number, pick: (id: number) => T): T[] {
  return Array.from({ length: n }, (_v, slot) => {
    const id = w.lookup(c, slot);
    if (id === undefined) throw new Error(`railway: ${c.kind} ${slot} missing`);
    return pick(id);
  });
}
function jobOf(w: World, id: number) {
  const j = w.get(Job, id)!,
    r = w.get(JobRun, id)!;
  const timing = Object.fromEntries(Object.keys(TIMING).map((k) => [k, j[k as keyof typeof TIMING]]));
  return {
    stock: j.stock,
    allocation: r.allocation,
    used: r.used,
    delivered: j.delivered,
    start: j.start,
    elapsed: r.elapsed,
    lastTick: r.lastTick,
    completion: j.completion,
    stoneStock: j.stoneStock,
    stoneAllocation: r.stoneAllocation,
    stoneUsed: r.stoneUsed,
    stoneDelivered: j.stoneDelivered,
    timing,
  } as RailJob;
}
function qjobOf(w: World, id: number): RailQJob {
  const j = w.get(QJob, id)!,
    r = w.get(QJobRun, id)!;
  const timing = Object.fromEntries(Object.keys(TIMING).map((k) => [k, j[k as keyof typeof TIMING]]));
  return {
    stock: j.stock,
    railStock: j.railStock,
    allocation: r.allocation,
    railAllocation: r.railAllocation,
    used: r.used,
    railUsed: r.railUsed,
    delivered: j.delivered,
    railDelivered: j.railDelivered,
    start: j.start,
    elapsed: r.elapsed,
    lastTick: r.lastTick,
    completion: j.completion,
    timing: timing as RailQJob['timing'],
  };
}

/** Today's `Railway` shape, rebuilt from the world. */
export function railwayView(w: World): Railway {
  const railId = w.single(Rail);
  const rail = w.get(Rail, railId)!,
    clock = w.get(RailClock, railId)!;
  const forgeId = w.single(Forge);
  const forge = w.get(Forge, forgeId)!;
  const beam = w.get(Beam, w.single(Beam))!;
  const trees = bySlot(w, Tree, RAILWAY_SOURCES.length, (id) => w.get(Tree, id)!);
  const hardwood = bySlot<Bits>(w, Hardwood, 2, (id) => w.get(Hardwood, id)!);
  const rocks = bySlot(w, Rock, RAIL_ROCKS.length, (id) => w.get(Rock, id)!);
  const jobs = bySlot(w, Job, LINE1_STATIONS.length, (id) => jobOf(w, id));
  const t1 = jobs[0]!;
  const accounts: Railway['accounts'] = [];
  w.each([Account], (_id, a) => accounts.push(copyOf(Account, a) as Railway['accounts'][number]));
  const piles: Railway['piles'] = [];
  w.each([Pile], (id, p) => piles.push({ id, x: p.x, z: p.z, n: p.n, kind: p.kind, y: p.y, age: p.age }));
  const outcomes: Railway['outcomes'] = [];
  w.each([Outcome], (_id, o) =>
    outcomes.push({
      pid: o.pid,
      epoch: o.epoch,
      request: o.request,
      accepted: o.accepted,
      status: RAIL_STATUS[o.status] ?? ('?' as RailResult['status']),
    }),
  );
  const trains = bySlot(w, Train, RAIL_TRAINS.length, (id) => copyOf(Train, w.get(Train, id)!) as RailTrain);
  return {
    catalog: LINE1_CATALOG,
    sources: trees.map((t) => t.left),
    work: trees.map((t) => t.work),
    accounts,
    piles,
    outcomes,
    nextPile: w.nextId(),
    awake: rail.awake,
    stock: t1.stock,
    allocation: t1.allocation,
    used: t1.used,
    delivered: t1.delivered,
    start: t1.start,
    elapsed: t1.elapsed,
    lastTick: t1.lastTick,
    resumeMarker: clock.resumeMarker,
    completion: t1.completion,
    timing: t1.timing,
    stoneStock: t1.stoneStock,
    stoneAllocation: t1.stoneAllocation,
    stoneUsed: t1.stoneUsed,
    stoneDelivered: t1.stoneDelivered,
    line: {
      jobs: [jobs[1]!, jobs[2]!],
      axe: rail.axe,
      jump: rail.jump,
      rocks: rocks.map((r) => r.left),
      rockWork: rocks.map((r) => r.work),
      rockAge: rocks.map((r) => r.age),
      stoneRack: rail.stoneRack,
      stoneProduced: rail.stoneProduced,
      upgrades: trees.map((t) => t.big),
      hardwood: hardwood.map((h) => h.left),
      hardwoodWork: hardwood.map((h) => h.work),
      beam: copyOf(Beam, beam) as RailBeam,
    },
    line2: {
      forge: {
        used: forge.used,
        lit: forge.lit,
        rack: forge.rack,
        poured: forge.poured,
        lastPour: w.get(ForgeClock, forgeId)!.lastPour,
      },
      jobs: bySlot(w, QJob, LINE2_STATIONS.length, (id) => qjobOf(w, id)),
      depot: rail.depot,
      depotProduced: rail.depotProduced,
      depotOut: DEPOT_OUT.map((k) => rail[k]),
      lever: rail.lever,
      sea: rail.sea,
      hook: rail.hook,
      glide: rail.glide,
      pack: rail.pack,
      depotRails: rail.depotRails,
      shelfOut: rail.shelfOut,
      boiler: copyOf(Boiler, w.get(Boiler, w.single(Boiler))!) as RailBoiler,
      trains: rail.trains,
      cart: copyOf(Cart, w.get(Cart, w.single(Cart))!) as RailCart,
    },
    trains,
    lines: bySlot(w, Line, RAIL_LINES.length, (id) => lineOf(w, id)),
    works: worksOf(w),
    shed: copyOf(Shed, w.get(Shed, w.single(Shed))!) as RailShed,
    ring: copyOf(Aperture, w.get(Aperture, w.single(Aperture))!) as RailRing,
    falls: { yaw: trees.map((t) => t.yaw), collapsed: trees.map((t) => t.fell) },
    supply: { marker: clock.supplyMarker, ages: trees.map((t) => t.age), rack: rail.rack, produced: rail.produced },
  };
}
function lineOf(w: World, id: number): RailLineRow {
  const l = w.get(Line, id)!;
  return { req: l.req, left0: l.left0, left1: l.left1 };
}
function worksOf(w: World): RailWorks {
  const id = w.single(Works);
  return { ...(copyOf(Works, w.get(Works, id)!) as RailWorks), lastCast: w.get(WorksClock, id)!.lastCast };
}
/** Rebuild into an existing object (whose identity a reader holds). */
export function fillRailway(target: Railway, w: World) {
  for (const c of RAIL_REPLICATED) w.changes(c); // what it shows from here on is what refreshRailway patches
  return Object.assign(target, railwayView(w));
}
/** Patch a read model last filled from this world (or the world it was cloned from) with what changed since, from
 * the replicated components' change marks: a press or a packet rebuilds a few rows, not the railway. The request
 * history and this side's bookkeeping (outcomes, resume and supply markers) are not refreshed: no client reads them. */
export function refreshRailway(s: Railway, w: World) {
  const l = s.line!,
    l2 = s.line2!;
  for (const id of w.changes(Tree)) {
    const t = w.get(Tree, id);
    if (!t) continue;
    s.sources[t.slot] = t.left;
    s.work[t.slot] = t.work;
    s.falls!.yaw[t.slot] = t.yaw;
    s.falls!.collapsed[t.slot] = t.fell;
    s.supply!.ages[t.slot] = t.age;
    l.upgrades[t.slot] = t.big;
  }
  for (const id of w.changes(Hardwood)) {
    const h = w.get(Hardwood, id);
    if (h) [l.hardwood[h.slot], l.hardwoodWork[h.slot]] = [h.left, h.work];
  }
  for (const id of w.changes(Rock)) {
    const r = w.get(Rock, id);
    if (r) [l.rocks[r.slot], l.rockWork[r.slot], l.rockAge[r.slot]] = [r.left, r.work, r.age];
  }
  if (w.changes(Pile).length) {
    s.piles = [];
    w.each([Pile], (id, p) => s.piles.push({ id, x: p.x, z: p.z, n: p.n, kind: p.kind, y: p.y, age: p.age }));
  }
  s.nextPile = w.nextId();
  if (w.changes(Account).length) {
    s.accounts = [];
    w.each([Account], (_id, a) => s.accounts.push(copyOf(Account, a) as Railway['accounts'][number]));
  }
  for (const id of w.changes(Job)) {
    const slot = w.get(Job, id)?.slot;
    if (slot === 0) Object.assign(s, jobOf(w, id));
    else if (slot !== undefined) l.jobs[slot - 1] = jobOf(w, id);
  }
  for (const id of w.changes(QJob)) {
    const slot = w.get(QJob, id)?.slot;
    if (slot !== undefined) l2.jobs[slot] = qjobOf(w, id);
  }
  if (w.changes(Beam).length) l.beam = copyOf(Beam, w.get(Beam, w.single(Beam))!) as RailBeam;
  if (w.changes(Forge).length) {
    const id = w.single(Forge),
      f = w.get(Forge, id)!;
    l2.forge = { used: f.used, lit: f.lit, rack: f.rack, poured: f.poured, lastPour: w.get(ForgeClock, id)!.lastPour };
  }
  if (w.changes(Boiler).length) l2.boiler = copyOf(Boiler, w.get(Boiler, w.single(Boiler))!) as RailBoiler;
  for (const id of w.changes(Train)) {
    const r = w.get(Train, id)!;
    s.trains[r.slot] = copyOf(Train, r) as RailTrain;
  }
  for (const id of w.changes(Line)) {
    const slot = w.get(Line, id)?.slot;
    if (slot !== undefined) s.lines[slot] = lineOf(w, id);
  }
  if (w.changes(Cart).length) l2.cart = copyOf(Cart, w.get(Cart, w.single(Cart))!) as RailCart;
  if (w.changes(Works).length) s.works = worksOf(w);
  if (w.changes(Shed).length) s.shed = copyOf(Shed, w.get(Shed, w.single(Shed))!) as RailShed;
  if (w.changes(Aperture).length) s.ring = copyOf(Aperture, w.get(Aperture, w.single(Aperture))!) as RailRing;
  if (w.changes(Rail).length) {
    const r = w.get(Rail, w.single(Rail))!;
    s.awake = r.awake;
    Object.assign(l, { axe: r.axe, jump: r.jump, stoneRack: r.stoneRack, stoneProduced: r.stoneProduced });
    Object.assign(s.supply!, { rack: r.rack, produced: r.produced });
    Object.assign(l2, {
      trains: r.trains,
      depot: r.depot,
      depotProduced: r.depotProduced,
      lever: r.lever,
      sea: r.sea,
      hook: r.hook,
      glide: r.glide,
      pack: r.pack,
      depotRails: r.depotRails,
      shelfOut: r.shelfOut,
    });
    l2.depotOut = DEPOT_OUT.map((k) => r[k]);
  }
  return s;
}
/** A copy of a read model (arrays and rows copied, nothing shared): the predictor's scratch read model. */
export function copyRailway(s: Railway): Railway {
  const l = s.line!,
    l2 = s.line2!;
  const job = <J extends { timing?: unknown }>(j: J): J => ({ ...j, timing: { ...(j.timing as object) } });
  const trains = s.trains.map((r) => ({ ...r }));
  return {
    ...job(s),
    sources: s.sources.slice(),
    work: s.work.slice(),
    accounts: s.accounts.map((a) => ({ ...a })),
    piles: s.piles.map((p) => ({ ...p })),
    outcomes: s.outcomes.map((o) => ({ ...o })),
    line: {
      ...l,
      jobs: [job(l.jobs[0]), job(l.jobs[1])],
      rocks: l.rocks.slice(),
      rockWork: l.rockWork.slice(),
      rockAge: l.rockAge.slice(),
      upgrades: l.upgrades.slice(),
      hardwood: l.hardwood.slice(),
      hardwoodWork: l.hardwoodWork.slice(),
      beam: { ...l.beam },
    },
    line2: {
      ...l2,
      forge: { ...l2.forge },
      jobs: l2.jobs.map(job),
      depotOut: l2.depotOut.slice(),
      cart: { ...l2.cart },
      boiler: { ...l2.boiler },
    },
    trains,
    lines: s.lines.map((l) => ({ ...l })),
    works: { ...s.works! },
    shed: { ...s.shed! },
    ring: { ...s.ring! },
    falls: { yaw: s.falls!.yaw.slice(), collapsed: s.falls!.collapsed.slice() },
    supply: { ...s.supply!, ages: s.supply!.ages.slice() },
  };
}
