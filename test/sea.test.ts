// The sea's CPU halves (docs/plans/water-sunshine.md, steps 2 and 3): the swell the vertices and swimming share, and the
// coast texture's bed, drawn shelf and waterline normal. The swell's shader twin is judged in stills.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEA } from '../src/constants.ts';
import { swellAt, swellPhases, SWELL, SWELL_MAX, FADE } from '../src/render/water/swell.ts';
import { registerShoreProvider } from '../src/render/water/shore-providers.ts';
import { createCoast, SHELF } from '../src/render/water/coast.ts';

test('the swell averages to SEA, stays inside its budget and is still at the waterline', () => {
  let sum = 0,
    n = 0,
    top = -Infinity,
    bottom = Infinity;
  for (let x = -400; x <= 400; x += 3.7)
    for (let z = -400; z <= 400; z += 4.3) {
      const h = swellAt(x, z, 12.5, 30).height;
      sum += h;
      n++;
      top = Math.max(top, h);
      bottom = Math.min(bottom, h);
    }
  assert.ok(Math.abs(sum / n - SEA) < 0.01, `mean ${sum / n}`);
  assert.ok(top <= SEA + SWELL_MAX + 1e-9 && bottom >= SEA - SWELL_MAX - 1e-9);
  assert.ok(top - bottom > SWELL_MAX, 'the swell moves');
  assert.equal(swellAt(10, 10, 3, FADE.shallow).height, SEA);
  assert.equal(swellAt(10, 10, 3, 0).rate, 0);
});

test('the wrapped phases give the same heights as the unwrapped clock, late in a session', () => {
  const t = 7200.25;
  const phases = swellPhases(t);
  for (const [x, z] of [
    [1400, -345],
    [800, 60],
    [-12, 3],
  ] as const) {
    let wrapped = 0;
    SWELL.forEach((w, i) => (wrapped += w.amp * Math.sin(w.kx * x + w.kz * z - phases[i]!)));
    assert.ok(Math.abs(SEA + wrapped - swellAt(x, z, t, 50).height) < 1e-6);
  }
});

test('the rate is the time derivative of the height', () => {
  const dt = 1e-4;
  const a = swellAt(33, -71, 5, 20),
    b = swellAt(33, -71, 5 + dt, 20);
  assert.ok(Math.abs((b.height - a.height) / dt - a.rate) < 1e-3);
});

test('the coast texture: depth falls off a slope and the waterline normal points to sea', () => {
  // A beach rising toward +x: bed = (x - 50) / 10, so the waterline sits at x = 50 and the sea lies at smaller x.
  const remove = registerShoreProvider({
    id: 'test-slope',
    bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 },
    seaLevel: SEA,
    revision: 1,
    extent: 128,
    bedAt: (x) => ({ valid: true, height: (x - 50) / 10 }),
  });
  const coast = createCoast();
  try {
    let last = Infinity;
    for (let x = 60; x >= 5; x -= 5) {
      const { bed } = coast.sampleAt(x, 50);
      assert.ok(bed < last, `bed falls toward the sea at x=${x}`);
      last = bed;
    }
    assert.ok(Math.abs(coast.sampleAt(40, 50).bed - -1) < 0.05);
    const { normal } = coast.sampleAt(45, 50);
    assert.ok(normal[0] < -0.9, `outward normal ${normal}`);
    assert.ok(coast.inspect().coast.cell >= 1);
  } finally {
    remove();
    coast.dispose();
  }
});

test('the drawn shelf replaces a flat floor and its square edge, and leaves the real bed alone', () => {
  // A round island on a grid with a flat floor 5 m down, as Place's: waterline at r = 15, the floor from r = 40.
  const floor = (x: number, z: number) => Math.max(-5, 3 - Math.hypot(x - 50, z - 50) / 5);
  const remove = registerShoreProvider({
    id: 'test-floor',
    bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 },
    seaLevel: SEA,
    revision: 1,
    extent: 128,
    bedAt: (x, z) => ({ valid: true, height: floor(x, z) }),
  });
  const coast = createCoast();
  try {
    assert.ok(Math.abs(coast.sampleAt(95, 50).bed - -5) < 0.05, 'swimming still reads the floor');
    assert.ok(Math.abs(coast.sampleAt(72, 50).shade - floor(72, 50)) < 0.05, 'the shallows are the terrain');
    let last = Infinity;
    for (let x = 90; x <= 200; x += 2) {
      const { shade } = coast.sampleAt(x, 50);
      assert.ok(shade < last, `the shelf keeps falling at x=${x}`);
      assert.ok(last === Infinity || last - shade < 1, `no step at x=${x}`);
      last = shade;
    }
    assert.ok(last > SEA - SHELF.shaped - SHELF.open, 'it eases toward open sea');
    // Round, not square: at the same distance from the island the shelf is as deep along an axis and a diagonal.
    const axis = coast.sampleAt(50 + 80, 50).shade,
      diagonal = coast.sampleAt(50 + 80 / Math.SQRT2, 50 + 80 / Math.SQRT2).shade;
    assert.ok(Math.abs(axis - diagonal) < 0.5, `axis ${axis} diagonal ${diagonal}`);
  } finally {
    remove();
    coast.dispose();
  }
});
