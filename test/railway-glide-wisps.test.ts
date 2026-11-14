// The glider's wingtip threads of air (owner, 14 November 2026: "it gives you a sense of speed"). They were lost once
// without a failing check, when Place's view was ported to the railway; this holds the numbers and the wiring.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WISP, createGlideWisps } from '../src/entities/railway/glide-wisps.ts';

const P = { x: 10, y: 50, z: -4 };
test('a held glide at speed sheds a wisp off each wingtip, 50 pairs a second', () => {
  const step = createGlideWisps();
  const at: [number, number, number][] = [];
  let n = 0;
  // Heading -x (yaw pi/2), as the summit look flies: the wing spans z.
  for (let k = 0; k < 60; k++) n += step(1 / 60, true, P, Math.PI / 2, 10, (x, y, z) => at.push([x, y, z]));
  assert.equal(n, at.length);
  assert.ok(Math.abs(at.length - 2 * WISP.rate) <= 2, `about 100 wisps in a second: ${at.length}`);
  const left = at.filter(([, , z]) => z < P.z),
    right = at.filter(([, , z]) => z > P.z);
  assert.equal(left.length, right.length, 'both tips');
  for (const [x, y, z] of at) {
    assert.ok(Math.abs(x - P.x) < 1e-9, 'across the heading, not along it');
    assert.ok(Math.abs(Math.abs(z - P.z) - WISP.span) < 1e-9, 'at the tips');
    assert.equal(y, P.y + WISP.up);
  }
});
test('no wisps when the canopy is not holding you; fewer when slow, none at rest', () => {
  const none = () => assert.fail('a wisp with no glide');
  const idle = createGlideWisps();
  for (let k = 0; k < 60; k++) assert.equal(idle(1 / 60, false, P, 0, 10, none), 0);
  const still = createGlideWisps();
  for (let k = 0; k < 60; k++) assert.equal(still(1 / 60, true, P, 0, 0, none), 0);
  const slow = createGlideWisps();
  let n = 0;
  for (let k = 0; k < 60; k++) n += slow(1 / 60, true, P, 0, 4, () => {});
  assert.ok(Math.abs(n - WISP.rate) <= 2, `half speed, half the wisps: ${n}`);
});
test("the glider's view emits them (the port from Place dropped the call once)", () => {
  const view = readFileSync(new URL('../src/entities/railway/glide-view.ts', import.meta.url), 'utf8');
  assert.match(view, /createGlideWisps\(\)/);
  assert.match(view, /emit\(\{/);
});
