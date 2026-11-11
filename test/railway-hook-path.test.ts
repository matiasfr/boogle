// Explicit pure-maths proof requested by docs/plans/hook-shot.md, step 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PADS, ringAt, MOVE } from '../src/place/tech-layout.ts';
import { PLAYER_R } from '../src/constants.ts';
import {
  hookRings,
  buildPull,
  pathAt,
  stepPull,
  cancelVelocity,
  holdPick,
  createHookLatch,
} from '../src/entities/railway/hook-path.ts';

const all = hookRings(PADS, ringAt, 1000);
// The climb; the secrets' side rings follow it (place-retirement F2).
const rings = all.slice(0, 8);
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('hook rings and slabs match the authored climb one for one', () => {
  assert.deepEqual(
    all.map((r) => r.id),
    ['p2', 't0', 't1', 't2', 't3', 't4', 't5', 'summit', 'alcove', 'nook', 'loft', 'stack-return'],
  );
  assert.deepEqual(
    rings.slice(1).map(({ pad: p }) => [p.x, p.z, p.top, p.hx, p.hz, p.look]),
    [
      [8, 8, 24, 3, 3, 'float'],
      [-7.6, -1, 37, 3, 3, 'float'],
      [-7.6, -19, 50, 3, 3, 'float'],
      [8, -28, 63, 3, 3, 'float'],
      [23.6, -19, 76, 3, 3, 'float'],
      [23.6, -1, 89, 3, 3, 'float'],
      [15, -6, 102.4, 5, 4, 'wood'],
    ],
  );
  for (const r of rings) {
    const at = ringAt(PADS.find((p) => p.id === r.id)!);
    assert.deepEqual(r.at, { ...at, x: at.x + 1000 });
    near(r.land.y, r.pad.top + PLAYER_R + 0.2);
  }
});
test('each upward hop is within hook range', () => {
  for (let k = 1; k < rings.length; k++) {
    const a = rings[k - 1]!.land,
      b = rings[k]!.at;
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= MOVE.hookRange);
  }
});
test('path starts at the body and ends at the landing with monotonic length', () => {
  const from = rings[0]!.land,
    p = buildPull(from, rings[1]!);
  assert.deepEqual(pathAt(p, 0), from);
  const end = pathAt(p, p.total);
  near(end.x, p.ring.land.x);
  near(end.y, p.ring.land.y);
  near(end.z, p.ring.land.z);
  p.lens.forEach((s, k) => assert.ok(!k || s >= p.lens[k - 1]!));
});
test('full pulls are capped and finish at rest within 0.05 m', () => {
  for (let k = 1; k < rings.length; k++) {
    const pos = { ...rings[k - 1]!.land },
      p = buildPull(pos, rings[k]!);
    let done = false;
    for (let i = 0; i < 1000 && !done; i++) {
      const step = stepPull(p, pos, MOVE);
      assert.ok(!step.stall);
      assert.ok(Math.hypot(step.v.x, step.v.y, step.v.z) <= 16 * 1.4 + 1e-9);
      pos.x += step.v.x / 60;
      pos.y += step.v.y / 60;
      pos.z += step.v.z / 60;
      done = step.done;
      if (done) assert.deepEqual(step.v, { x: 0, y: 0, z: 0 });
    }
    assert.ok(done);
    assert.ok(Math.hypot(pos.x - p.ring.land.x, pos.y - p.ring.land.y, pos.z - p.ring.land.z) < 0.05);
  }
});
test('a sustained obstruction stalls after 0.18 seconds', () => {
  const p = buildPull(rings[0]!.land, rings[1]!);
  const pos = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 10; i++) assert.equal(stepPull(p, pos, MOVE).stall, false);
  assert.equal(stepPull(p, pos, MOVE).stall, true);
});
test('cancel caps horizontal and upward speed without adding energy', () => {
  const v = cancelVelocity({ x: 30, y: 20, z: 40 }, MOVE);
  near(Math.hypot(v.x, v.z), 9.5);
  near(v.y, 3);
  assert.deepEqual(cancelVelocity({ x: 1, y: -12, z: 2 }, MOVE), { x: 1, y: -12, z: 2 });
});
test('a challenger needs twenty percent for 150 ms', () => {
  const pick = holdPick();
  assert.equal(pick('a', 1, 'b', 0.81, 0), 'a');
  assert.equal(pick('a', 1, 'b', 0.8, 10), 'a');
  assert.equal(pick('a', 1, 'b', 0.8, 159), 'a');
  assert.equal(pick('a', 1, 'b', 0.8, 160), 'b');
});
test('ownership survives disconnect and clears only after two ready missing seconds', () => {
  const latch = createHookLatch();
  assert.equal(latch(true, true, 0), true);
  assert.equal(latch(false, false, 10), true);
  assert.equal(latch(true, false, 1.9), true);
  assert.equal(latch(true, false, 0.1), false);
});
