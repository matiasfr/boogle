// The load check's bad worlds (docs/plans/ecs-migration-railway.md, M8b): one entry per `throw` message of the world
// check (railwayCheck in src/sim/railway-check.ts and its domain files, -line1, -line2, -trains and -works), each one
// edit to a golden seed stage that breaks that condition alone, with the message the site throws.
// test/railway-check.test.ts requires the world check to refuse each with that message. Each `site` names its domain
// (line, line2, trains, works, or none for railwayCheck's own) and the message.
//
// A site no world edit can reach is listed in UNREACHABLE with the reason. A build-out adds one entry per `throw` of
// its own check here (Ring Island's are in test/railway-check-ring.test.ts).
import type { AnyComponent, RowOf, World } from '../../src/ecs/index.ts';
import type { SeedStage } from '../../src/sim/railway-seeds.ts';
import {
  Account,
  Beam,
  Boiler,
  Cart,
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
  RailClock,
  Rock,
  Shed,
  Steel,
  SteelClock,
  Train,
  Tree,
  Works,
  WorksClock,
} from '../../src/sim/railway-components.ts';
import { reqAdd } from '../../src/sim/railway-train.ts';
import { LINE2, RAIL_TRAINS } from '../../src/sim/railway-lines.ts';
import { LINE_SLOTS } from '../../src/sim/railway-trains.ts';
import { stopsOf } from '../../src/sim/railway-queries.ts';

/** The stages the entries are built on: line one only, a line-two stretch on its way, line two done, and the rivet
 * struck (the steel works'). */
export const BAD_WORLD_STAGES = [
  'awake',
  'q2-arriving',
  'crossing-done',
  'ring-joined',
] as const satisfies readonly SeedStage[];
export type BadWorld = {
  /** The validator and its site, for the reader: `<file> <message>`, with a suffix where one message has two sites. */
  site: string;
  message: string;
  stage: (typeof BAD_WORLD_STAGES)[number];
  break: (w: World) => void;
};

type Patch<C extends AnyComponent> = Partial<RowOf<C>>;
/** Write fields into the one entity with c, or the one whose key is `key` (an entity id for an unkeyed c). */
function set<C extends AnyComponent>(w: World, c: C, fields: Patch<C>, key?: number | string) {
  const id = key === undefined ? w.single(c) : c.key ? w.lookup(c, key)! : (key as number);
  Object.assign(w.mut(c, id)!, fields);
}
const runOf = (w: World, c: typeof JobRun | typeof QJobRun, slot: number, fields: object) =>
  Object.assign(w.mut(c, w.lookup(c === JobRun ? Job : QJob, slot)!)!, fields);
const firstPile = (w: World, kind: number) => w.ids(Pile).find((id) => w.get(Pile, id)!.kind === kind)!;

const A = 'awake',
  Q = 'q2-arriving',
  X = 'crossing-done',
  J = 'ring-joined';
export const BAD_WORLDS: readonly BadWorld[] = [
  // ------------------------------------------------ railwayCheck's own (src/sim/railway-check.ts)
  { site: 'check catalog', message: 'railway: catalog', stage: A, break: (w) => set(w, Tree, { left: 16 }, 0) },
  { site: 'check fall state', message: 'railway: fall state', stage: A, break: (w) => set(w, Tree, { yaw: 1 }, 0) },
  { site: 'check accounts', message: 'railway: accounts', stage: A, break: (w) => set(w, Account, { carry: 9 }, 'a') },
  { site: 'check piles', message: 'railway: piles', stage: X, break: (w) => set(w, Pile, { n: 0 }, firstPile(w, 2)) },
  { site: 'check tick', message: 'railway: tick', stage: A, break: (w) => set(w, Rail, { awake: -2 }) },
  {
    site: 'check sleeping harvest',
    message: 'railway: sleeping harvest',
    stage: A,
    break: (w) => (set(w, Rail, { awake: -1 }), set(w, Tree, { work: 1 }, 0)),
  },
  { site: 'check clock', message: 'railway: clock', stage: A, break: (w) => set(w, RailClock, { resumeMarker: -1 }) },
  {
    site: 'check outcomes',
    message: 'railway: outcomes',
    stage: A,
    break: (w) => set(w, Outcome, { status: 3 }, w.ids(Outcome)[0]!),
  },
  { site: 'check supply age', message: 'railway: supply age', stage: A, break: (w) => set(w, Rail, { produced: 3 }) },
  {
    site: 'check source encoding',
    message: 'railway: source encoding',
    stage: A,
    break: (w) => set(w, Rock, { left: 9 }, 0),
  },
  {
    site: 'check beam encoding',
    message: 'railway: beam encoding',
    stage: A,
    break: (w) => set(w, Beam, { work: 13 }),
  },
  { site: 'check line2 bounds', message: 'railway: line2 bounds', stage: A, break: (w) => set(w, Rail, { depot: 65 }) },
  { site: 'check timing', message: 'railway: timing', stage: A, break: (w) => set(w, Job, { depositMs: 60001 }, 0) },
  {
    site: 'check conservation',
    message: 'railway: conservation',
    stage: A,
    break: (w) => set(w, Tree, { left: 9 }, 0),
  },
  // ------------------------------------------------ line one (src/sim/railway-check-line1.ts)
  {
    site: 'line job bounds (fields)',
    message: 'railway: job bounds',
    stage: A,
    break: (w) => runOf(w, JobRun, 0, { used: -1 }),
  },
  {
    site: 'line job bounds (schedule, bill)',
    message: 'railway: job bounds',
    stage: A,
    break: (w) => set(w, Job, { stock: 25 }, 0),
  },
  {
    site: 'line job bounds (start, completion range)',
    message: 'railway: job bounds',
    stage: A,
    break: (w) => set(w, Job, { completion: 2 }, 0),
  },
  {
    site: 'line ordered stations',
    message: 'railway: ordered stations',
    stage: A,
    break: (w) => set(w, Job, { stock: 1, delivered: 1 }, 1),
  },
  { site: 'line unfunded job', message: 'railway: unfunded job', stage: A, break: (w) => set(w, Job, { stock: 1 }, 0) },
  {
    site: 'line unstarted full job',
    message: 'railway: unstarted full job',
    stage: A,
    break: (w) => set(w, Job, { stock: 24, delivered: 24 }, 0),
  },
  {
    site: 'line funded job',
    message: 'railway: funded job',
    stage: Q,
    break: (w) => runOf(w, JobRun, 0, { used: 23 }),
  },
  { site: 'line axe', message: 'railway: axe before the forge', stage: A, break: (w) => set(w, Rail, { axe: true }) },
  {
    site: 'line upgraded source',
    message: 'railway: upgraded source',
    stage: A,
    break: (w) => set(w, Tree, { big: true }, 0),
  },
  { site: 'line rock work', message: 'railway: rock work', stage: A, break: (w) => set(w, Rock, { age: 1 }, 0) },
  {
    site: 'line hardwood work',
    message: 'railway: hardwood work',
    stage: A,
    break: (w) => set(w, Hardwood, { work: 1 }, 0),
  },
  {
    site: 'line stone conservation',
    message: 'railway: stone conservation',
    stage: A,
    break: (w) => set(w, Rail, { stoneRack: 1 }),
  },
  { site: 'line beam ground', message: 'railway: beam ground', stage: A, break: (w) => set(w, Beam, { age: 1 }) },
  { site: 'line beam work', message: 'railway: beam work', stage: A, break: (w) => set(w, Beam, { work: 12 }) },
  {
    site: 'line beam work before T3',
    message: 'railway: beam work before T3',
    stage: A,
    break: (w) => set(w, Beam, { state: 'available', work: 12 }),
  },
  {
    site: 'line beam holder',
    message: 'railway: beam holder',
    stage: Q,
    break: (w) => set(w, Beam, { state: 'held', holder: 'zz', epoch: 1 }),
  },
  {
    site: 'line beam orphan identity',
    message: 'railway: beam orphan identity',
    stage: A,
    break: (w) => set(w, Beam, { epoch: 1 }),
  },
  {
    site: 'line beam allocation',
    message: 'railway: beam allocation',
    stage: Q,
    break: (w) => set(w, Beam, { state: 'allocated' }),
  },
  // ------------------------------------------------ line two (src/sim/railway-check-line2.ts)
  {
    site: 'line2 forge before path',
    message: 'railway: forge before path',
    stage: A,
    break: (w) => set(w, Forge, { used: 1 }),
  },
  { site: 'line2 forge lit', message: 'railway: forge lit', stage: Q, break: (w) => set(w, Forge, { used: 55 }) },
  { site: 'line2 unlit pour', message: 'railway: unlit pour', stage: A, break: (w) => set(w, Forge, { rack: 1 }) },
  {
    site: 'line2 pour clock',
    message: 'railway: pour clock',
    stage: Q,
    break: (w) => set(w, ForgeClock, { lastPour: 1000 }),
  },
  {
    site: 'line2 job bounds (fields)',
    message: 'railway: line2 job bounds',
    stage: A,
    break: (w) => runOf(w, QJobRun, 0, { used: -1 }),
  },
  {
    site: 'line2 job bounds (schedule, bill)',
    message: 'railway: line2 job bounds',
    stage: A,
    break: (w) => set(w, QJob, { stock: 17 }, 0),
  },
  {
    site: 'line2 job bounds (start, completion range)',
    message: 'railway: line2 job bounds',
    stage: A,
    break: (w) => set(w, QJob, { completion: 2 }, 0),
  },
  {
    site: 'line2 ordered stations',
    message: 'railway: line2 ordered stations',
    stage: A,
    break: (w) => set(w, QJob, { stock: 1, delivered: 1 }, 0),
  },
  {
    site: 'line2 unfunded job',
    message: 'railway: line2 unfunded job',
    stage: Q,
    break: (w) => set(w, QJob, { stock: 1 }, 1),
  },
  {
    site: 'line2 funded job',
    message: 'railway: line2 funded job',
    stage: Q,
    break: (w) => runOf(w, QJobRun, 0, { used: 15 }),
  },
  { site: 'line2 early depot', message: 'railway: early depot', stage: A, break: (w) => set(w, Rail, { depot: 1 }) },
  { site: 'line2 depot output', message: 'railway: depot output', stage: Q, break: (w) => set(w, Rail, { out0: 1 }) },
  { site: 'line2 depot stock', message: 'railway: depot stock', stage: Q, break: (w) => set(w, Rail, { depot: 1 }) },
  { site: 'line2 cart', message: 'railway: cart', stage: A, break: (w) => set(w, Cart, { phase: 8 }) },
  { site: 'line2 lever', message: 'railway: lever before Q3', stage: Q, break: (w) => set(w, Rail, { lever: true }) },
  { site: 'line2 hook', message: 'railway: hook before Q2', stage: A, break: (w) => set(w, Rail, { hook: true }) },
  { site: 'line2 glide', message: 'railway: glide before Q5', stage: Q, break: (w) => set(w, Rail, { glide: true }) },
  {
    site: 'line2 pack',
    message: 'railway: pack before the forge bill',
    stage: A,
    break: (w) => set(w, Rail, { pack: true }),
  },
  {
    site: 'line2 shelf bounds',
    message: 'railway: shelf bounds',
    stage: A,
    break: (w) => set(w, Rail, { depotRails: 1 }),
  },
  {
    site: 'line2 shelf outside its stretch',
    message: 'railway: shelf outside its stretch',
    // Since v27 Q7 is active at crossing-done, a shelf stretch: one rail past its bill of 20.
    stage: X,
    break: (w) => set(w, Rail, { shelfOut: 21 }),
  },
  { site: 'line2 boiler', message: 'railway: boiler', stage: A, break: (w) => set(w, Boiler, { age: 22 }) },
  {
    site: 'line2 rail conservation',
    message: 'railway: rail conservation',
    stage: Q,
    break: (w) => set(w, Forge, { poured: 38 }),
  },
  // ------------------------------------------------ the trains (src/sim/railway-check-trains.ts)
  { site: 'trains line', message: 'railway: line', stage: A, break: (w) => set(w, Line, { left0: -2 }, 0) },
  {
    site: 'trains line asleep',
    message: 'railway: line asleep',
    stage: A,
    break: (w) => set(w, Line, { left0: 5 }, 0),
  },
  { site: 'trains train', message: 'railway: train', stage: A, break: (w) => set(w, Train, { phase: 2 }, 0) },
  {
    site: 'trains rider ask',
    message: 'railway: rider ask',
    stage: X,
    break: (w) => set(w, Train, { req: reqAdd(0, 0, -1, stopsOf(w, 0).length) }, 0),
  },
  {
    site: 'trains end block',
    message: 'railway: end block',
    stage: X,
    break: (w) => {
      // Both of line two's trains standing at its start end.
      const s0 = stopsOf(w, LINE2)[0]!;
      for (const slot of LINE_SLOTS[LINE2]!)
        set(w, Train, { phase: 0, at: 0, to: 0, from: s0, dest: s0, track: 0, v0: 0, req: 0, turn: false }, slot);
    },
  },
  // ------------------------------------------------ the Works (src/sim/railway-check-works.ts)
  { site: 'works bounds', message: 'railway: works bounds', stage: X, break: (w) => set(w, Works, { seams: 4 }) },
  { site: 'works shed bounds', message: 'railway: shed bounds', stage: X, break: (w) => set(w, Shed, { table: 2 }) },
  { site: 'works breaker', message: 'railway: breaker', stage: A, break: (w) => set(w, Works, { breaker: 1 }) },
  {
    site: 'works seam before the breaker',
    message: 'railway: seam before the breaker',
    stage: X,
    break: (w) => set(w, Works, { breaker: 1 }),
  },
  { site: 'works kiln lit', message: 'railway: kiln lit', stage: X, break: (w) => set(w, Works, { logs: 15 }) },
  {
    site: 'works kiln before the throat',
    message: 'railway: kiln before the throat',
    stage: X,
    break: (w) => set(w, Works, { seams: 1 }),
  },
  {
    site: 'works cast clock',
    message: 'railway: cast clock',
    stage: X,
    break: (w) => set(w, WorksClock, { lastCast: 3000 }),
  },
  { site: 'works unlit cast', message: 'railway: unlit cast', stage: A, break: (w) => set(w, Works, { poured: 1 }) },
  { site: 'works pier', message: 'railway: pier', stage: X, break: (w) => set(w, Works, { pierRack: 1 }) },
  {
    site: 'works pier before Q6',
    message: 'railway: pier before Q6',
    stage: A,
    break: (w) => set(w, Works, { pierSet: 1 }),
  },
  { site: 'works crossing', message: 'railway: crossing', stage: X, break: (w) => set(w, Works, { crossing: -1 }) },
  {
    site: 'works stall before the slab',
    message: 'railway: stall before the slab',
    stage: X,
    break: (w) => set(w, Works, { seams: 2 }),
  },
  {
    site: 'works cradle before the stall',
    message: 'railway: cradle before the stall',
    stage: X,
    break: (w) => set(w, Shed, { stall: 1 }),
  },
  { site: 'works fitted', message: 'railway: fitted', stage: X, break: (w) => set(w, Shed, { fitted: -1 }) },
  {
    site: 'works table turned early',
    message: 'railway: table turned early',
    stage: X,
    break: (w) => set(w, Shed, { tableRev: 2 }),
  },
  { site: 'works wagon (shape)', message: 'railway: wagon', stage: X, break: (w) => set(w, Train, { foot: -1 }, 0) },
  {
    site: 'works two wagons',
    message: 'railway: two wagons',
    stage: X,
    break: (w) => set(w, Train, { wagon: true }, 1),
  },
  {
    site: 'works ready before fitted',
    message: 'railway: ready before fitted',
    stage: A,
    break: (w) => set(w, Shed, { ready: 5 }),
  },
  {
    site: 'works wagon rollout',
    message: 'railway: wagon rollout',
    stage: X,
    break: (w) => set(w, Shed, { ready: -1 }),
  },
  {
    site: 'works wagon (line, cap, cargo)',
    message: 'railway: wagon',
    stage: X,
    break: (w) => set(w, Train, { foot: 1 }, 0),
  },
  { site: 'works foot', message: 'railway: foot', stage: X, break: (w) => set(w, Account, { foot: 2 }, 'a') },
  {
    site: 'works foot on a full back',
    message: 'railway: foot on a full back',
    stage: Q,
    break: (w) => set(w, Account, { foot: 1 }, 'a'),
  },
  {
    site: 'works footing pile',
    message: 'railway: footing pile',
    stage: X,
    break: (w) => set(w, Pile, { kind: 3 }, firstPile(w, 0)),
  },
  {
    site: 'works footing conservation',
    message: 'railway: footing conservation',
    stage: X,
    break: (w) => set(w, Works, { rack: 1 }),
  },
  // ------------------------------------------------ the steel works (src/sim/railway-check-steel.ts, ring-island-build2)
  // Each throws before the log count, which runs last, so a bill set by hand takes no logs from elsewhere; rails are
  // counted earlier (line two's rail conservation), so they come off ring-joined's forge rack (20).
  { site: 'steel bounds', message: 'railway: steel bounds', stage: X, break: (w) => set(w, Steel, { lit: -2 }) },
  {
    site: 'steel aboard (line 1)',
    message: 'railway: steel aboard',
    stage: X,
    break: (w) =>
      set(
        w,
        Train,
        { steel: 1 },
        RAIL_TRAINS.findIndex((t) => t.line !== LINE2),
      ),
  },
  {
    site: 'steel before the rivet',
    message: 'railway: steel before the rivet',
    stage: X,
    break: (w) => set(w, Steel, { outLogs: 1 }),
  },
  {
    // ring-joined's slack is 76 logs (every stretch's depot output): a full depot and cart leave 6, the yard's 8 break it.
    site: 'steel sent logs',
    message: 'railway: steel sent logs',
    stage: J,
    break: (w) => {
      set(w, Rail, { depot: 64 });
      set(w, Cart, { logs: 6 });
      set(w, Steel, { yardLogs: 8 });
    },
  },
  {
    site: 'steel sent rails',
    message: 'railway: steel sent rails',
    stage: J,
    break: (w) => {
      set(w, Forge, { rack: 19 });
      set(w, Steel, { yardRails: 1 });
    },
  },
  { site: 'steel lit', message: 'railway: steel lit', stage: J, break: (w) => set(w, Steel, { lit: 5 }) },
  {
    site: 'steel cast clock',
    message: 'railway: steel cast clock',
    stage: J,
    break: (w) => {
      set(w, Forge, { rack: 8 });
      set(w, Steel, { logs: 8, rails: 12, lit: 100 });
      set(w, SteelClock, { lastCast: 50 });
    },
  },
  {
    site: 'steel unlit cast',
    message: 'railway: steel unlit cast',
    stage: J,
    break: (w) => set(w, Steel, { rack: 1, poured: 1 }),
  },
  {
    site: 'steel conservation',
    message: 'railway: steel conservation',
    stage: J,
    break: (w) => {
      set(w, Forge, { rack: 8 });
      set(w, Steel, { logs: 8, rails: 12, lit: 100, poured: 1 });
      set(w, SteelClock, { lastCast: 100 });
    },
  },
  // The boiler fit (R3): no steel is in ring-joined's bay, so any fit there breaks "after steel is home".
  {
    site: 'boiler bounds',
    message: 'railway: boiler bounds',
    stage: J,
    break: (w) => set(w, Line, { boiler: 2 }, LINE2),
  },
  {
    site: 'boiler fit',
    message: 'railway: boiler fit',
    stage: J,
    break: (w) => set(w, Line, { boiler: 1, fitted: 100 }, LINE2),
  },
  {
    site: 'boiler aboard',
    message: 'railway: boiler aboard',
    stage: J,
    break: (w) => set(w, Train, { boiler: 1 }, LINE_SLOTS[LINE2]![0]),
  },
];

/** The world check's `throw` sites no edit to a world can reach, and why. */
export const UNREACHABLE: readonly { site: string; message: string; reason: string }[] = [
  {
    site: 'trains rider ask (a refused way)',
    message: 'railway: rider ask',
    reason:
      "a rider's ask for the way an `only` halt refuses: no catalog halt is `only` until R3b's row (v27), so no world " +
      'can hold one; test/railway-trains.test.ts refuses it, the lever ask and an up train standing there on the ' +
      'fixture line',
  },
];
/** A throw site that can only throw after another site with the same condition already has (dominated). */
export const DOMINATED: readonly { site: string; message: string; reason: string }[] = [
  {
    site: 'works unlit cast (second)',
    message: 'railway: unlit cast',
    reason: "`poured > 0 && lit < 0` is inside the first 'unlit cast' condition (`lit < 0 && (poured || lastCast)`)",
  },
];
