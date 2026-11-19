// The loader yard's solids are authored literals in its prefab; they must stay the boxes its recipe draws.
import test from 'node:test';
import assert from 'node:assert/strict';
import { prefabs } from '../src/content/prefabs/loader-yard.ts';
import { yardHulls, YARD } from '../src/place/yard-shape.ts';
import { yardPlan } from '../src/place/building-plans.ts';

test('the yard hull record matches the shape table, box for box', () => {
  const record = prefabs.find((p) => p.key === 'town.plot-yard-hull')!;
  const hulls = yardHulls();
  assert.equal(record.colliders.length, hulls.length);
  record.colliders.forEach((c, i) => {
    assert.equal(c.shape, 'box');
    if (c.shape !== 'box') return;
    const h = hulls[i]!;
    [...c.at, ...c.half].forEach((v, k) =>
      assert.ok(Math.abs(v - [h.dx, h.dy, h.dz, h.hx, h.hy, h.hz][k]!) < 1e-9, `${i}.${k}`),
    );
  });
});

test('the yard is a works building: no door, windows or chimney, inside a house plot, open at the front', () => {
  const plan = yardPlan({ x: 0, z: 0, yaw: 0 }, 0);
  assert.equal(plan.smoke, null);
  assert.equal(plan.hulls.length, yardHulls().length);
  // Every piece stays inside the 7.4 m plot, so the town's spacing is unchanged.
  for (const b of plan.pieces)
    assert.ok(Math.abs(b.x) <= YARD.w / 2 + YARD.shed.eave + 0.2 && Math.abs(b.z) <= YARD.d / 2 + 0.5);
  // Only the shed's back is boarded: no wall stands on its front line.
  const walls = plan.pieces.slice(plan.FRAME, plan.WALLS);
  assert.ok(walls.length > 0 && walls.every((b) => Math.abs(b.z - YARD.shed.z0) < 1e-9));
});
