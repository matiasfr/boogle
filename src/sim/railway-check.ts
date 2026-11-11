// The railway's load check (docs/plans/ecs-e.md, section 4): every entity has a known shape, the catalog is whole, and
// every domain invariant holds on the read model (./railway-read-model.ts).
//
//   railwayCheck(world)            the load check: archetypes, counts, then every domain invariant on the view
//   validateRailway(railway)       the domain invariants on a read model (throws)
//   railwayInvariant(railway)      the same as a value: null when valid
import type { World } from '../ecs/index.ts';
import { MAX_PLAYERS, okPid } from './roster.ts';
import { RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';
import { LINE1_STATIONS } from './railway-line-layout.ts';
import { RAIL_ROCKS } from './railway-works-layout.ts';
import { validateRailWorks } from './railway-works.ts';
import { LINE2_STATIONS } from './railway-line2-layout.ts';
import { validateRailLine } from './railway-line.ts';
import { line2Completed, railCarryMax, validateRailLine2 } from './railway-line2.ts';
import { trainStopsOf } from './railway-train.ts';
import { RAIL_LINES, RAIL_TRAINS } from './railway-lines.ts';
import { validateRailTrains } from './railway-trains.ts';
import { RECOVERY_MINUTES } from './railway-supply.ts';
import { railCounts, railInt, railYaw, RAILWAY_MAX_INT, RAILWAY_OUTCOMES, RAILWAY_PILES } from './railway.ts';
import type { Railway } from './railway.ts';
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
  RAIL_COMPONENTS,
  RAIL_STATUS,
  RailClock,
  Rock,
  Shed,
  Train,
  Tree,
  Works,
  WorksClock,
} from './railway-components.ts';
import { railwayView } from './railway-read-model.ts';

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
    [Train, RAIL_TRAINS.length],
    [Works, 1],
    [Shed, 1],
    [Line, RAIL_LINES.length],
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
  validateRailTrains(n, (line) => trainStopsOf(line, line2Completed(n) >= LINE2_STATIONS.length));
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
