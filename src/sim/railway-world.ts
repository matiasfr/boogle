// The railway on E (docs/plans/ecs-e.md, section 4): its components, a fresh world, the derived `Railway` read model
// and the load check. The world owns the railway's state on the server and in each client's mirror and prediction;
// systems (./railway-systems.ts) are the only writers. `Railway` is rebuilt from the world for the views, the read
// helpers (railCounts, railPhase, line2Active, ...) and validation, and is never written back.
//
//   components                     tree, hardwood, rock, pile, account, job(+jobRun), qjob(+qjobRun), beam,
//                                  forge(+forgeClock), rail(+railClock), cart, boiler, train, works(+worksClock), shed,
//                                  outcome; RAIL_REPLICATED is the wire
//   createRailwayWorld(opts)       the fresh railway: one entity per catalog thing, spawned in catalog order
//   railwayView(world)             today's `Railway` shape, from the components
//   fillRailway(target, world)     the same, into an existing object (a mirror's stable read model)
//   railwayCheck(world)            the load check: archetypes, counts, then every domain invariant on the view
import { createWorld, defineComponent, type AnyComponent, type World } from '../ecs/index.ts';
import { MAX_PLAYERS, okPid } from './roster.ts';
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_CATALOG, LINE1_GREAT_TREE, LINE1_STATIONS } from './railway-line-layout.ts';
import { RAIL_ROCKS } from './railway-works-layout.ts';
import { validateRailWorks, type RailShed, type RailWorks } from './railway-works.ts';
import { LINE2_STATIONS } from './railway-line2-layout.ts';
import { LINE_TIMING, validateRailLine, type RailBeam, type RailJob } from './railway-line.ts';
import { railCarryMax, validateRailLine2, type RailQJob } from './railway-line2.ts';
import { TRAIN_HOME, type RailTrain } from './railway-train.ts';
import type { RailBoiler } from './railway-line2.ts';
import type { RailCart } from './railway-cart.ts';
import { RECOVERY_MINUTES } from './railway-supply.ts';
import { railCounts, railInt, railYaw, RAILWAY_MAX_INT, RAILWAY_OUTCOMES, RAILWAY_PILES } from './railway.ts';
import type { Railway, RailResult } from './railway.ts';

const TIMING = {
  depositMs: 'int',
  feedIntervalMs: 'int',
  logFlightMs: 'int',
  stoneFlightMs: 'int',
  beamFlightMs: 'int',
  cruiseCmPerTick: 'int',
  departureTicks: 'int',
} as const;
// The wire carries a funded job's start tick, `ahead` (offline catch-up past start: elapsed = tick - start + ahead)
// and, once complete, its end tick; jobRun holds what the rule tick advances, which no client needs a packet for.
const CLOCK = { start: 'int', ahead: 'int', end: 'int', completion: 'int' } as const;
const clockDefaults = { start: -1, end: -1, ...LINE_TIMING };

export const RailClock = defineComponent(
  'railClock',
  { resumeMarker: 'int', supplyMarker: 'int' },
  { replicate: false },
);
export const Rail = defineComponent(
  'rail',
  {
    awake: 'int',
    axe: 'bool',
    jump: 'bool',
    stoneRack: 'int',
    stoneProduced: 'int',
    rack: 'int',
    produced: 'int',
    depot: 'int',
    depotProduced: 'int',
    lever: 'bool',
    sea: 'bool',
    hook: 'bool',
    out0: 'int',
    out1: 'int',
    out2: 'int',
    out3: 'int',
    out4: 'int',
    out5: 'int',
    trains: 'int',
    pack: 'bool',
    depotRails: 'int',
    shelfOut: 'int',
  },
  { requires: [RailClock], defaults: { awake: -1, trains: -1 } },
);
export const Beam = defineComponent(
  'beam',
  {
    state: 'str',
    work: 'int',
    holder: 'str',
    epoch: 'int',
    revision: 'int',
    x: 'int',
    y: 'int',
    z: 'int',
    age: 'int',
  },
  { defaults: { state: 'standing', x: LINE1_GREAT_TREE.x, y: 3000, z: LINE1_GREAT_TREE.z } },
);
/** The depot cart (./railway-cart.ts): sent only when its phase changes; its place on the road follows from the tick. */
export const Cart = defineComponent('cart', {
  phase: 'u8',
  depart: 'int',
  from: 'int',
  to: 'int',
  logs: 'int',
  rails: 'int',
  recall: 'bool',
});
export const Boiler = defineComponent(
  'boiler',
  {
    state: 'str',
    holder: 'str',
    epoch: 'int',
    revision: 'int',
    x: 'int',
    y: 'int',
    z: 'int',
    age: 'int',
  },
  { defaults: { state: 'none', x: 91900, y: 1815, z: 540 } },
);
export const Train = defineComponent(
  'train',
  {
    slot: 'int',
    phase: 'u8',
    at: 'int',
    to: 'int',
    sweep: 'int',
    depart: 'int',
    call: 'int',
    logs: 'int',
    rails: 'int',
    wagon: 'bool',
    foot: 'int',
  },
  { key: 'slot', defaults: { call: -1, sweep: 1 } },
);
/** Split-rock Works (./railway-works.ts): the breaker, the seams, the kiln, its rack and the pier's footings. */
export const WorksClock = defineComponent('worksClock', { lastCast: 'int' }, { replicate: false });
export const Works = defineComponent(
  'works',
  {
    breaker: 'u8',
    seams: 'u8',
    logs: 'int',
    stone: 'int',
    lit: 'int',
    rack: 'int',
    poured: 'int',
    pierRack: 'int',
    pierSet: 'int',
    crossing: 'int',
  },
  { requires: [WorksClock], defaults: { lit: -1, crossing: -1 } },
);
/** The Roundhouse stall at Home's turntable: its footings, the wagon's cradle, the table and the wagon's roll-out. */
export const Shed = defineComponent(
  'shed',
  {
    stall: 'int',
    cradle: 'int',
    cradleRails: 'int',
    fitted: 'int',
    table: 'u8',
    tableRev: 'int',
    ready: 'int',
  },
  { defaults: { fitted: -1, ready: -1 } },
);
export const ForgeClock = defineComponent('forgeClock', { lastPour: 'int' }, { replicate: false });
export const Forge = defineComponent(
  'forge',
  { used: 'int', lit: 'int', rack: 'int', poured: 'int' },
  { requires: [ForgeClock], defaults: { lit: -1 } },
);
export const JobRun = defineComponent(
  'jobRun',
  { allocation: 'int', used: 'int', stoneAllocation: 'int', stoneUsed: 'int', elapsed: 'int', lastTick: 'int' },
  { replicate: false },
);
export const Job = defineComponent(
  'job',
  { slot: 'int', stock: 'int', delivered: 'int', stoneStock: 'int', stoneDelivered: 'int', ...CLOCK, ...TIMING },
  { key: 'slot', requires: [JobRun], defaults: clockDefaults },
);
export const QJobRun = defineComponent(
  'qjobRun',
  { allocation: 'int', railAllocation: 'int', used: 'int', railUsed: 'int', elapsed: 'int', lastTick: 'int' },
  { replicate: false },
);
export const QJob = defineComponent(
  'qjob',
  { slot: 'int', stock: 'int', railStock: 'int', delivered: 'int', railDelivered: 'int', ...CLOCK, ...TIMING },
  { key: 'slot', requires: [QJobRun], defaults: clockDefaults },
);
export const Tree = defineComponent(
  'tree',
  { slot: 'int', left: 'int', work: 'int', yaw: 'f64', fell: 'bool', age: 'int', big: 'bool' },
  { key: 'slot' },
);
export const Hardwood = defineComponent('hardwood', { slot: 'int', left: 'int', work: 'int' }, { key: 'slot' });
export const Rock = defineComponent('rock', { slot: 'int', left: 'int', work: 'int', age: 'int' }, { key: 'slot' });
/** A pile's id is its entity id. */
export const Pile = defineComponent('pile', { x: 'int', y: 'int', z: 'int', n: 'int', kind: 'int', age: 'int' });
export const Account = defineComponent(
  'account',
  { pid: 'str', carry: 'int', stone: 'int', rails: 'int', foot: 'int', epoch: 'int', request: 'int' },
  { key: 'pid' },
);
/** The bounded request history (RAILWAY_OUTCOMES, oldest despawned): the server's idempotency record. */
export const Outcome = defineComponent(
  'outcome',
  { pid: 'str', epoch: 'int', request: 'int', status: 'u8', accepted: 'int' },
  { replicate: false },
);
export const RAIL_COMPONENTS: readonly AnyComponent[] = [
  Rail,
  RailClock,
  Beam,
  Forge,
  ForgeClock,
  Job,
  JobRun,
  QJob,
  QJobRun,
  Tree,
  Hardwood,
  Rock,
  Pile,
  Account,
  Outcome,
  Cart,
  Boiler,
  Train,
  Works,
  WorksClock,
  Shed,
];
/** What a client is sent: the replicated components (the wire schema, one source with the save). */
export const RAIL_REPLICATED = RAIL_COMPONENTS.filter((c) => c.replicate);
export const RAIL_STATUS = ['accepted', 'noop', 'rejected'] as const satisfies readonly RailResult['status'][];
export const DEPOT_OUT = ['out0', 'out1', 'out2', 'out3', 'out4', 'out5'] as const;
if (LINE2_STATIONS.length !== DEPOT_OUT.length) throw new Error('railway: depot outputs');

/** The fresh railway, catalog entities spawned in a fixed order (so a fresh world's ids match on every machine). */
export function createRailwayWorld(opts: { audit?: boolean } = {}) {
  const w = createWorld(RAIL_COMPONENTS, opts);
  w.spawn([Rail, {}], [RailClock, {}]);
  w.spawn([Beam, {}]);
  w.spawn([Forge, {}], [ForgeClock, {}]);
  LINE1_STATIONS.forEach((_s, slot) => w.spawn([Job, { slot }], [JobRun, {}]));
  LINE2_STATIONS.forEach((_s, slot) => w.spawn([QJob, { slot }], [QJobRun, {}]));
  RAILWAY_SOURCES.forEach((_s, slot) => w.spawn([Tree, { slot, left: T1.sourceYield }]));
  for (let slot = 0; slot < 2; slot++) w.spawn([Hardwood, { slot, left: 15 }]);
  RAIL_ROCKS.forEach((r, slot) => w.spawn([Rock, { slot, left: r.initial }]));
  w.spawn([Cart, {}]);
  w.spawn([Boiler, {}]);
  TRAIN_HOME.forEach((at, slot) => w.spawn([Train, { slot, at, to: at }]));
  w.spawn([Works, {}], [WorksClock, {}]);
  w.spawn([Shed, {}]);
  return w;
}

// ---------------------------------------------------------------- the read model
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
      pack: rail.pack,
      depotRails: rail.depotRails,
      shelfOut: rail.shelfOut,
      boiler: copyOf(Boiler, w.get(Boiler, w.single(Boiler))!) as RailBoiler,
      trains: rail.trains,
      train: bySlot(w, Train, 2, (id) => copyOf(Train, w.get(Train, id)!) as RailTrain),
      cart: copyOf(Cart, w.get(Cart, w.single(Cart))!) as RailCart,
    },
    works: worksOf(w),
    shed: copyOf(Shed, w.get(Shed, w.single(Shed))!) as RailShed,
    falls: { yaw: trees.map((t) => t.yaw), collapsed: trees.map((t) => t.fell) },
    supply: { marker: clock.supplyMarker, ages: trees.map((t) => t.age), rack: rail.rack, produced: rail.produced },
  };
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
    l2.train[r.slot] = copyOf(Train, r) as RailTrain;
  }
  if (w.changes(Cart).length) l2.cart = copyOf(Cart, w.get(Cart, w.single(Cart))!) as RailCart;
  if (w.changes(Works).length) s.works = worksOf(w);
  if (w.changes(Shed).length) s.shed = copyOf(Shed, w.get(Shed, w.single(Shed))!) as RailShed;
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
      train: l2.train.map((r) => ({ ...r })),
    },
    works: { ...s.works! },
    shed: { ...s.shed! },
    falls: { yaw: s.falls!.yaw.slice(), collapsed: s.falls!.collapsed.slice() },
    supply: { ...s.supply!, ages: s.supply!.ages.slice() },
  };
}

// ---------------------------------------------------------------- the load check
const ARCHETYPES = [
  [Rail, RailClock],
  [Beam],
  [Forge, ForgeClock],
  [Job, JobRun],
  [QJob, QJobRun],
  [Tree],
  [Hardwood],
  [Rock],
  [Pile],
  [Account],
  [Outcome],
  [Cart],
  [Boiler],
  [Train],
  [Works, WorksClock],
  [Shed],
].map((set) => set.map((c) => c.kind).join());
/** Every entity has a known shape, the catalog is whole, and every domain invariant holds on the read model. */
export function railwayCheck(w: World) {
  const shapes = new Map<number, string[]>();
  for (const c of RAIL_COMPONENTS)
    for (const id of w.ids(c)) {
      const s = shapes.get(id) ?? [];
      s.push(c.kind);
      shapes.set(id, s);
    }
  for (const [id, kinds] of shapes)
    if (!ARCHETYPES.includes(kinds.join())) throw new Error(`railway: entity ${id} is ${kinds.join('+')}`);
  for (const [c, n] of [
    [Rail, 1],
    [Beam, 1],
    [Forge, 1],
    [Job, LINE1_STATIONS.length],
    [QJob, LINE2_STATIONS.length],
    [Tree, RAILWAY_SOURCES.length],
    [Hardwood, 2],
    [Rock, RAIL_ROCKS.length],
    [Cart, 1],
    [Boiler, 1],
    [Train, 2],
    [Works, 1],
    [Shed, 1],
  ] as const)
    if (w.count(c) !== n) throw new Error(`railway: ${w.count(c)} ${c.kind}`);
  if (w.count(Account) > MAX_PLAYERS || w.count(Pile) > RAILWAY_PILES || w.count(Outcome) > RAILWAY_OUTCOMES)
    throw new Error('railway: rows');
  if (!railInt(w.nextId(), RAILWAY_MAX_INT, 1)) throw new Error('railway: next id');
  validateRailway(railwayView(w));
}

/** The domain's invariants on the read model (what the hand-written loader checked after decoding). */
export function validateRailway(n: Railway) {
  if (n.sources.some((v) => !railInt(v, 15)) || n.work.length !== n.sources.length) throw new Error('railway: catalog');
  if (n.falls!.yaw.some((yaw, k) => !railYaw(yaw) || (n.sources[k] !== 0 && (yaw !== 0 || n.falls!.collapsed[k]))))
    throw new Error('railway: fall state');
  const carryMax = railCarryMax(n);
  if (
    new Set(n.accounts.map((a) => a.pid)).size !== n.accounts.length ||
    n.accounts.some(
      (a) =>
        !okPid(a.pid) ||
        !railInt(a.carry, carryMax) ||
        !railInt(a.stone, carryMax) ||
        !railInt(a.rails, carryMax) ||
        a.carry + a.stone! + a.rails! > carryMax ||
        !railInt(a.epoch, RAILWAY_MAX_INT, 1) ||
        !railInt(a.request),
    )
  )
    throw new Error('railway: accounts');
  if (
    n.piles.some(
      (p) =>
        !railInt(p.id, n.nextPile - 1, 1) ||
        !railInt(p.n, T1.carry, 1) ||
        !railInt(p.kind, 3) ||
        !railInt(p.x, 200000, -200000) ||
        !railInt(p.z, 200000, -200000) ||
        !railInt(p.y, 200000, -200000) ||
        !railInt(p.age, RECOVERY_MINUTES),
    )
  )
    throw new Error('railway: piles');
  if (!railInt(n.awake, RAILWAY_MAX_INT, -1)) throw new Error('railway: tick');
  if (n.awake < 0 && n.work.some((v) => v > 0)) throw new Error('railway: sleeping harvest');
  if (!railInt(n.resumeMarker, Number.MAX_SAFE_INTEGER)) throw new Error('railway: clock');
  if (
    n.outcomes.some((r) => {
      const a = n.accounts.find((row) => row.pid === r.pid);
      return (
        !a ||
        !railInt(r.epoch, a.epoch, 1) ||
        !railInt(r.request, RAILWAY_MAX_INT, 1) ||
        (r.epoch === a.epoch && r.request > a.request) ||
        !railInt(r.accepted, carryMax) ||
        !RAIL_STATUS.includes(r.status as never) ||
        (r.status === 'accepted') !== r.accepted > 0
      );
    }) ||
    new Set(n.outcomes.map((r) => `${r.pid}/${r.epoch}/${r.request}`)).size !== n.outcomes.length
  )
    throw new Error('railway: outcomes');
  const s = n.supply!;
  if (
    !railInt(s.marker, Number.MAX_SAFE_INTEGER) ||
    !railInt(s.rack) ||
    !railInt(s.produced, RAILWAY_MAX_INT - RAILWAY_SUPPLY - 30) ||
    s.produced % 5 !== 0 ||
    s.ages.some((age, k) => !railInt(age, 35) || (n.sources[k] !== 0 ? age !== 0 && age !== 35 : age === 35))
  )
    throw new Error('railway: supply age');
  const l = n.line!;
  if (
    l.rocks.some((v) => !railInt(v, 8)) ||
    l.rockWork.some((v) => !railInt(v, 4)) ||
    l.rockAge.some((v) => !railInt(v, 31)) ||
    l.hardwood.some((v) => !railInt(v, 15)) ||
    l.hardwoodWork.some((v) => !railInt(v, 15)) ||
    !railInt(l.stoneRack) ||
    !railInt(l.stoneProduced) ||
    l.stoneProduced % 8 !== 0
  )
    throw new Error('railway: source encoding');
  const b = l.beam;
  if (
    !['standing', 'available', 'held', 'ground', 'allocated', 'used'].includes(b.state) ||
    !railInt(b.work, 12) ||
    !railInt(b.epoch) ||
    !railInt(b.revision) ||
    !railInt(b.x, 200000, -200000) ||
    !railInt(b.y, 200000, -200000) ||
    !railInt(b.z, 200000, -200000) ||
    !railInt(b.age, 21)
  )
    throw new Error('railway: beam encoding');
  const f = n.line2!.forge;
  if (
    !railInt(f.used, 56) ||
    !railInt(f.lit, RAILWAY_MAX_INT, -1) ||
    !railInt(f.rack, 4096) ||
    !railInt(f.poured) ||
    !railInt(f.lastPour) ||
    !railInt(n.line2!.depot, 64)
  )
    throw new Error('railway: line2 bounds');
  for (const job of [...[n, ...l.jobs], ...n.line2!.jobs])
    if (Object.values(job.timing!).some((v) => !railInt(v, 60000))) throw new Error('railway: timing');
  validateRailLine(n);
  validateRailLine2(n);
  validateRailWorks(n);
  const counts = railCounts(n);
  if (counts.total !== RAILWAY_SUPPLY + 30 + counts.produced) throw new Error('railway: conservation');
}
/** The invariant as a value (tests and tools): null when the read model is valid. */
export function railwayInvariant(s: Railway): string | null {
  try {
    validateRailway(s);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'railway: invalid';
  }
}
