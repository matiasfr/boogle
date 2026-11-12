// The railway's components on E (docs/plans/ecs-e.md, section 4; docs/plans/ecs-migration-railway.md, section 2): the
// replication schema, the save schema and the hash. Systems (./railway-systems.ts) are the only writers. Their order,
// keys, fields and defaults, and the spawn order in createRailwayWorld, are the portable layer: any change is a
// `WORLD_NS` bump (test/railway-schema.test.ts, test/railway-golden.test.ts).
//
//   components                     tree, hardwood, rock, pile, account, job(+jobRun), qjob(+qjobRun), beam,
//                                  forge(+forgeClock), rail(+railClock), cart, boiler, train, works(+worksClock), shed,
//                                  outcome, line, aperture (v27), yard(+yardClock), town(+townClock), till (slice 5),
//                                  steel(+steelClock) (ring-island-build2, R1), leg, legYard, route (the greybox
//                                  route); RAIL_REPLICATED is the wire
//   createRailwayWorld(opts)       the fresh railway: one entity per catalog thing, spawned in catalog order
import { createWorld, defineComponent, type AnyComponent } from '../ecs/index.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_GREAT_TREE, LINE1_STATIONS } from './railway-line-layout.ts';
import { RAIL_ROCKS } from './railway-works-layout.ts';
import { LINE2_STATIONS } from './railway-line2-layout.ts';
import { LINE_TIMING } from './railway-line.ts';
import { TRAIN_PHASE, TRAIN_STOPS } from './railway-train.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { TRADE, TRADE_TOWNS } from './railway-trade-layout.ts';
import { RAIL_LEGS, RAIL_YARDS } from './railway-route.ts';
import type { RailResult } from './railway.ts';

/** A job's timing fields, in wire order (the job's schedule reads them: railway-line-schedule.ts). */
export const TIMING = {
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
    glide: 'bool',
    out0: 'int',
    out1: 'int',
    out2: 'int',
    out3: 'int',
    out4: 'int',
    out5: 'int',
    trains: 'int',
    out6: 'int',
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
    track: 'u8',
    depart: 'int',
    req: 'int',
    from: 'int',
    v0: 'int',
    dest: 'int',
    turn: 'bool',
    logs: 'int',
    rails: 'int',
    wagon: 'bool',
    foot: 'int',
    arrived: 'int',
    // Slice 5 (docs/plans/slice5-town-economy.md, R1): the yard crates aboard, its line's yard's goods.
    freight: 'int',
    // R3: riders aboard, all bound for the route halt ahead of it (one destination per route).
    riders: 'int',
    // Steel riding home on the kit car's deck (ring-island-build2, R2; ruling C): any line 2 train, STEEL.trip a trip.
    steel: 'int',
    // The boiler this train wears (ring-island-build2, R3): BOILER_SPEED's row (./railway-train.ts), 0 the standard
    // one. It takes its line's fit (`Line.boiler`) standing at the Village, never in flight.
    boiler: 'u8',
    // The logs and rails aboard are a greybox leg's kit, not the steel works' or a Q job's (greybox-route, call 64:
    // steel first, and a train never carries both). Set by the leg's load, cleared when the last unit is off.
    legKit: 'bool',
  },
  { key: 'slot' },
);
/** Ring Island's gap (docs/plans/ring-island-build1.md, R3, v27; rules in ./railway-sys-ring.ts): `set` bent footings set
 * past bent 6 (0-14; the railhead is at bent 6 + floor(set / 2)), `rack` footings on the railhead rack, `cw`
 * counterweight footings hung on the jib (0-4), `brace` the raised leaf's pawl (1 raised on it, 2 braced, 0 down), and
 * `joined` the tick the rivet was struck (-1 not yet). Defined here with the other components (not beside its systems)
 * so the schema has one module and no import cycle. */
export const Aperture = defineComponent(
  'aperture',
  { set: 'int', rack: 'int', cw: 'u8', brace: 'u8', joined: 'int' },
  { defaults: { brace: 1, joined: -1 } },
);
/** Ring Island's steel works (docs/plans/ring-island-build2.md, R1; rules in ./railway-sys-steel.ts): the kit lying in
 * the island yard off the train (`yardLogs`, `yardRails`), what has been fed into its bill (`logs`, `rails`, STEEL's
 * eight and twelve), `lit` the tick the bill filled (-1 not yet), the steel on its `rack` and `poured` in all. `outLogs`
 * and `outRails` count what the Village has ever loaded for it (logs made for the kit, rails off the forge rack; the
 * depot's `DEPOT_OUT` and `shelfOut` for the works), so the conserved counts and the kit's bounds hold. Nothing here
 * before the rivet. */
export const SteelClock = defineComponent('steelClock', { lastCast: 'int' }, { replicate: false });
export const Steel = defineComponent(
  'steel',
  {
    yardLogs: 'int',
    yardRails: 'int',
    logs: 'int',
    rails: 'int',
    lit: 'int',
    rack: 'int',
    poured: 'int',
    outLogs: 'int',
    outRails: 'int',
  },
  { requires: [SteelClock], defaults: { lit: -1 } },
);
/** A line's shared row (docs/plans/generic-lines.md, v26), by line index: its halts' lever asks (Train.req's digits)
 * and the tick a train last left its start end and its far end (-1 never), for the headway hold. Since v28
 * (ring-island-build2, R3) the room's boiler fit for the line (`boiler`, BOILER_SPEED's row; rail.install) and the
 * tick it was installed (`fitted`, -1 never). */
export const Line = defineComponent(
  'line',
  { slot: 'int', req: 'int', left0: 'int', left1: 'int', boiler: 'u8', fitted: 'int' },
  { key: 'slot', defaults: { left0: -1, left1: -1, fitted: -1 } },
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
    // Steel landed in the Roundhouse bay off line 2's trains (ring-island-build2, R2): shown, never spent in build 2.
    steel: 'int',
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
// Slice 5's town economy (docs/plans/slice5-town-economy.md; rules in ./railway-sys-trade.ts, numbers in
// ./railway-trade-layout.ts). Defined here with the other components so the schema has one module.
/** A yard's clock: the tick of its last crate (as ForgeClock's lastPour). */
export const YardClock = defineComponent('yardClock', { last: 'int' }, { replicate: false });
/** A yard by TRADE.yards slot (0 the Camp's timber, 1 the Quarry's stone): crates in stock, and made in all. */
export const Yard = defineComponent(
  'yard',
  { slot: 'int', stock: 'int', made: 'int' },
  { key: 'slot', requires: [YardClock] },
);
/** A town's rider clock (R3; as YardClock is the yard's): the riders accrued toward the next one, in hundredths of a
 * rider-tick. Written every rule tick, so never replicated: only what it changes (a rider arriving) is. */
export const TownClock = defineComponent('townClock', { acc: 'int' }, { replicate: false });
/** A town by slot (0 the Village): the timber and stone its yards have delivered (R1); for its route (R3), those
 * waiting at each end (`wait0` at halt `a`, `wait1` at the far halt) and the riders who have boarded and stepped off. */
export const Town = defineComponent(
  'town',
  {
    slot: 'int',
    wood: 'int',
    stone: 'int',
    wait0: 'int',
    wait1: 'int',
    boarded: 'int',
    alighted: 'int',
  },
  { key: 'slot', requires: [TownClock] },
);
/** R3, the one shared strongbox (decided: one wallet, no personal money): the Boogles in it, the fares that landed and
 * those lost to its cap, and (R4, R5) what was spent, the away sack and what was poured from it. */
export const Till = defineComponent('till', {
  boogles: 'int',
  landed: 'int',
  lost: 'int',
  spent: 'int',
  sack: 'int',
  poured: 'int',
});
// The greybox route (docs/plans/greybox-route.md, step 3; rules in ./railway-sys-route.ts, the catalog in
// ./railway-route.ts). Defined here with the other components so the schema has one module. Nothing here is written
// every tick: a section's lay clock is its `start` tick, read against the tick, and changes only when it starts and
// when it lays.
/** A leg by RAIL_LEGS slot: `laid` sections complete (0 to its sections); `logs` and `rails` fed into the current
 * section's frame; `start` the tick that section began to lay (-1 not laying); and the kit units ever loaded onto its
 * trains for it (`loadedLogs`, `loadedRails`; a unit lost off the rack is owed and loaded again); and the units lifted
 * off its rack onto backs and not yet fed or put down (`heldLogs`, `heldRails`: the step 3 review's P2-2, so the kit
 * owed counts these and not every back's). */
export const Leg = defineComponent(
  'leg',
  {
    slot: 'int',
    laid: 'int',
    logs: 'int',
    rails: 'int',
    start: 'int',
    loadedLogs: 'int',
    loadedRails: 'int',
    heldLogs: 'int',
    heldRails: 'int',
  },
  { key: 'slot', defaults: { start: -1 } },
);
/** A junction yard by RAIL_YARDS slot (`LegYard`, kind `legYard`: slice 5's `Yard` is the town economy's crate yard):
 * the kit units its `fedBy` leg's trains have unloaded there for the legs that load there. Nothing feeds it until leg
 * 2's rules. */
export const LegYard = defineComponent('legYard', { slot: 'int', logs: 'int', rails: 'int' }, { key: 'slot' });
/** The route's one row: the grants taken (bit k: RAIL_GRANTS[k]), the gates opened (bit k: RAIL_GATES[k]) and the
 * tick the room arrived at the meeting marker (-1 never). */
export const Route = defineComponent(
  'route',
  { grants: 'int', gates: 'int', arrived: 'int' },
  { defaults: { arrived: -1 } },
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
  Line,
  Aperture,
  // Slice 5's town economy.
  Yard,
  YardClock,
  Town,
  TownClock,
  Till,
  Steel,
  SteelClock,
  // The greybox route.
  Leg,
  LegYard,
  Route,
];
/** What a client is sent: the replicated components (the wire schema, one source with the save). */
export const RAIL_REPLICATED = RAIL_COMPONENTS.filter((c) => c.replicate);
export const RAIL_STATUS = ['accepted', 'noop', 'rejected'] as const satisfies readonly RailResult['status'][];
export const DEPOT_OUT = ['out0', 'out1', 'out2', 'out3', 'out4', 'out5', 'out6'] as const;
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
  RAIL_TRAINS.forEach(({ line, home, track, shed }, slot) => {
    const s = TRAIN_STOPS[line]![home]!;
    // A fleet row (the greybox route) starts in the shed.
    if (shed) w.spawn([Train, { slot, phase: TRAIN_PHASE.SHED, at: home, to: home, track, from: s, dest: s }]);
    else w.spawn([Train, { slot, at: home, to: home, track, from: s, dest: s }]);
  });
  w.spawn([Works, {}], [WorksClock, {}]);
  w.spawn([Shed, {}]);
  RAIL_LINES.forEach((_l, slot) => w.spawn([Line, { slot }]));
  w.spawn([Aperture, {}]);
  // Slice 5: each yard starts full (design review, finding 1), so the first timber train home delivers a load.
  TRADE.yards.forEach(({ cap }, slot) => w.spawn([Yard, { slot, stock: cap, made: cap }], [YardClock, {}]));
  for (let slot = 0; slot < TRADE_TOWNS; slot++) w.spawn([Town, { slot }], [TownClock, {}]);
  w.spawn([Till, {}]);
  w.spawn([Steel, {}], [SteelClock, {}]);
  // The greybox route: every leg and yard in catalog order, nothing laid, and the route's row.
  RAIL_LEGS.forEach((_l, slot) => w.spawn([Leg, { slot }]));
  RAIL_YARDS.forEach((_y, slot) => w.spawn([LegYard, { slot }]));
  w.spawn([Route, {}]);
  return w;
}
