import assert from 'node:assert/strict';
import { createIslandGround } from '../src/entities/ring-island/ground.ts';
import { RING_CONES } from '../src/proto/greybox/ring-cones.ts';
import { FAR, ORIGIN } from '../src/place/layout.ts';
import test from 'node:test';
import { ringAnchor, ringCounts, type RingGroup } from '../src/place/ring-wildlife-sites.ts';
import { RING_HANGOUT, ringAt } from '../src/sim/railway-ring-layout.ts';

test('every Ring wildlife anchor clears the town and its platform approach', () => {
  const pad = ringAt(RING_HANGOUT.u, RING_HANGOUT.lat);
  for (const group of Object.keys(ringCounts) as RingGroup[])
    for (let i = 0; i < ringCounts[group]; i++) {
      const p = ringAnchor(group, i);
      assert.ok(Math.hypot(p.x - pad.x / 100, p.z - pad.z / 100) > 40, group + i);
    }
});

test('the finished island fill leaves the shore roosts exposed and the schools submerged', () => {
  const ground = createIslandGround(RING_CONES, { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z });
  for (const group of ['flock', 'school'] as const)
    for (let i = 0; i < ringCounts[group]; i++) {
      const p = ringAnchor(group, i);
      assert.ok(ground.islandH(p.x, p.z) < p.y + (group === 'flock' ? 0.1 : -0.5), group + i);
    }
});
