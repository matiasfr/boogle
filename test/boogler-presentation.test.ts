import test from 'node:test';
import assert from 'node:assert/strict';
import { createBooglerPresentation } from '../src/boogler/presentation.ts';
import { booglerPose, createBooglerShadow, type BooglerLeg } from '../src/world/boogler-shadow.ts';
import { loadBooglerLand } from '../server/src/host/land.ts';
import { mulberry32 } from '../src/math.ts';

// Ported from the step 6 independent review: the rider wins, so no talk acknowledgement ever arrives.
test('talk prediction reconciles when a friend is already riding', () => {
  const b = createBooglerShadow(loadBooglerLand(), mulberry32(123), 0);
  for (let t = 1; t <= 40; t++) b.step(t, []);
  const p = createBooglerPresentation();
  p.update(b.leg(), 40, 0, true);
  const initial = { ...p.pose };
  p.talk(true);
  const talker = { pid: 'alice', x: initial.x + 2, z: initial.z, act: 1, wary: false };
  for (let t = 41; t <= 60; t++) {
    const s = b.snapshot();
    b.step(t, [talker, { pid: 'bob', x: s.x, z: s.z, act: 2, wary: false }]);
    p.update(b.leg(), t, 0.1, false, talker);
  }
  const actual = booglerPose(b.leg(), 60);
  const gap = Math.hypot(p.pose.x - actual.x, p.pose.z - actual.z);
  assert.ok(gap < 0.1, `held local talk must reconcile to server movement; gap ${gap} m`);
});

const walk: BooglerLeg = { x0: 0, z0: 0, yaw0: 0, x1: 0, z1: -30, start: 0, speed: 1.5, mode: 0 };
test('local talk holds this frame, turns locally and eases to an attending server leg', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  const start = { ...p.pose };
  p.talk(true);
  assert.equal(p.pose.walking, false);
  for (let i = 1; i <= 12; i++) p.update(walk, 20 + i / 6, 1 / 60, false, { x: 3, z: -3 });
  assert.equal(p.pose.x, start.x);
  assert.equal(p.pose.z, start.z);
  assert.notEqual(p.pose.yaw, start.yaw);
  const stop = { ...walk, z0: -3.3, x1: 0, z1: -3.3, start: 22, speed: 0, look: 'me' };
  p.update(stop, 24, 1 / 60, false, { x: 3, z: -3 });
  assert.ok(Math.abs(p.pose.z - start.z) < 0.1);
  for (let i = 0; i < 120; i++) p.update(stop, 24 + i / 6, 1 / 60, false, { x: 3, z: -3 });
  assert.ok(Math.abs(p.pose.z + 3.3) < 0.001);
});

test('two simultaneous talkers both yield to the server choice, including the losing talker', () => {
  const b = createBooglerShadow(loadBooglerLand(), mulberry32(123), 0);
  for (let t = 1; t <= 40; t++) b.step(t, []);
  const s = b.snapshot();
  const alice = { pid: 'alice', x: s.x + 2, z: s.z, act: 1, wary: false };
  const bob = { pid: 'bob', x: s.x + 1, z: s.z, act: 1, wary: false };
  const views = [createBooglerPresentation(), createBooglerPresentation()];
  // Different presentation clocks mean both held poses need correction when the server stops him.
  for (const [i, p] of views.entries()) {
    p.update(b.leg(), 42 + i, 0, true);
    p.talk(true);
  }
  b.step(41, [alice, bob]);
  const stop = b.leg();
  assert.equal(stop.look, 'bob');
  assert.equal(stop.speed, 0);
  for (const p of views) {
    const before = { ...p.pose };
    p.update(stop, 43, 0, false, bob);
    assert.equal(p.pose.x, before.x, 'changed leg starts at the held pose');
    assert.equal(p.pose.z, before.z);
    p.update(stop, 43, 1 / 60, false, bob);
    assert.notEqual(p.pose.z, before.z, 'even the losing talker releases on the first changed leg');
    for (let j = 0; j < 60; j++) p.update(stop, 43 + j / 6, 1 / 60, false, bob);
    assert.ok(Math.hypot(p.pose.x - stop.x0, p.pose.z - stop.z0) < 0.001);
  }
});

test('talk at a rider launch yields to the next authoritative moving leg without snapping', () => {
  const p = createBooglerPresentation();
  const ridden = { ...walk, speed: 2.3, mode: 2 };
  p.update(ridden, 20, 0, true);
  p.talk(true);
  const held = { ...p.pose };
  // The launch clears riding and makes the player wary; this is movement, not a talk acknowledgement.
  const fleeing = { ...walk, z0: held.z - 0.2, start: 21, speed: 3.4, mode: 1 };
  p.update(fleeing, 21, 0, false, { x: 0, z: 12 });
  assert.equal(p.pose.z, held.z);
  assert.equal(p.pose.walking, true, 'superseding movement releases the hold immediately');
  for (let i = 1; i <= 120; i++) {
    const z = p.pose.z;
    p.update(fleeing, 21 + i / 6, 1 / 60);
    assert.ok(Math.abs(p.pose.z - z) <= (3.4 * 1.2) / 60 + 1e-9);
  }
  assert.ok(Math.abs(p.pose.z - booglerPose(fleeing, 41).z) < 0.001);
});

test('a talker walking away with no acknowledging leg releases within 300 ms', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  p.talk(true);
  const held = { ...p.pose };
  const away = { x: 40, z: 40 };
  for (let i = 1; i <= 17; i++) {
    p.talk(true); // Rendering another answer must not extend the prediction.
    p.update(walk, 20 + i / 6, 1 / 60, false, away);
  }
  assert.equal(p.pose.z, held.z);
  p.update(walk, 23, 1 / 60, false, away);
  assert.equal(p.pose.walking, true);
  assert.ok(Math.abs(p.pose.z - held.z) < 0.15, 'timeout eases rather than snapping');
  for (let i = 19; i <= 120; i++) p.update(walk, 20 + i / 6, 1 / 60, false, away);
  assert.ok(Math.abs(p.pose.z - booglerPose(walk, 40).z) < 0.001);
});

test('a mid-walk rider leg preserves the shown pose, then converges; refill places immediately', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  const before = { ...p.pose };
  const ridden = { ...walk, z0: -3.15, start: 21, speed: 2.3, mode: 2 };
  p.update(ridden, 22, 0);
  assert.equal(p.pose.z, before.z);
  for (let i = 1; i <= 120; i++) {
    const prev = p.pose.z;
    p.update(ridden, 22 + i / 6, 1 / 60);
    assert.ok(Math.abs(p.pose.z - prev) < 0.15, 'no snap underneath rider');
  }
  assert.ok(Math.abs(p.pose.z - booglerPose(ridden, 42).z) < 0.001);
  p.update(walk, 80, 0, true);
  assert.equal(p.pose.z, booglerPose(walk, 80).z);
});

const frame = 1 / 60;
const stepBound = 3 * frame; // calm/ridden catch-up: at most twice the ordinary 1.5 m/s walk speed
function boundedStep(p: ReturnType<typeof createBooglerPresentation>, run: () => void, bound = stepBound) {
  const before = { ...p.pose };
  run();
  const distance = Math.hypot(p.pose.x - before.x, p.pose.z - before.z);
  assert.ok(distance <= bound + 1e-9, `one frame moved ${distance} m; bound ${bound} m`);
  return distance;
}

test('a session outage freezes the shown pose; a distant restart leg catches up within the frame bound', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  const before = { ...p.pose };
  for (let i = 1; i <= 300; i++) p.update(walk, 20 + i / 6, frame, false, undefined, false);
  assert.equal(p.pose.z, before.z, 'do not extrapolate while the session is not live');
  assert.equal(p.pose.walking, false);
  const restored = { ...walk, z0: 10, z1: 10, speed: 0, start: 0 };
  for (let i = 0; i < 600; i++) {
    const moved = boundedStep(p, () => p.update(restored, i / 6, frame, false, undefined, true), (13 / 2.5) * frame);
    if (moved > 0.001) assert.equal(p.pose.walking, true, 'catch-up must not slide with idle feet');
  }
  assert.ok(Math.abs(p.pose.z - 10) < 0.001);
  assert.equal(p.pose.walking, false);
});

test('a clock re-anchor before the replacement leg cannot cut, and converges to the live pose', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  boundedStep(p, () => p.update(walk, 60, frame)); // clock changes first, same immutable leg
  const refill = { ...walk };
  for (let i = 1; i <= 360; i++) boundedStep(p, () => p.update(refill, 60 + i / 6, frame), 4 * frame);
  assert.ok(Math.abs(p.pose.z - booglerPose(refill, 120).z) < 0.001);
});

test('a long frame while visible stays continuous instead of assuming the page was hidden', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  boundedStep(p, () => p.update(walk, 90, 7));
});

test('ridden talk hold release starts gently and every correction stays within the frame bound', () => {
  const p = createBooglerPresentation();
  const ridden = { ...walk, speed: 2.3, mode: 2 };
  p.update(ridden, 20, 0, true);
  p.talk(true);
  for (let i = 1; i <= 17; i++) p.update(ridden, 20 + i / 6, frame);
  const first = boundedStep(p, () => p.update(ridden, 23, frame));
  assert.ok(first < 0.01, `first release step ${first} m must ease out of rest`);
  for (let i = 19; i <= 240; i++) boundedStep(p, () => p.update(ridden, 20 + i / 6, frame));
  assert.ok(Math.abs(p.pose.z - booglerPose(ridden, 60).z) < 0.001);
});

for (const speed of [1.5, 2.3, 3.4])
  test(`a visible stall at ${speed} m/s uses raw time despite the game's 50 ms delta clamp`, () => {
    const p = createBooglerPresentation();
    const moving = { ...walk, speed };
    p.update(moving, 20, 0, true, undefined, true, 1000);
    const before = { ...p.pose };
    p.update(moving, 90, 0.05, false, undefined, true, 8000);
    const distance = Math.hypot(p.pose.x - before.x, p.pose.z - before.z);
    const bound = Math.max(3, speed * 1.2) / 60;
    assert.ok(distance <= bound + 1e-9, `hidden return moved ${distance} m; bound ${bound} m`);
  });

test('a seven-second hidden interval places the first visible frame exactly on authority with no catch-up', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true, undefined, true, 1000);
  p.talk(true);
  p.visibility(true, 1000);
  p.visibility(false, 8000);
  p.update(walk, 90, 0.05, false, undefined, true, 8000);
  assert.deepEqual(p.pose, { ...booglerPose(walk, 90), mode: walk.mode });
  p.update(walk, 90 + 1 / 6, frame, false, undefined, true, 8000 + 1000 / 60);
  assert.equal(p.pose.z, booglerPose(walk, 90 + 1 / 6).z, 'no trailing correction on the next frame');
  boundedStep(p, () => p.update(walk, 130, frame), 3.9 * frame);
});

test('a brief hidden interval does not grant a later visible clock jump permission to cut', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  p.visibility(true, 1000);
  p.visibility(false, 1400);
  boundedStep(p, () => p.update(walk, 60, frame));
});

test('a visible reconnect six metres behind a walking leg catches up within three seconds at at most 3.9 m/s', () => {
  const p = createBooglerPresentation();
  p.update(walk, 20, 0, true);
  p.update(walk, 60, frame, false, undefined, false);
  const held = p.pose.z;
  p.update(walk, 60, 0); // six-metre gap; arm catch-up without a rendered step
  assert.equal(p.pose.z, held);
  let caughtAt = 0,
    maxStep = 0;
  for (let i = 1; i <= 180; i++) {
    maxStep = Math.max(
      maxStep,
      boundedStep(p, () => p.update(walk, 60 + i / 6, frame), 3.9 * frame),
    );
    if (!caughtAt && Math.abs(p.pose.z - booglerPose(walk, 60 + i / 6).z) < 1e-6) caughtAt = i * frame;
  }
  assert.ok(caughtAt > 0 && caughtAt <= 3, `catch-up took ${caughtAt || '>3'} seconds`);
  assert.ok(maxStep > stepBound, 'a long visible correction raises the ordinary catch-up cap');
});

for (const gap of [6, 60])
  test(`flee replans preserve catch-up across a ${gap}-metre correction`, () => {
    const p = createBooglerPresentation();
    let leg = { ...walk, z1: -200, speed: 3.4, mode: 1 };
    p.update(leg, 0, 0, true);
    p.update(leg, 0, frame, false, undefined, false);
    leg = { ...leg, z0: -gap };
    p.update(leg, 0, 0);
    let caughtAt = 0;
    for (let i = 1; i <= 186; i++) {
      const tick = i / 6;
      if (i % 48 === 0) leg = { ...leg, z0: booglerPose(leg, tick).z, start: tick };
      boundedStep(p, () => p.update(leg, tick, frame), (3.4 + gap / 2.5) * frame);
      if (!caughtAt && Math.abs(p.pose.z - booglerPose(leg, tick).z) < 1e-6) caughtAt = i * frame;
    }
    assert.ok(caughtAt > 0, 'continuous flee replans must not stretch catch-up beyond about three seconds');
  });
