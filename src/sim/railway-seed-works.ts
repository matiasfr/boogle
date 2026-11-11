// Seeds for Split-rock Works, on ./railway-seed-route.ts (./railway-seeds.ts is the catalog and how to add a stage). Accepted fixtures for Split-rock Works and the Roundhouse (docs/plans/split-rock-roundhouse.md, J3f), built on the
// B5-B8 `q6-done` fixture through accepted sim ops only. No direct state writes.
import { act, advance, railwayAtTrains, type Seed } from './railway-seed-route.ts';
import { check, invariant, need, restore } from './railway-drive.ts';
import { account, forge, hardwoods, rock, shed, trains, trees, works } from './railway-rows.ts';
import { RAILWAY_SOURCES } from './railway-layout.ts';
import { LINE1_HARDWOOD_IDS } from './railway-line-layout.ts';
import { WORKS, WORKS_ROCKS, SHED_STALL } from './railway-works-layout.ts';

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
export function chopTo(s: Seed, pid: string, n: number) {
  for (let guard = 0; account(s.w, pid)!.carry < n; guard++) {
    need(guard < 200, 'logs to chop');
    const k = trees(s.w).findIndex((t) => t.left > 0);
    const h = hardwoods(s.w).findIndex((t) => t.left > 0);
    const id = k >= 0 ? RAILWAY_SOURCES[k]![0] : LINE1_HARDWOOD_IDS[h]!;
    need(k >= 0 || h >= 0, 'a standing tree');
    need(act(s, pid, 'rail.chop', { id, yaw: 0, collapsed: false }) > 0, 'a log chopped');
  }
}
/** Keeps every footing in one home across `ticks` rule ticks (footing conservation, among the rest of the load
 * check). */
export function advanceWorks(s: Seed, ticks: number) {
  for (let i = 0; i < ticks; i++) {
    advance(s, 1);
    const broken = check(s.w);
    need(broken === null, `footings at tick ${s.t}: ${broken}`);
  }
}
function carryFooting(s: Seed, pid: string, rack: 0 | 1, site: 0 | 1 | 2) {
  need(act(s, pid, 'rail.footTake', { rack }) === 1, 'a footing taken');
  need(act(s, pid, 'rail.footSet', { site }) === 1, 'a footing set');
}

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<WorksStage, Seed>();
/** The railway at a Works stage, each built on the one before it (the B5-B8 `q6-done` fixture first). */
export function railwayAtWorks(stage: WorksStage): Seed {
  const k = WORKS_STAGES.indexOf(stage);
  need(k >= 0, stage);
  let base = cache.get(stage);
  if (!base) {
    const before = k ? railwayAtWorks(WORKS_STAGES[k - 1]!) : railwayAtTrains('q6-done');
    base = build(before, stage);
    need(invariant(base.w) === null, stage);
    cache.set(stage, base);
  }
  return { w: restore(base.w), t: base.t };
}

function build(s: Seed, stage: WorksStage): Seed {
  const w = s.w;
  switch (stage) {
    case 'works-arrive':
      // Q6 laid: the forge has cast the breaker on the boiler's old pedestal.
      need(works(w).breaker === 1, 'the breaker cast');
      break;
    case 'works-open':
      need(act(s, 'a', 'rail.breaker') === 1, 'the breaker taken');
      need(act(s, 'a', 'rail.strike', { id: 0 }) === 1, 'seam 0 struck');
      need(act(s, 'a', 'rail.strike', { id: 1 }) === 1, 'seam 1 struck');
      need(works(w).seams === 3, 'three seams open');
      break;
    case 'works-lit': {
      // Sixteen logs carried from Home, sixteen stone mined in the bowl.
      chopTo(s, 'a', WORKS.kilnLogs);
      need(act(s, 'a', 'rail.kiln') === WORKS.kilnLogs, 'the kiln took logs');
      for (const spot of WORKS_ROCKS)
        while (rock(w, spot.id).left > 0) need(act(s, 'b', 'rail.mine', { id: spot.id }) > 0, 'works stone mined');
      need(act(s, 'b', 'rail.kiln') === WORKS.kilnStone, 'the kiln took stone');
      need(works(w).lit >= 0, 'the kiln lit');
      for (let guard = 0; works(w).rack < WORKS.rackCap; guard++) {
        need(guard < WORKS.castTicks * (WORKS.rackCap + 1), 'the kiln pours');
        advanceWorks(s, 1);
      }
      break;
    }
    case 'stall-done':
      for (let i = 0; i < WORKS.stall; i++) carryFooting(s, 'a', 0, 0);
      need(shed(w).stall === WORKS.stall, 'the stall built');
      break;
    case 'cradle-fitted': {
      for (let i = 0; i < WORKS.cradle; i++) carryFooting(s, 'a', 0, 1);
      for (let guard = 0; forge(w).rack < WORKS.cradleRails; guard++) {
        need(guard < 1000, 'the forge pours rails');
        advanceWorks(s, 1);
      }
      need(act(s, 'b', 'rail.forgeTake') >= WORKS.cradleRails, 'cradle rails taken');
      need(act(s, 'b', 'rail.cradle') === WORKS.cradleRails, 'the cradle took rails');
      // Rails left over go down by the stall (they return to the forge rack if nobody takes them).
      const left = account(w, 'b')!.rails;
      if (left)
        need(
          act(s, 'b', 'rail.drop', { x: SHED_STALL.x, y: SHED_STALL.y, z: SHED_STALL.z, n: left, kind: 2 }) === left,
          'left-over rails dropped by the stall',
        );
      need(shed(w).fitted >= 0, 'the cradle fitted');
      break;
    }
    case 'wagon-on':
      need(act(s, 'a', 'rail.turn', { to: 1, revision: shed(w).tableRev }) === 1, 'the turntable turned');
      need(shed(w).ready >= 0, 'the wagon ready');
      for (let guard = 0; !trains(w).some((r) => r.wagon); guard++) {
        need(guard < 4000, 'the wagon couples');
        advanceWorks(s, 1);
      }
      break;
    case 'crossing-finishing':
    case 'crossing-done': {
      const set = stage === 'crossing-done' ? WORKS.pier : WORKS.pier - 2;
      for (let guard = 0; works(w).pierSet < set; guard++) {
        need(guard < 20000, 'footings reach the pier');
        if (works(w).pierRack > 0) carryFooting(s, 'a', 1, 2);
        else advanceWorks(s, 1);
      }
      if (stage === 'crossing-finishing')
        for (let guard = 0; works(w).pierRack < 2; guard++) {
          need(guard < 20000, 'the last two footings reach the pier rack');
          advanceWorks(s, 1);
        }
      else need(works(w).crossing >= 0, 'the crossing complete');
      break;
    }
  }
  return s;
}
