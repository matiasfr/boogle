// The railway's load check (docs/plans/ecs-e.md, section 4; docs/plans/ecs-migration-railway.md, M8b): every entity has
// a known shape, the catalog is whole, and every domain invariant holds on the world's rows and queries.
//
//   railwayCheck(world)            the load check: archetypes, counts, then every domain invariant on the world
//                                  (accounts, piles, outcomes, catalog here; ./railway-check-line1.ts, -line2.ts,
//                                  -trains.ts, -works.ts, -ring.ts, -trade.ts; the conserved logs)
//
// A build-out's component adds its check as its own function in its own railway-check-<domain>.ts, called from
// checkRailway, and one entry per `throw` to test/fixtures/railway-bad-worlds.ts.
import type { World } from '../ecs/index.ts';
import { MAX_PLAYERS, okPid } from './roster.ts';
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_STATIONS } from './railway-line-layout.ts';
import { RAIL_ROCKS } from './railway-works-layout.ts';
import { LINE2_STATIONS } from './railway-line2-layout.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { TRADE, TRADE_TOWNS } from './railway-trade-layout.ts';
import { RECOVERY_MINUTES } from './railway-supply.ts';
import { railInt, railYaw, RAILWAY_MAX_INT, RAILWAY_OUTCOMES, RAILWAY_PILES } from './railway.ts';
import {
  Account,
  Aperture,
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
  RAIL_COMPONENTS,
  RAIL_STATUS,
  RailClock,
  Rock,
  Shed,
  Till,
  Town,
  Train,
  Tree,
  Works,
  WorksClock,
  TIMING,
  Yard,
  YardClock,
} from './railway-components.ts';
import {
  account,
  accounts,
  beam,
  forge,
  forgeClock,
  hardwoods,
  jobs,
  outcomes,
  qjobs,
  rail,
  railClock,
  rocks,
  trees,
} from './railway-rows.ts';
import { carryMax } from './railway-queries.ts';
import { railCounts as worldCounts } from './railway-queries-line2.ts';
import { checkLine1 } from './railway-check-line1.ts';
import { checkLine2 } from './railway-check-line2.ts';
import { checkTrains } from './railway-check-trains.ts';
import { checkWorks } from './railway-check-works.ts';
import { checkRing } from './railway-check-ring.ts';
import { checkTrade } from './railway-check-trade.ts';

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
  [Line],
  [Aperture],
  [Yard, YardClock],
  [Town],
  [Till],
].map((set) => set.map((c) => c.kind).join());
/** Every entity has a known shape, the catalog is whole, and every domain invariant holds on the world. */
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
    [Train, RAIL_TRAINS.length],
    [Works, 1],
    [Shed, 1],
    [Line, RAIL_LINES.length],
    [Aperture, 1],
    [Yard, TRADE.yards.length],
    [Town, TRADE_TOWNS],
    [Till, 1],
  ] as const)
    if (w.count(c) !== n) throw new Error(`railway: ${w.count(c)} ${c.kind}`);
  if (w.count(Account) > MAX_PLAYERS || w.count(Pile) > RAILWAY_PILES || w.count(Outcome) > RAILWAY_OUTCOMES)
    throw new Error('railway: rows');
  if (!railInt(w.nextId(), RAILWAY_MAX_INT, 1)) throw new Error('railway: next id');
  checkRailway(w);
}

const bad = (what: string): never => {
  throw new Error(`railway: ${what}`);
};
/** The domain's invariants on the world (M8b): the accounts, piles, outcomes and catalog here, then line one, line
 * two, the trains, the Works, the ring and the trade (./railway-check-*.ts), then the conserved logs. Every row and slot is
 * there: railwayCheck counted them first. */
function checkRailway(w: World) {
  const ts = trees(w),
    r0 = rail(w),
    clock = railClock(w);
  if (ts.some((t) => !railInt(t.left, 15))) bad('catalog');
  if (ts.some((t) => !railYaw(t.yaw) || (t.left !== 0 && (t.yaw !== 0 || t.fell)))) bad('fall state');
  const cm = carryMax(w);
  const as = accounts(w);
  if (
    new Set(as.map((a) => a.pid)).size !== as.length ||
    as.some(
      (a) =>
        !okPid(a.pid) ||
        !railInt(a.carry, cm) ||
        !railInt(a.stone, cm) ||
        !railInt(a.rails, cm) ||
        a.carry + a.stone + a.rails > cm ||
        !railInt(a.epoch, RAILWAY_MAX_INT, 1) ||
        !railInt(a.request),
    )
  )
    bad('accounts');
  const lastPile = w.nextId() - 1;
  if (
    w.ids(Pile).some((id) => {
      const p = w.get(Pile, id)!;
      return (
        !railInt(id, lastPile, 1) ||
        !railInt(p.n, T1.carry, 1) ||
        !railInt(p.kind, 3) ||
        !railInt(p.x, 200000, -200000) ||
        !railInt(p.z, 200000, -200000) ||
        !railInt(p.y, 200000, -200000) ||
        !railInt(p.age, RECOVERY_MINUTES)
      );
    })
  )
    bad('piles');
  if (!railInt(r0.awake, RAILWAY_MAX_INT, -1)) bad('tick');
  if (r0.awake < 0 && ts.some((t) => t.work > 0)) bad('sleeping harvest');
  if (!railInt(clock.resumeMarker, Number.MAX_SAFE_INTEGER)) bad('clock');
  const os = outcomes(w);
  if (
    os.some((o) => {
      const a = account(w, o.pid);
      return (
        !a ||
        !railInt(o.epoch, a.epoch, 1) ||
        !railInt(o.request, RAILWAY_MAX_INT, 1) ||
        (o.epoch === a.epoch && o.request > a.request) ||
        !railInt(o.accepted, cm) ||
        RAIL_STATUS[o.status] === undefined ||
        (o.status === RAIL_STATUS.indexOf('accepted')) !== o.accepted > 0
      );
    }) ||
    new Set(os.map((o) => `${o.pid}/${o.epoch}/${o.request}`)).size !== os.length
  )
    bad('outcomes');
  if (
    !railInt(clock.supplyMarker, Number.MAX_SAFE_INTEGER) ||
    !railInt(r0.rack) ||
    !railInt(r0.produced, RAILWAY_MAX_INT - RAILWAY_SUPPLY - 30) ||
    r0.produced % 5 !== 0 ||
    ts.some((t) => !railInt(t.age, 35) || (t.left !== 0 ? t.age !== 0 && t.age !== 35 : t.age === 35))
  )
    bad('supply age');
  const rs = rocks(w),
    hs = hardwoods(w);
  if (
    rs.some((r) => !railInt(r.left, 8) || !railInt(r.work, 4) || !railInt(r.age, 31)) ||
    hs.some((h) => !railInt(h.left, 15) || !railInt(h.work, 15)) ||
    !railInt(r0.stoneRack) ||
    !railInt(r0.stoneProduced) ||
    r0.stoneProduced % 8 !== 0
  )
    bad('source encoding');
  const b = beam(w);
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
    bad('beam encoding');
  const f = forge(w);
  if (
    !railInt(f.used, 56) ||
    !railInt(f.lit, RAILWAY_MAX_INT, -1) ||
    !railInt(f.rack, 4096) ||
    !railInt(f.poured) ||
    !railInt(forgeClock(w).lastPour) ||
    !railInt(r0.depot, 64)
  )
    bad('line2 bounds');
  for (const j of [...jobs(w), ...qjobs(w)]) if (TIMING_KEYS.some((k) => !railInt(j[k], 60000))) bad('timing');
  checkLine1(w);
  checkLine2(w);
  checkTrains(w);
  checkWorks(w);
  checkRing(w);
  checkTrade(w);
  const counts = worldCounts(w);
  if (counts.total !== RAILWAY_SUPPLY + 30 + counts.produced) bad('conservation');
}
const TIMING_KEYS = Object.keys(TIMING) as (keyof typeof TIMING)[];
