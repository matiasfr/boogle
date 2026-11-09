// Accepted fixtures for the boiler and kit train. No direct state writes.
import assert from 'node:assert/strict';
import { railwayAtQ5, act, advance, type World } from './railway-q2.ts';
import { invariant, restore } from '../railway-live.ts';
import { line2Rails, line2Schedule } from '../../src/sim/railway-line2.ts';
export type TrainStage = 'boiler' | 'boiler-camp' | 'trains-on' | 'q6-stocked' | 'q6-finishing' | 'q6-done';
export const TRAIN_STAGES: readonly TrainStage[] = [
  'boiler',
  'boiler-camp',
  'trains-on',
  'q6-stocked',
  'q6-finishing',
  'q6-done',
];
// Share only a serialized source fixture through restore, never a mutable world between callers.
let base: World | undefined;
export function railwayAtTrains(stage: TrainStage): World {
  if (!base) {
    base = railwayAtQ5('q5-done');
    // The earlier fixture hand-fills Q5: carry off its unused depot logs so the first kit is the full 32/32.
    while (base.s.line2!.depot) {
      const n = act(base, 'a', 'rail.depotTake');
      assert.ok(n > 0);
      assert.equal(act(base, 'a', 'rail.drop', { x: 91900, y: 1815, z: 540, n, kind: 0 }), n);
    }
  }
  const w = { s: restore(base.s), t: base.t };
  const l = w.s.line2!;
  assert.equal(l.boiler.state, 'pedestal');
  if (stage !== 'boiler') {
    assert.equal(act(w, 'a', 'rail.boilerTake', { revision: l.boiler.revision }), 1);
    if (stage === 'boiler-camp') {
      assert.equal(act(w, 'a', 'rail.boilerDrop', { revision: l.boiler.revision, x: 100700, y: 3030, z: -14400 }), 1);
    } else {
      assert.equal(act(w, 'a', 'rail.boilerFit', { revision: l.boiler.revision }), 1);
      advance(w, 20);
      assert.ok(l.train.every((r) => r.phase === 0));
    }
  }
  if (stage === 'q6-stocked' || stage === 'q6-finishing' || stage === 'q6-done') {
    let ticks = 0;
    while (l.depot !== 32 || l.depotRails !== 32) {
      assert.ok(ticks++ < 4000, 'kit unloaded at Far Head');
      advance(w, 1);
      assert.equal(line2Rails(w.s), l.forge.poured);
    }
    if (stage !== 'q6-stocked') {
      assert.equal(act(w, 'a', 'rail.pack'), 1);
      for (const kind of [0, 2])
        for (const pid of ['a', 'b']) {
          assert.equal(act(w, pid, kind ? 'rail.depotRailTake' : 'rail.depotTake'), 16);
          assert.equal(act(w, pid, 'rail.deposit', { station: 'Q6', kind, n: 16 }), 16);
        }
      const total = line2Schedule(5, l.jobs[5]!).totalTicks;
      advance(w, stage === 'q6-done' ? total : total - 450);
    }
  }
  assert.equal(invariant(w.s), null);
  return w;
}
