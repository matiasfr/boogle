import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GRID, PATHS } from '../src/place/layout.ts';
import { FIELD_H, FIELD_REACH, FIELD_W, TREAD_HALF, bakePathField, pathAt } from '../src/place/path-field.ts';

test('a path is its tread wide, with its own height and grade', () => {
  const [a, b] = [PATHS[0]!.pts[0]!, PATHS[0]!.pts[1]!];
  const mx = (a[0] + b[0]) / 2,
    mz = (a[1] + b[1]) / 2;
  assert.ok(Math.abs(pathAt(mx, mz).edge + TREAD_HALF.bold) < 1e-9, 'the centre line is half a tread inside the edge');
  // The Round's mouth turns this stretch: cross it along its perpendicular, not the old world-x direction.
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]),
    nx = (a[1] - b[1]) / length,
    nz = (b[0] - a[0]) / length;
  const side = pathAt(mx + nx * (TREAD_HALF.bold + 1), mz + nz * (TREAD_HALF.bold + 1));
  assert.ok(Math.abs(side.edge - 1) < 1e-9);
  assert.ok(
    Math.abs(side.dx - nx) < 1e-9 && Math.abs(side.dz - nz) < 1e-9,
    'the direction points away from the centre line',
  );
  // The canyon climb up the gorge's east wall: 10.3 m over 38 m.
  const [c, d] = [PATHS[0]!.pts[9]!, PATHS[0]!.pts[10]!];
  const climb = pathAt((c[0] + d[0]) / 2, (c[1] + d[1]) / 2);
  assert.ok(Math.abs(climb.grade - (d[2] - c[2]) / Math.hypot(d[0] - c[0], d[1] - c[1])) < 1e-9);
  assert.ok(Math.abs(climb.height - (c[2] + d[2]) / 2) < 1e-9);
});

test('a footbridge span is not path on the ground', () => {
  for (const p of PATHS) {
    const a = p.pts[p.bridgeAt]!,
      b = p.pts[p.bridgeAt + 1]!;
    assert.ok(pathAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2).edge > 1, 'mid-span is off every tread');
  }
});

test('the baked field matches the function near a path and is far elsewhere', () => {
  const data = bakePathField();
  assert.equal(data.length, FIELD_W * FIELD_H * 4);
  const texel = (x: number, z: number) => (Math.round(x - GRID.x0) + Math.round(z - GRID.z0) * FIELD_W) * 4;
  const a = PATHS[1]!.pts[1]!;
  const k = texel(a[0], a[1]);
  assert.ok(Math.abs(data[k]! - pathAt(Math.round(a[0]), Math.round(a[1])).edge) < 1e-6);
  assert.equal(data[texel(GRID.x1 - 10, GRID.z1 - 10)], FIELD_REACH);
});
