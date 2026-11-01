import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  damp,
  dampK,
  halfLifeOf,
  springStep,
  stiffnessOf,
  dampingOf,
  ring,
  outQuad,
  outCubic,
  inOutSine,
  outBack,
  outElastic,
  arc,
  type Spring,
} from '../src/render/motion.ts';

const near = (a: number, b: number, eps: number, msg?: string) =>
  assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} vs ${b} (±${eps})`);

// A fine-step RK4 of the same spring, the reference the closed form must match.
function rk4(s: Spring, goal: number, k: number, d: number, T: number, h = 1e-4): Spring {
  const f = (x: number, v: number) => -k * (x - goal) - d * v;
  let { x, v } = s;
  for (let t = 0; t < T - 1e-12; t += h) {
    const k1x = v,
      k1v = f(x, v);
    const k2x = v + (h / 2) * k1v,
      k2v = f(x + (h / 2) * k1x, v + (h / 2) * k1v);
    const k3x = v + (h / 2) * k2v,
      k3v = f(x + (h / 2) * k2x, v + (h / 2) * k2v);
    const k4x = v + h * k3v,
      k4v = f(x + h * k3x, v + h * k3v);
    x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  }
  return { x, v };
}

test('the spring matches a fine integration: under-, critically and over-damped', () => {
  const k = 260;
  for (const d of [14, 2 * Math.sqrt(k), 60]) {
    const exact = springStep({ x: 0.3, v: -4 }, 0.1, k, d, 0.37);
    const ref = rk4({ x: 0.3, v: -4 }, 0.1, k, d, 0.37);
    near(exact.x, ref.x, 1e-6, `x, damping ${d}`);
    near(exact.v, ref.v, 1e-5, `v, damping ${d}`);
  }
});

test('the spring lands in the same place at 20 fps as at 120 fps', () => {
  const k = 260,
    d = 14;
  const a = { x: 0, v: 5 },
    b = { x: 0, v: 5 };
  for (let n = 0; n < 20; n++) springStep(a, 0, k, d, 1 / 20);
  for (let n = 0; n < 120; n++) springStep(b, 0, k, d, 1 / 120);
  near(a.x, b.x, 1e-9);
  near(a.v, b.v, 1e-9);
});

test('a stiff spring stays stable at a long frame and settles on its goal', () => {
  const s = { x: 1, v: 0 };
  for (let n = 0; n < 40; n++) springStep(s, 0, 4000, 10, 0.05);
  assert.ok(Math.abs(s.x) < 1e-3 && Number.isFinite(s.v));
});

test('frequency and damping ratio convert to stiffness and damping', () => {
  near(Math.sqrt(stiffnessOf(2)) / (2 * Math.PI), 2, 1e-12);
  near(dampingOf(2, 1) / (2 * Math.sqrt(stiffnessOf(2))), 1, 1e-12);
});

test('the damper halves the gap every half-life, whatever the step', () => {
  near(damp(0, 1, 0.2, 0.2), 0.5, 1e-12);
  let x = 0;
  for (let n = 0; n < 10; n++) x = damp(x, 1, 0.2, 0.02);
  near(x, 0.5, 1e-12);
  near(dampK(halfLifeOf(20), 0.016), 1 - Math.exp(-0.016 * 20), 1e-12);
});

test('ring starts at rest, swings positive first and dies away', () => {
  assert.equal(ring(0, 3, 0.3), 0);
  assert.ok(ring(0.05, 3, 0.3) > 0);
  assert.ok(Math.abs(ring(3, 3, 0.3)) < 1e-3);
});

test('the easing curves run 0 to 1 and clamp', () => {
  for (const f of [outQuad, outCubic, inOutSine, outBack, outElastic]) {
    near(f(0), 0, 1e-12);
    near(f(1), 1, 1e-12);
    near(f(-1), 0, 1e-12);
    near(f(2), 1, 1e-12);
  }
  assert.ok(Math.max(...[0.6, 0.7, 0.8, 0.9].map((t) => outBack(t))) > 1.05, 'outBack overshoots');
  assert.deepEqual([arc(0), arc(0.5), arc(1), arc(2)], [0, 1, 0, 0]);
});
