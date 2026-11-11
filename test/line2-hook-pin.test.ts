// The server judges a hook pull at LINE2_HOOK (src/sim, centimetres in world space); the client draws the device at
// tech-layout's DEVICES.hook (metres, place space). Moving p2 must move both (generic-lines step 2's review), so they
// are tied here: the sim pin is the drawn device plus the place's ORIGIN, to the centimetre.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEVICES } from '../src/place/tech-layout.ts';
import { ORIGIN } from '../src/place/layout.ts';
import { LINE2_HOOK } from '../src/sim/railway-line2-layout.ts';

test('LINE2_HOOK is the drawn hook device plus ORIGIN, in centimetres', () => {
  const d = DEVICES.hook;
  const want = { x: (d.x + ORIGIN.x) * 100, z: (d.z + ORIGIN.z) * 100, y: d.y * 100 };
  for (const k of ['x', 'z', 'y'] as const)
    assert.ok(
      Math.abs(LINE2_HOOK[k] - want[k]) <= 1,
      `LINE2_HOOK.${k} ${LINE2_HOOK[k]} cm, but the device is drawn at ${want[k].toFixed(1)} cm: move both`,
    );
});
