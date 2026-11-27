// The room's works (docs/plans/lane-a-works.md, A0): a pure read of the accepted railway rows.
//   WORKS_STEPS   the works sites in route order, with folded steps omitted
//   roomWorks     the current site, its bill and the nearest served halt
import type { World } from '../ecs/index.ts';
import { RAILWAY_T1 } from './railway-layout.ts';
import { LINE1_STATIONS } from './railway-line-layout.ts';
import {
  LINE2_BOILER,
  LINE2_FORGE,
  LINE2_HOOK,
  LINE2_LEVER,
  LINE2_OLD_TRAIN,
  LINE2_SEA,
  LINE2_STATIONS,
} from './railway-line2-layout.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, trainPassesBy } from './railway-lines.ts';
import { ringHead } from './railway-queries.ts';
import { legDone, legRow, routeRow } from './railway-queries-route.ts';
import { trainStops } from './railway-queries-trains.ts';
import { RING_BRACE, RING_HEAD, RING_RIVET, RING_STEEL_WORKS, STEEL } from './railway-ring-layout.ts';
import { RAIL_ARRIVAL, RAIL_GATES, RAIL_GRANTS, RAIL_LEGS, legFrame } from './railway-route.ts';
import { aperture, beam, boiler, forge, job, line, qjob, rail, shed, steel, works } from './railway-rows.ts';
import {
  PIER_FRAME,
  SHED_STALL,
  SHED_TABLE,
  WORKS,
  WORKS_BREAKER,
  WORKS_KILN,
  WORKS_SEAMS,
} from './railway-works-layout.ts';
import { SEAM_STALL, SEAM_THROAT } from './railway-works.ts';

type Station = 'T1' | 'T2' | 'T3';
type Quarry = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7';
type Section =
  | `stack-${1 | 2 | 3 | 4}`
  | `${'incline' | 'bay'}-${1 | 2}`
  | `${'canopy' | 'cave'}-${1 | 2 | 3}`
  | `wall-${1 | 2 | 3 | 4 | 5 | 6}`
  | 'notch-1'
  | 'causeway-1';
type Gate = `${'incline' | 'canopy' | 'plug' | 'deep' | 'notch' | 'causeway'}-gate`;
type Grant = 'pick' | 'seeds' | 'cloth' | 'lantern';
export type WorksSite =
  | Station
  | Quarry
  | Section
  | Gate
  | Grant
  | 'wake'
  | 'forge'
  | 'lever'
  | 'hook'
  | 'sea'
  | 'boiler'
  | 'trains'
  | 'breaker'
  | 'slab'
  | 'throat'
  | 'kiln'
  | 'stall'
  | 'cradle'
  | 'table'
  | 'upgrade'
  | 'crossing'
  | 'bents'
  | 'brace'
  | 'weights'
  | 'rivet'
  | 'steelworks'
  | 'install'
  | 'arrive';
export type WorksKind =
  | 'wake'
  | 'bill'
  | 'beam'
  | 'part'
  | 'boiler'
  | 'strike'
  | 'kiln'
  | 'footing'
  | 'cradle'
  | 'table'
  | 'install'
  | 'gate'
  | 'key'
  | 'barrier'
  | 'plug'
  | 'brace'
  | 'arrive';
export type WorksNeed = {
  what: 'logs' | 'stone' | 'rails' | 'beam' | 'boiler' | 'footings' | 'steel' | 'key' | 'train';
  have: number;
  of: number;
};
type Halt = { line: number; stop: number };
export type WorksGift =
  | ({ what: 'halt' } & Halt)
  | { what: 'opens'; site: WorksSite }
  | { what: 'ability'; id: 'axe' | 'hook' }
  | { what: 'trains' }
  | { what: 'footings' }
  | { what: 'wagon' }
  | { what: 'longer-boiler' }
  | { what: 'ending' };
export type RoomWorks = {
  site: WorksSite;
  kind: WorksKind;
  /** World cm. Sites drawn on local terrain have no catalog height and use y = 0. */
  at: { x: number; y: number; z: number };
  needs: readonly WorksNeed[];
  gives: WorksGift;
  ops: readonly string[];
  halt: Halt | null;
  done: boolean;
};
type WorksStep = Omit<RoomWorks, 'needs' | 'halt' | 'done'> & {
  done: (w: World) => boolean;
  needs: (w: World) => readonly WorksNeed[];
};

const need = (what: WorksNeed['what'], have: number, of: number): WorksNeed => ({ what, have, of });
const step = (
  site: WorksSite,
  kind: WorksKind,
  { x, y = 0, z }: { x: number; y?: number; z: number },
  ops: readonly string[],
  gives: WorksGift | WorksSite,
  done: WorksStep['done'],
  needs: WorksStep['needs'] = () => [],
): WorksStep => ({
  site,
  kind,
  at: { x, y, z },
  ops,
  gives: typeof gives === 'string' ? { what: 'opens', site: gives } : gives,
  done,
  needs,
});
const haltGift = ({ line, stop }: Halt): WorksGift => ({ what: 'halt', line, stop });

function station(site: Station, next: WorksSite) {
  const k = LINE1_STATIONS.findIndex((s) => s.id === site);
  const spec = LINE1_STATIONS[k]!;
  return step(
    site,
    spec.beam ? 'beam' : 'bill',
    spec,
    spec.beam ? ['rail.deposit', 'rail.beamChop', 'rail.beamTake', 'rail.beamDeposit'] : ['rail.deposit'],
    next,
    (w) => !!job(w, k).completion,
    (w) => {
      const row = job(w, k);
      const needs = [need('logs', row.delivered, spec.bill[0])];
      if (spec.bill[1]) needs.push(need('stone', row.stoneDelivered, spec.bill[1]));
      if (spec.beam) {
        const state = beam(w).state;
        needs.push(need('beam', Number(state === 'allocated' || state === 'used'), spec.beam));
      }
      return needs;
    },
  );
}

function quarry(site: Quarry, next: WorksSite) {
  const k = LINE2_STATIONS.findIndex((s) => s.id === site);
  const spec = LINE2_STATIONS[k]!;
  const halt = RAIL_HALTS.find((h) => h.line === LINE2 && h.opens === k && !h.ring && !h.leg);
  return step(
    site,
    'bill',
    spec,
    ['rail.deposit'],
    halt ? haltGift(halt) : next,
    (w) => !!qjob(w, k).completion,
    (w) => {
      const row = qjob(w, k);
      return [need('logs', row.delivered, spec.bill[0]), need('rails', row.railDelivered, spec.bill[1])];
    },
  );
}

const legSlot = (id: string) => RAIL_LEGS.findIndex((l) => l.id === id);
const stack = legSlot('stack'),
  incline = legSlot('incline'),
  bay = legSlot('bay-cut'),
  cave = legSlot('cave'),
  canopy = legSlot('bell-canopy'),
  wall = legSlot('wall'),
  notch = legSlot('notch-tunnel'),
  causeway = legSlot('causeway');
function section(site: Section, slot: number, laid: number) {
  const k = laid - 1;
  const leg = RAIL_LEGS[slot]!;
  const bill = leg.sections[k]!;
  // Some first sections open both ends of a dormant line. Give the halt reached by the new track.
  const halt = RAIL_HALTS.findLast((h) => h.leg?.slot === slot && h.leg.section === k)!;
  return step(
    site,
    'bill',
    legFrame(leg, k),
    ['rail.legStock'],
    haltGift(halt),
    (w) => legRow(w, slot).laid >= laid,
    (w) => {
      const row = legRow(w, slot);
      return [need('logs', row.logs, bill.logs), need('rails', row.rails, bill.rails)];
    },
  );
}

const granted = (w: World, id: number) => !!(routeRow(w).grants & (1 << id));
function grant(site: Grant, next: Gate) {
  const id = RAIL_GRANTS.findIndex((g) => g.id === site);
  return step(site, 'key', RAIL_GRANTS[id]!.at, ['rail.grant'], next, (w) => granted(w, id));
}

function gate(site: Gate, slot: number, k: number, next: Section) {
  const id = RAIL_LEGS[slot]!.sections[k]!.gate!;
  const spec = RAIL_GATES[id]!;
  return step(
    site,
    site === 'plug-gate' ? 'plug' : 'barrier',
    spec.at,
    ['rail.gate'],
    next,
    (w) => !!(routeRow(w).gates & (1 << id)),
    (w) => [need('key', Number(granted(w, spec.needs)), 1)],
  );
}

const wagon = { what: 'wagon' } as const;
const arrival = step(
  'arrive',
  'arrive',
  RAIL_ARRIVAL,
  ['rail.arrive'],
  { what: 'ending' },
  (w) => routeRow(w).arrived >= 0,
  (w) => [need('train', Number(routeRow(w).reached >= 0), 1)],
);
const plugGate = gate('plug-gate', cave, 0, 'cave-1');
const canopyGate = gate('canopy-gate', canopy, 0, 'canopy-1');
const caveSteps = [plugGate, section('cave-1', cave, 1), section('cave-2', cave, 2), section('cave-3', cave, 3)];
const canopySteps = [
  canopyGate,
  section('canopy-1', canopy, 1),
  section('canopy-2', canopy, 2),
  section('canopy-3', canopy, 3),
  grant('cloth', 'notch-gate'),
];
const beforeFork = [
  step('wake', 'wake', RAILWAY_T1.wake, ['rail.wake'], { what: 'ability', id: 'axe' }, (w) => rail(w).awake >= 0),
  station('T1', 'T2'),
  station('T2', 'T3'),
  station('T3', 'forge'),
  step(
    'forge',
    'bill',
    LINE2_FORGE,
    ['rail.deposit'],
    { what: 'ability', id: 'axe' },
    (w) => forge(w).lit >= 0,
    (w) => [need('logs', forge(w).used, LINE2_FORGE.logs)],
  ),
  quarry('Q1', 'Q2'),
  quarry('Q2', 'Q3'),
  quarry('Q3', 'lever'),
  step('lever', 'gate', LINE2_LEVER, ['rail.lever'], 'Q4', (w) => rail(w).lever),
  quarry('Q4', 'hook'),
  step('hook', 'key', LINE2_HOOK, ['rail.hook'], { what: 'ability', id: 'hook' }, (w) => rail(w).hook),
  step(
    'sea',
    'gate',
    LINE2_SEA,
    ['rail.seaSwitch'],
    'Q5',
    (w) => rail(w).sea,
    (w) => [need('key', Number(rail(w).hook), 1)],
  ),
  quarry('Q5', 'boiler'),
  step('boiler', 'boiler', LINE2_BOILER, ['rail.boilerTake'], 'trains', (w) => {
    const state = boiler(w).state;
    return state === 'held' || state === 'fitted';
  }),
  step(
    'trains',
    'boiler',
    LINE2_OLD_TRAIN,
    ['rail.boilerFit'],
    { what: 'trains' },
    (w) => rail(w).trains >= 0,
    () => [need('boiler', 0, 1)],
  ),
  step('breaker', 'part', WORKS_BREAKER, ['rail.breaker'], 'slab', (w) => works(w).breaker >= 2),
  step('slab', 'strike', WORKS_SEAMS[0], ['rail.strike'], 'throat', (w) => !!(works(w).seams & SEAM_STALL)),
  step('throat', 'strike', WORKS_SEAMS[1], ['rail.strike'], 'kiln', (w) => !!(works(w).seams & SEAM_THROAT)),
  step(
    'kiln',
    'kiln',
    WORKS_KILN,
    ['rail.kiln'],
    { what: 'footings' },
    (w) => works(w).lit >= 0,
    (w) => [need('logs', works(w).logs, WORKS.kilnLogs), need('stone', works(w).stone, WORKS.kilnStone)],
  ),
  step(
    'stall',
    'footing',
    SHED_STALL,
    ['rail.footSet'],
    'cradle',
    (w) => shed(w).stall >= WORKS.stall,
    (w) => [need('footings', shed(w).stall, WORKS.stall)],
  ),
  step(
    'cradle',
    'cradle',
    SHED_STALL,
    ['rail.cradle'],
    wagon,
    (w) => shed(w).fitted >= 0,
    (w) => [need('rails', shed(w).cradleRails, WORKS.cradleRails)],
  ),
  quarry('Q6', 'table'),
  step('table', 'table', SHED_TABLE, ['rail.turn'], wagon, (w) => shed(w).table !== 0 || shed(w).ready >= 0),
  // The graph derives this post in view geometry. Its world cm are pinned by the graph test.
  step(
    'upgrade',
    'install',
    { x: 95270, y: SHED_TABLE.y, z: 1448 },
    ['rail.install'],
    wagon,
    (w) => shed(w).ready >= 0,
  ),
  step(
    'crossing',
    'footing',
    PIER_FRAME,
    ['rail.footSet'],
    'Q7',
    (w) => works(w).crossing >= 0,
    (w) => [need('footings', works(w).pierSet, WORKS.pier)],
  ),
  quarry('Q7', 'bents'),
  step(
    'bents',
    'footing',
    RING_HEAD[0]!.jib,
    ['rail.footSet'],
    'brace',
    (w) => aperture(w).set >= WORKS.ring,
    (w) => [need('footings', aperture(w).set, WORKS.ring)],
  ),
  // The aperture row stores 1 for a raised brace (BRACE.RAISED in railway-sys-ring.ts).
  step('brace', 'brace', RING_BRACE, ['rail.brace'], 'weights', (w) => aperture(w).brace !== 1),
  step(
    'weights',
    'footing',
    RING_HEAD[RING_HEAD.length - 1]!.jib,
    ['rail.footSet'],
    'rivet',
    (w) => aperture(w).cw >= WORKS.counterweight,
    (w) => [need('footings', aperture(w).cw, WORKS.counterweight)],
  ),
  step(
    'rivet',
    'strike',
    RING_RIVET,
    ['rail.strike'],
    haltGift(RAIL_HALTS.find((h) => h.line === LINE2 && h.ring)!),
    (w) => aperture(w).joined >= 0,
  ),
  step(
    'steelworks',
    'bill',
    RING_STEEL_WORKS,
    ['rail.steel', 'rail.steelTake'],
    'install',
    (w) => steel(w).lit >= 0 || legDone(w, stack),
    (w) => [need('logs', steel(w).logs, STEEL.logs), need('rails', steel(w).rails, STEEL.rails)],
  ),
  step(
    'install',
    'install',
    SHED_TABLE,
    ['rail.install'],
    { what: 'longer-boiler' },
    (w) => line(w, LINE2).boiler >= 2 || legDone(w, stack),
    (w) => [need('steel', Number(shed(w).steel > 0), 1)],
  ),
  section('stack-1', stack, 1),
  section('stack-2', stack, 2),
  section('stack-3', stack, 3),
  section('stack-4', stack, 4),
  grant('pick', 'incline-gate'),
  gate('incline-gate', incline, 0, 'incline-1'),
  section('incline-1', incline, 1),
  section('incline-2', incline, 2),
  grant('seeds', 'canopy-gate'),
  section('bay-1', bay, 1),
  section('bay-2', bay, 2),
];
const afterFork = [
  section('wall-1', wall, 1),
  section('wall-2', wall, 2),
  section('wall-3', wall, 3),
  section('wall-4', wall, 4),
  section('wall-5', wall, 5),
  gate('deep-gate', wall, 5, 'wall-6'),
  section('wall-6', wall, 6),
  gate('notch-gate', notch, 0, 'notch-1'),
  section('notch-1', notch, 1),
  grant('lantern', 'causeway-gate'),
  gate('causeway-gate', causeway, 0, 'causeway-1'),
  section('causeway-1', causeway, 1),
  arrival,
];
export const WORKS_STEPS: readonly WorksStep[] = [...beforeFork, ...caveSteps, ...canopySteps, ...afterFork];

function nearestHalt(w: World, at: RoomWorks['at']): Halt | null {
  if (rail(w).trains < 0) return null;
  let nearest: Halt | null = null;
  let best = Infinity;
  for (let line = 0; line < RAIL_LINES.length; line++) {
    const n = trainStops(w, line).length;
    for (let stop = 0; stop < n; stop++) {
      if (trainPassesBy(line, stop, 1, n) && trainPassesBy(line, stop, -1, n)) continue;
      const p = RAIL_LINES[line]!.halts[stop]!.platforms[0];
      const x = at.x - p.x,
        y = at.y - p.y,
        z = at.z - p.z;
      const distance = x * x + y * y + z * z;
      if (distance >= best) continue;
      nearest = { line, stop };
      best = distance;
    }
  }
  return nearest;
}

export function roomWorks(w: World): RoomWorks {
  const done = arrival.done(w);
  const pending = (s: WorksStep) => !s.done(w);
  // With both barriers open the cave keeps the default priority until its branch is complete.
  const canopyFirst = canopyGate.done(w) && !plugGate.done(w);
  const { site, kind, at, gives, ops, needs } = done
    ? arrival
    : (beforeFork.find(pending) ??
      (canopyFirst ? canopySteps : caveSteps).find(pending) ??
      (canopyFirst ? caveSteps : canopySteps).find(pending) ??
      afterFork.find(pending) ??
      arrival);
  let target = at;
  let actions = ops;
  if (site === 'bents') target = RING_HEAD[ringHead(w)]!.jib;
  if (site === 'boiler') {
    const part = boiler(w);
    if (part.state === 'ground') target = part;
  }
  if (site === 'T3') {
    const timber = beam(w);
    if (timber.state === 'ground' || timber.state === 'available') {
      target = timber;
      actions = ['rail.beamTake'];
    }
  }
  const { x, y, z } = target;
  const place = { x, y, z };
  return { site, kind, at: place, gives, ops: actions, needs: needs(w), halt: nearestHalt(w, place), done };
}
