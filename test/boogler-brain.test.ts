import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBooglerBrain } from '../src/world/boogler-brain.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import type { BooglerLand } from '../src/world/boogler-land.ts';

const land: BooglerLand = {
  height: () => 2,
  blocked: () => false,
  keepOut: [],
  mainland: { x: 0, z: -40, rx: 80, rz: 90 },
};
const make = () => createBooglerBrain({ land, rng: mulberry32(123), start: { x: 30, z: 2.5 } });
test('the headless brain reacts to talk, rider and wary facts without a view', () => {
  const brain = make();
  brain.step(1 / 60, [{ x: 31, z: 2.5, act: 1, wary: false }]);
  assert.equal(brain.state.walking, false);
  assert.ok(brain.state.wait >= 1);
  brain.step(1 / 60, [{ x: 30, z: 2.5, act: 2, wary: false }]);
  assert.equal(brain.state.mode, 2);
  assert.ok(brain.state.wait <= 0.3);
  brain.step(1 / 60, [{ x: 34, z: 2.5, act: 0, wary: true }]);
  assert.equal(brain.state.mode, 1);
  assert.ok(brain.state.tx < brain.state.x);
});
test('a seed and identical visitors produce identical decisions for 20000 frames', () => {
  const a = make(),
    b = make();
  for (let tick = 0; tick < 20000; tick++) {
    a.step(1 / 60, []);
    b.step(1 / 60, []);
    assert.deepEqual(a.snapshot(), b.snapshot());
  }
});
