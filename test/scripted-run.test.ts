// Scripted runs (src/sim/scripted-run.ts): phases in order, integer progress, done at t0 + length, nothing before t0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { runAt, lengthOf, MACHINE_RUN } from '../src/sim/scripted-run.ts';

const S = [
  { name: 'a', len: 10 },
  { name: 'b', len: 30 },
];

test('phases play in order with integer progress, and the run is done at t0 + length', () => {
  assert.equal(lengthOf(S), 40);
  assert.deepEqual(runAt(S, -1, 5), { phase: -1, name: '', progress: 0, total: 0, done: false });
  assert.equal(runAt(S, 100, 99).phase, -1);
  assert.deepEqual(runAt(S, 100, 100), { phase: 0, name: 'a', progress: 0, total: 0, done: false });
  assert.deepEqual(runAt(S, 100, 105), { phase: 0, name: 'a', progress: 500, total: 125, done: false });
  assert.deepEqual(runAt(S, 100, 125), { phase: 1, name: 'b', progress: 500, total: 625, done: false });
  assert.equal(runAt(S, 100, 139).done, false);
  assert.equal(runAt(S, 100, 140).done, true);
  for (let t = 100; t < 150; t++) {
    const r = runAt(S, 100, t);
    assert.ok(Number.isInteger(r.progress) && Number.isInteger(r.total));
  }
});

test('the machine run is integer ticks', () => {
  assert.ok(MACHINE_RUN.every((p) => Number.isInteger(p.len) && p.len > 0));
  assert.equal(lengthOf(MACHINE_RUN), 500);
});
