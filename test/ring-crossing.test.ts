// Ring Island's foot crossing (src/entities/ring-island/state.ts; docs/plans/ring-island-crossing.md, step 1): the
// plank spans against the rails and the bed. Where it sits against the standing trains is dev/level/ring.ts's report.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RING_FORMATION, RING_HALT } from '../src/sim/railway-ring-layout.ts';
import { RING_CROSSING, ringCrossingPlanks } from '../src/entities/ring-island/state.ts';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

test('the planks cover the bed less a flangeway by each of the four rails', () => {
  const spans = ringCrossingPlanks();
  assert.equal(spans.length, 5);
  const [left, right] = [RING_FORMATION.left / 100, RING_FORMATION.right / 100];
  assert.ok(near(spans[0]![1], right) && near(spans[4]![0], left), 'they reach both kerbs');
  for (const [lo, hi] of spans) assert.ok(hi - lo > 0.5, `span ${lo}..${hi} is a plank, not a sliver`);
  for (let k = 1; k < spans.length; k++) {
    const flangeway = spans[k - 1]![0] - spans[k]![1];
    assert.ok(near(flangeway, 0.16), `flangeway ${k} is 0.16 m, got ${flangeway}`);
  }
  const covered = spans.reduce((sum, [lo, hi]) => sum + hi - lo, 0);
  assert.ok(near(covered, right - left - 4 * 0.16));
});

test('no plank comes within 0.08 m of a rail', () => {
  const rails = RING_FORMATION.tracks.flatMap((t) => [t / 100 - 0.5, t / 100 + 0.5]);
  for (const rail of rails)
    for (const [lo, hi] of ringCrossingPlanks())
      assert.ok(rail <= lo - 0.08 + 1e-9 || rail >= hi + 0.08 - 1e-9, `rail ${rail} against ${lo}..${hi}`);
});

test('the crossing sits inside the old platforms, level with the rail tops', () => {
  const C = RING_CROSSING;
  assert.ok(near(C.top, RING_HALT.y / 100 + 0.22));
  assert.ok(C.landing[0] >= RING_HALT.u0 / 100 && C.landing[0] <= C.u0 && C.u1 <= C.landing[1]);
  assert.ok(C.landing[1] < C.rampTop && C.rampTop < RING_HALT.u1 / 100);
});
