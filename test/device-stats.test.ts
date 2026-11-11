import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PASS_P95_REFRESH_INTERVALS,
  countOver,
  frameStats,
  heatDrift,
  median,
  percentile,
  sceneVerdict,
} from '../src/debug/device/stats.ts';

test('percentiles of known arrays', () => {
  const s = [1, 2, 3, 4, 5];
  assert.equal(percentile(s, 0), 1);
  assert.equal(percentile(s, 50), 3);
  assert.equal(percentile(s, 100), 5);
  assert.equal(percentile(s, 25), 2);
  assert.equal(percentile([10, 20], 50), 15);
  assert.equal(percentile([7], 95), 7);
  assert.ok(Number.isNaN(percentile([], 50)));
  assert.equal(median([5, 1, 3]), 3);
});

test('counts over a limit are strict', () => {
  assert.equal(countOver([10, 33, 34, 50, 51, 120], 33), 4);
  assert.equal(countOver([], 33), 0);
});

test('an empty sample is not measured, never zeros', () => {
  assert.equal(frameStats([]), null);
  assert.equal(frameStats([0, NaN, -3]), null);
  const v = sceneVerdict({ stats: null, seconds: 5, hidden: false, refreshMs: 16.7 });
  assert.equal(v.verdict, 'not-measured');
});

test('frame stats count the stalls', () => {
  const intervals = [...Array<number>(95).fill(16.7), 40, 60, 70, 120, 200];
  const s = frameStats(intervals)!;
  assert.equal(s.n, 100);
  assert.equal(s.over33, 5);
  assert.equal(s.over50, 4);
  assert.equal(s.max, 200);
  assert.equal(s.p50, 16.7);
});

test('the verdict has three branches: pass, fail with the reason, not measured', () => {
  const refreshMs = 1000 / 60;
  const good = frameStats(Array<number>(300).fill(16.7))!; // 300 frames in 5 s: 60 a second
  assert.deepEqual(sceneVerdict({ stats: good, seconds: 5, hidden: false, refreshMs }), { verdict: 'pass', why: '' });

  const slow = frameStats(Array<number>(100).fill(50))!; // 20 a second, p95 50 ms
  const fail = sceneVerdict({ stats: slow, seconds: 5, hidden: false, refreshMs });
  assert.equal(fail.verdict, 'fail');
  assert.match(fail.why, /frames a second/);
  assert.match(fail.why, /p95 50\.0 ms/);

  const hidden = sceneVerdict({ stats: good, seconds: 5, hidden: true, refreshMs });
  assert.equal(hidden.verdict, 'not-measured');
  assert.match(hidden.why, /hidden/);
});

test('the pass line is two refresh intervals of this device', () => {
  assert.equal(PASS_P95_REFRESH_INTERVALS, 2);
  // A 30 Hz device (33.3 ms): p95 of 60 ms passes; the same p95 fails on a 60 Hz one.
  const frames = frameStats([...Array<number>(95).fill(33.3), ...Array<number>(5).fill(60)])!;
  assert.equal(
    sceneVerdict({ stats: { ...frames, n: 150 }, seconds: 5, hidden: false, refreshMs: 33.3 }).verdict,
    'pass',
  );
  assert.equal(
    sceneVerdict({ stats: { ...frames, p95: 60, n: 300 }, seconds: 5, hidden: false, refreshMs: 16.7 }).verdict,
    'fail',
  );
});

test('heat drift is the p50 change in percent, or null', () => {
  assert.equal(heatDrift(10, 12), 20);
  assert.equal(heatDrift(10, 9), -10);
  assert.equal(heatDrift(null, 9), null);
  assert.equal(heatDrift(10, null), null);
  assert.equal(heatDrift(0, 5), null);
});
