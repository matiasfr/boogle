// The step meter behind GET /rooms/:id/host `steps` (docs/plans/replication.md, throttling check): percentiles of the
// timer gap and the per-step commit + flush cost, and steps dropped by the catch-up cap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStepMeter } from '../src/host/step-meter.ts';
import { createFixedSteps, MAX_CATCH_UP } from '../../src/world/room-clock.ts';

test('gap and cost percentiles, max and the count of gaps over 25 ms', () => {
  const m = createStepMeter();
  let t = 1000;
  m.timer(t); // the first call has no gap
  for (let i = 0; i < 99; i++) m.timer((t += 16.7));
  m.timer((t += 80)); // one stall
  for (let i = 0; i < 100; i++) m.cost(i < 95 ? 0.05 : 0.5);
  const r = m.report(3);
  assert.equal(r.timers, 100);
  assert.equal(r.steps, 100);
  assert.ok(Math.abs(r.gapMs.p50 - 16.7) < 0.01);
  assert.ok(Math.abs(r.gapMs.p95 - 16.7) < 0.01);
  assert.ok(Math.abs(r.gapMs.max - 80) < 0.01);
  assert.equal(r.gapsOver25ms, 1);
  assert.equal(r.costMs.p50, 0.05);
  assert.equal(r.costMs.max, 0.5);
  assert.equal(r.dropped, 3);
});

test('an empty meter reports zeros', () => {
  const r = createStepMeter().report(0);
  assert.deepEqual(r.gapMs, { p50: 0, p95: 0, max: 0, recentMax: 0 });
  assert.equal(r.steps, 0);
});

test('the fixed-step accumulator counts steps the cap drops', () => {
  const f = createFixedSteps();
  assert.equal(f.dropped(), 0);
  let ran = 0;
  f.advance(1000 / 60 + 0.01, () => ran++);
  assert.equal(f.dropped(), 0);
  // 2 s late: the cap runs MAX_CATCH_UP steps and the rest of the 120 are dropped
  f.advance(2000, () => ran++);
  assert.equal(ran, 1 + MAX_CATCH_UP);
  assert.ok(f.dropped() >= 120 - MAX_CATCH_UP - 1);
});
