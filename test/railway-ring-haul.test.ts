import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HAUL,
  haulAlong,
  haulEnd,
  haulPhase,
  haulSettled,
  haulTarget,
  haulTravel,
  haulU,
  type RailheadHaul,
} from '../src/sim/railway-ring-haul.ts';
import { RING_HEAD } from '../src/sim/railway-ring-layout.ts';

const first: RailheadHaul = Object.freeze({ set: 2, moved: 100, from: 12000 });

test('haul: at rest before any pair, and at the target once settled', () => {
  for (const set of [0, 1]) {
    const row = Object.freeze({ set, moved: -1, from: 0 });
    for (const tick of [0, 0.5, 10000]) {
      assert.equal(haulU(row, tick), 12000);
      assert.equal(haulEnd(row), -1);
      assert.equal(haulSettled(row, tick), true);
    }
  }
  for (let set = 2; set <= 26; set++) {
    const head = Math.min(7, Math.floor(set / 2));
    const row = Object.freeze({ set, moved: 100, from: RING_HEAD[head - 1]!.u });
    assert.equal(haulTarget(row), RING_HEAD[head]!.u);
    assert.equal(haulU(row, haulEnd(row)), RING_HEAD[head]!.u);
    assert.equal(haulU(row, haulEnd(row) + 1000), RING_HEAD[head]!.u);
    assert.equal(haulSettled(row, haulEnd(row) - 0.001), false);
    assert.equal(haulSettled(row, haulEnd(row)), true);
  }
});

test('haul: holds for 60 ticks, told for 10, then never faster than 50 cm a tick, eased at both ends', () => {
  assert.deepEqual(HAUL, { after: 60, ready: 10, speed: 50, ramp: 8, settle: 9 });
  for (const dt of [-10, 0, 59.999, 60, 69.999, 70]) assert.equal(haulU(first, 100 + dt), 12000);
  assert.equal(haulPhase(first, 159), -1);
  assert.equal(haulPhase(first, 160), 0);
  assert.equal(haulPhase(first, 170), 10);
  assert.equal(haulTravel(2000), 48);
  assert.equal(haulU(first, 171), 12003);
  assert.equal(haulU(first, 178), 12200);
  assert.equal(haulU(first, 194), 13000);
  assert.equal(haulU(first, 210), 13800);
  assert.equal(haulU(first, 217), 13996);
  assert.equal(haulU(first, 218), 14000);
  assert.equal(haulEnd(first), 227);
  assert.equal(haulSettled(first, 218), false, 'arrival still owes nine ticks of chocking');
  for (let tick = 171; tick <= 218; tick++) {
    const step = haulU(first, tick) - haulU(first, tick - 1);
    assert.ok(step >= 0 && step <= 50);
  }
});

test('haul: fractional view ticks interpolate canonical whole-tick poses', () => {
  assert.equal(haulU(first, 170.5), 12001.5);
  assert.equal(haulU(first, 171.5), 12007.5);
  assert.equal(haulU(first, 217.5), 13998);
  for (let tick = 100; tick <= 227; tick++) {
    const before = haulU(first, tick);
    const after = haulU(first, tick + 1);
    for (const fraction of [0.125, 0.25, 0.5, 0.75, 0.875]) {
      assert.equal(haulU(first, tick + fraction), before + (after - before) * fraction);
    }
    const across = haulU(first, tick + 1e-6) - haulU(first, tick - 1e-6);
    assert.ok(across >= 0 && across <= 0.0001 + 1e-9, 'continuous across each canonical tick');
  }
});

test('haul: continuous and never backwards over fractional ticks', () => {
  // Both profiles, the half-second floor, the 400 cm profile boundary and the longest replan.
  for (const dist of [0, 1, 166, 167, 200, 399, 400, 401, 2000, 14000]) {
    const row = Object.freeze({ set: 14, moved: 100, from: 26000 - dist });
    const end = haulEnd(row);
    let before = haulU(row, 99);
    for (let i = 1; i <= (end - 99 + 1) * 8; i++) {
      const now = haulU(row, 99 + i / 8);
      assert.ok(now >= before - 1e-9 && now <= 26000, `dist ${dist}, sample ${i}`);
      assert.ok(now - before <= 50 / 8 + 1e-9, 'fractional steps respect the speed cap');
      before = now;
    }
    assert.equal(before, 26000);
    // Probe both sides of every branch boundary; a sampled sweep alone can miss a jump there.
    const total = haulTravel(dist);
    for (const t of [0, 8, total - 8, total]) {
      const delta = haulAlong(dist, t + 1e-6) - haulAlong(dist, t - 1e-6);
      assert.ok(delta >= -1e-9 && delta <= 0.0001 + 1e-9, `continuous at ${t} for ${dist} cm`);
    }
  }
});

test('haul: learned late joins part-way; learned after the end is at rest and never pulled back', () => {
  const received = JSON.parse(JSON.stringify(first)) as RailheadHaul;
  assert.equal(haulU(received, 190), 12800, 'two seconds into travel when first read');
  assert.equal(haulSettled(received, 190), false);
  for (const tick of [250, 280, 1000]) {
    assert.equal(haulU(received, tick), 14000, 'no local arrival time or picture can restart it');
    assert.equal(haulSettled(received, tick), true);
  }
  assert.equal(haulU(received, 190), haulU(first, 190), 'evaluation order carries no hidden state');
});

test('haul: a short remainder and a 140 m replan both end exactly on the target', () => {
  for (const [dist, travel, end] of [
    [0, 5, 184],
    [1, 5, 184],
    [199, 5.97, 185],
    [200, 6, 185],
    [14000, 288, 467],
  ] as const) {
    const row = Object.freeze({ set: 14, moved: 100, from: 26000 - dist });
    assert.equal(haulTravel(dist), travel);
    assert.equal(haulAlong(dist, -1), 0);
    assert.equal(haulAlong(dist, 0), 0);
    assert.equal(haulAlong(dist, travel), dist);
    assert.equal(haulAlong(dist, travel + 1), dist);
    assert.equal(haulU(row, 170 + Math.ceil(travel)), 26000);
    assert.equal(haulEnd(row), end, 'round travel up before the nine whole chocking ticks');
    assert.equal(haulSettled(row, end - 0.001), false);
    assert.equal(haulSettled(row, end), true);
  }
});

test('haul: replan mid-haul restarts from the current place with no jump', () => {
  for (const tick of [160, 171, 178, 190, 217, 218, 227]) {
    const from = haulU(first, tick);
    const next = Object.freeze({ set: 4, moved: tick, from });
    assert.equal(haulU(next, tick), from);
    assert.equal(haulU(next, tick + 70), from, 'construction and telling restart from the current place');
    assert.ok(haulU(next, tick + 70.125) > from);
    assert.equal(haulU(next, haulEnd(next)), 16000);
  }
});

test('haul: integer-centimetre replan stamps preserve the pose exactly', () => {
  // The review's counterexample: step 2 must stamp the same canonical pose the view evaluates.
  const from = haulU(first, 171);
  const next = { set: 4, moved: 171, from: Math.floor(from) };
  assert.equal(haulU(next, 171), from);
  for (const dist of [0, 1, 166, 167, 199, 200, 399, 400, 401, 2000, 14000]) {
    const row = { set: 14, moved: 100, from: 26000 - dist };
    for (let tick = 100; tick <= haulEnd(row); tick++) {
      const current = haulU(row, tick);
      assert.ok(Number.isInteger(current));
      const replanned = haulU({ set: 14, moved: tick, from: Math.floor(current) }, tick);
      assert.equal(replanned, current, `exact replan at tick ${tick}, distance ${dist}`);
    }
  }
});
