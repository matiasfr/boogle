// Accepted fixtures for Split-rock Works and the Roundhouse (docs/plans/split-rock-roundhouse.md, J3f), built on the
// B5-B8 `q6-done` fixture through accepted sim ops only. No direct state writes.
import assert from 'node:assert/strict';
import { act, advance, type World } from './railway-q2.ts';
import { railwayAtTrains } from './railway-trains.ts';
import { invariant, restore } from '../railway-live.ts';
import { railAccount } from '../../src/sim/railway.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
import { LINE1_HARDWOOD_IDS } from '../../src/sim/railway-line-layout.ts';
import { WORKS, WORKS_ROCKS, SHED_STALL } from '../../src/sim/railway-works-layout.ts';
import { footingTotal } from '../../src/sim/railway-works.ts';

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
    assert.ok(guard < 200, 'logs to chop');
    const k = w.s.sources.findIndex((left) => left > 0);
    const h = w.s.line!.hardwood.findIndex((left) => left > 0);
    const id = k >= 0 ? RAILWAY_SOURCES[k]![0] : LINE1_HARDWOOD_IDS[h]!;
    assert.ok(k >= 0 || h >= 0, 'a standing tree');
    assert.ok(act(w, pid, 'rail.chop', { id, yaw: 0, collapsed: false }) > 0);
  }
}
/** Keeps every footing in one home across `ticks` rule ticks. */
export function advanceWorks(w: World, ticks: number) {
  for (let i = 0; i < ticks; i++) {
    advance(w, 1);
    assert.equal(footingTotal(w.s), w.s.works!.poured, `footings at tick ${w.t}`);
  }
}
function carryFooting(w: World, pid: string, rack: 0 | 1, site: 0 | 1 | 2) {
  assert.equal(act(w, pid, 'rail.footTake', { rack }), 1);
  assert.equal(act(w, pid, 'rail.footSet', { site }), 1);
}

// Share only a serialized source fixture through restore, never a mutable world between callers.
const cache = new Map<WorksStage, World>();
/** The railway at a Works stage, each built on the one before it (the B5-B8 `q6-done` fixture first). */
export function railwayAtWorks(stage: WorksStage): World {
  const k = WORKS_STAGES.indexOf(stage);
  assert.ok(k >= 0, stage);
  let base = cache.get(stage);
  if (!base) {
    const before = k ? railwayAtWorks(WORKS_STAGES[k - 1]!) : railwayAtTrains('q6-done');
    base = build(before, stage);
    assert.equal(invariant(base.s), null, stage);
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
      assert.equal(works.breaker, 1);
      break;
    case 'works-open':
      assert.equal(act(w, 'a', 'rail.breaker'), 1);
      assert.equal(act(w, 'a', 'rail.strike', { id: 0 }), 1);
      assert.equal(act(w, 'a', 'rail.strike', { id: 1 }), 1);
      assert.equal(works.seams, 3);
      break;
    case 'works-lit': {
      // Sixteen logs carried from Home, sixteen stone mined in the bowl.
      chopTo(w, 'a', WORKS.kilnLogs);
      assert.equal(act(w, 'a', 'rail.kiln'), WORKS.kilnLogs);
      for (const rock of WORKS_ROCKS)
        while (w.s.line!.rocks[rock.id]! > 0) assert.ok(act(w, 'b', 'rail.mine', { id: rock.id }) > 0);
      assert.equal(act(w, 'b', 'rail.kiln'), WORKS.kilnStone);
      assert.ok(works.lit >= 0);
      for (let guard = 0; works.rack < WORKS.rackCap; guard++) {
        assert.ok(guard < WORKS.castTicks * (WORKS.rackCap + 1), 'the kiln pours');
        advanceWorks(w, 1);
      }
      break;
    }
    case 'stall-done':
      for (let i = 0; i < WORKS.stall; i++) carryFooting(w, 'a', 0, 0);
      assert.equal(shed.stall, WORKS.stall);
      break;
    case 'cradle-fitted': {
      for (let i = 0; i < WORKS.cradle; i++) carryFooting(w, 'a', 0, 1);
      for (let guard = 0; l2.forge.rack < WORKS.cradleRails; guard++) {
        assert.ok(guard < 1000, 'the forge pours rails');
        advanceWorks(w, 1);
      }
      assert.ok(act(w, 'b', 'rail.forgeTake') >= WORKS.cradleRails);
      assert.equal(act(w, 'b', 'rail.cradle'), WORKS.cradleRails);
      // Rails left over go down by the stall (they return to the forge rack if nobody takes them).
      const left = railAccount(w.s, 'b')!.rails ?? 0;
      if (left)
        assert.equal(
          act(w, 'b', 'rail.drop', { x: SHED_STALL.x, y: SHED_STALL.y, z: SHED_STALL.z, n: left, kind: 2 }),
          left,
        );
      assert.ok(shed.fitted >= 0);
      break;
    }
    case 'wagon-on':
      assert.equal(act(w, 'a', 'rail.turn', { to: 1, revision: shed.tableRev }), 1);
      assert.ok(shed.ready >= 0);
      for (let guard = 0; !l2.train[1]!.wagon; guard++) {
        assert.ok(guard < 4000, 'the wagon couples');
        advanceWorks(w, 1);
      }
      break;
    case 'crossing-finishing':
    case 'crossing-done': {
      const set = stage === 'crossing-done' ? WORKS.pier : WORKS.pier - 2;
      for (let guard = 0; works.pierSet < set; guard++) {
        assert.ok(guard < 20000, 'footings reach the pier');
        if (works.pierRack > 0) carryFooting(w, 'a', 1, 2);
        else advanceWorks(w, 1);
      }
      if (stage === 'crossing-finishing')
        for (let guard = 0; works.pierRack < 2; guard++) {
          assert.ok(guard < 20000, 'the last two footings reach the pier rack');
          advanceWorks(w, 1);
        }
      else assert.ok(works.crossing >= 0);
      break;
    }
  }
  return w;
}
