import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frameStats, heatDrift, percentile, sceneVerdict } from '../src/debug/device/stats.ts';

test('percentiles interpolate between ranks; an empty array is NaN', () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 25), 2);
  assert.equal(percentile([10, 20], 50), 15);
  assert.equal(percentile([7], 95), 7);
  assert.ok(Number.isNaN(percentile([], 50)));
});

test('an empty sample is not measured, never zeros', () => {
  assert.equal(frameStats([0, NaN, -3]), null);
  assert.equal(sceneVerdict({ stats: null, seconds: 5, hidden: false, refreshMs: 16.7 }).verdict, 'not-measured');
  assert.equal(heatDrift(null, 9), null);
  assert.equal(heatDrift(0, 5), null);
});

test('frame stats count the stalls', () => {
  const s = frameStats([...Array<number>(95).fill(16.7), 40, 60, 70, 120, 200])!;
  assert.deepEqual([s.n, s.over33, s.over50, s.max, s.p50], [100, 5, 4, 200, 16.7]);
});

test('the verdict: pass, fail with the reason, hidden is not measured; the line follows the refresh rate', () => {
  const refreshMs = 1000 / 60;
  const good = frameStats(Array<number>(300).fill(16.7))!; // 300 frames in 5 s: 60 a second
  assert.deepEqual(sceneVerdict({ stats: good, seconds: 5, hidden: false, refreshMs }), { verdict: 'pass', why: '' });
  const slow = sceneVerdict({ stats: frameStats(Array<number>(100).fill(50))!, seconds: 5, hidden: false, refreshMs });
  assert.equal(slow.verdict, 'fail');
  assert.match(slow.why, /frames a second.*p95 50\.0 ms/);
  assert.match(sceneVerdict({ stats: good, seconds: 5, hidden: true, refreshMs }).why, /hidden/);
  // A 30 Hz device (33.3 ms): p95 of 60 ms passes; the same p95 fails on a 60 Hz one.
  const frames = { ...frameStats(Array<number>(150).fill(33.3))!, p95: 60 };
  assert.equal(sceneVerdict({ stats: frames, seconds: 5, hidden: false, refreshMs: 33.3 }).verdict, 'pass');
  assert.equal(sceneVerdict({ stats: { ...frames, n: 300 }, seconds: 5, hidden: false, refreshMs }).verdict, 'fail');
});
