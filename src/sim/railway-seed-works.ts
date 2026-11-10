// Seeds for Split-rock Works, on ./railway-seed-route.ts (./railway-seeds.ts is the catalog and how to add a stage). Accepted fixtures for Split-rock Works and the Roundhouse (docs/plans/split-rock-roundhouse.md, J3f), built on the
// B5-B8 `q6-done` fixture through accepted sim ops only. No direct state writes.
import { act, advance, railwayAtTrains, type World } from './railway-seed-route.ts';
import { invariant, need, restore } from './railway-live.ts';
import { railAccount } from './railway.ts';
import { RAILWAY_SOURCES } from './railway-layout.ts';
import { LINE1_HARDWOOD_IDS } from './railway-line-layout.ts';
import { WORKS, WORKS_ROCKS, SHED_STALL } from './railway-works-layout.ts';
import { footingTotal } from './railway-works.ts';

export type WorksStage =
  | 'works-arrive'
  | 'works-open'
  | 'works-lit'
  | 'stall-done'
  | 'cradle-fitted'
  | 'wagon-on'
  | 'crossing-finishing'
  | 'crossing-done';
export const WORKS_STAGES: readonly WorksStage[] = [
  'works-arrive',
  'works-open',
  'works-lit',
  'stall-done',
  'cradle-fitted',
  'wagon-on',
  'crossing-finishing',
  'crossing-done',
];

/** Logs onto a's back, from any standing tree or hardwood (the proper axe is out by now). */
export function chopTo(w: World, pid: string, n: number) {
  const a = () => railAccount(w.s, pid)!;
  for (let guard = 0; a().carry < n; guard++) {
    need(guard < 200, 'logs to chop');
    const k = w.s.sources.findIndex((left) => left > 0);
    const h = w.s.line!.hardwood.findIndex((left) => left > 0);
    const id = k >= 0 ? RAILWAY_SOURCES[k]![0] : LINE1_HARDWOOD_IDS[h]!;
    need(k >= 0 || h >= 0, 'a standing tree');
    need(act(w, pid, 'rail.chop', { id, yaw: 0, collapsed: false }) > 0, 'a log chopped');
  }
}
/** Keeps every footing in one home across `ticks` rule ticks. */
export function advanceWorks(w: World, ticks: number) {
  for (let i = 0; i < ticks; i++) {
    advance(w, 1);
    need(footingTotal(w.s) === w.s.works!.poured, `footings at tick ${w.t}`);
  }
}
function carryFooting(w: World, pid: string, rack: 0 | 1, site: 0 | 1 | 2) {
  need(act(w, pid, 'rail.footTake', { rack }) === 1, 'a footing taken');
  need(act(w, pid, 'rail.footSet', { site }) === 1, 'a footing set');
}

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<WorksStage, World>();
/** The railway at a Works stage, each built on the one before it (the B5-B8 `q6-done` fixture first). */
export function railwayAtWorks(stage: WorksStage): World {
  const k = WORKS_STAGES.indexOf(stage);
  need(k >= 0, stage);
  let base = cache.get(stage);
  if (!base) {
    const before = k ? railwayAtWorks(WORKS_STAGES[k - 1]!) : railwayAtTrains('q6-done');
    base = build(before, stage);
    need(invariant(base.s) === null, stage);
    cache.set(stage, base);
  }
  return { s: restore(base.s), t: base.t };
}

function build(w: World, stage: WorksStage): World {
  const works = w.s.works!,
    shed = w.s.shed!,
    l2 = w.s.line2!;
  switch (stage) {
    case 'works-arrive':
      // Q6 laid: the forge has cast the breaker on the boiler's old pedestal.
      need(works.breaker === 1, 'the breaker cast');
      break;
    case 'works-open':
      need(act(w, 'a', 'rail.breaker') === 1, 'the breaker taken');
      need(act(w, 'a', 'rail.strike', { id: 0 }) === 1, 'seam 0 struck');
      need(act(w, 'a', 'rail.strike', { id: 1 }) === 1, 'seam 1 struck');
      need(works.seams === 3, 'three seams open');
      break;
    case 'works-lit': {
      // Sixteen logs carried from Home, sixteen stone mined in the bowl.
      chopTo(w, 'a', WORKS.kilnLogs);
      need(act(w, 'a', 'rail.kiln') === WORKS.kilnLogs, 'the kiln took logs');
      for (const rock of WORKS_ROCKS)
        while (w.s.line!.rocks[rock.id]! > 0) need(act(w, 'b', 'rail.mine', { id: rock.id }) > 0, 'works stone mined');
      need(act(w, 'b', 'rail.kiln') === WORKS.kilnStone, 'the kiln took stone');
      need(works.lit >= 0, 'the kiln lit');
      for (let guard = 0; works.rack < WORKS.rackCap; guard++) {
        need(guard < WORKS.castTicks * (WORKS.rackCap + 1), 'the kiln pours');
        advanceWorks(w, 1);
      }
      break;
    }
    case 'stall-done':
      for (let i = 0; i < WORKS.stall; i++) carryFooting(w, 'a', 0, 0);
      need(shed.stall === WORKS.stall, 'the stall built');
      break;
    case 'cradle-fitted': {
      for (let i = 0; i < WORKS.cradle; i++) carryFooting(w, 'a', 0, 1);
      for (let guard = 0; l2.forge.rack < WORKS.cradleRails; guard++) {
        need(guard < 1000, 'the forge pours rails');
        advanceWorks(w, 1);
      }
      need(act(w, 'b', 'rail.forgeTake') >= WORKS.cradleRails, 'cradle rails taken');
      need(act(w, 'b', 'rail.cradle') === WORKS.cradleRails, 'the cradle took rails');
      // Rails left over go down by the stall (they return to the forge rack if nobody takes them).
      const left = railAccount(w.s, 'b')!.rails ?? 0;
      if (left)
        need(
          act(w, 'b', 'rail.drop', { x: SHED_STALL.x, y: SHED_STALL.y, z: SHED_STALL.z, n: left, kind: 2 }) === left,
          'left-over rails dropped by the stall',
        );
      need(shed.fitted >= 0, 'the cradle fitted');
      break;
    }
    case 'wagon-on':
      need(act(w, 'a', 'rail.turn', { to: 1, revision: shed.tableRev }) === 1, 'the turntable turned');
      need(shed.ready >= 0, 'the wagon ready');
      for (let guard = 0; !w.s.trains.some((r) => r.wagon); guard++) {
        need(guard < 4000, 'the wagon couples');
        advanceWorks(w, 1);
      }
      break;
    case 'crossing-finishing':
    case 'crossing-done': {
      const set = stage === 'crossing-done' ? WORKS.pier : WORKS.pier - 2;
      for (let guard = 0; works.pierSet < set; guard++) {
        need(guard < 20000, 'footings reach the pier');
        if (works.pierRack > 0) carryFooting(w, 'a', 1, 2);
        else advanceWorks(w, 1);
      }
      if (stage === 'crossing-finishing')
        for (let guard = 0; works.pierRack < 2; guard++) {
          need(guard < 20000, 'the last two footings reach the pier rack');
          advanceWorks(w, 1);
        }
      else need(works.crossing >= 0, 'the crossing complete');
      break;
    }
  }
  return w;
}
