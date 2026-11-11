import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPLIT_ROCK_BOXES,
  THROAT_SLAB,
  WORKS_BOULDERS,
  STALL_BOXES,
  STALL_SLAB,
  CLEFT,
  WORKS_WALK,
  ROLLER_ROAD,
  boxDistance,
  type WorksPoint,
} from '../src/entities/railway/works-shape.ts';
import { LINES, ORIGIN, TOWN } from '../src/place/layout.ts';
import { PATH_SAMPLES } from '../src/place/terrain.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
function samples(line: readonly WorksPoint[], step = 0.5) {
  const points: WorksPoint[] = [];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!,
      b = line[i]!,
      n = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / step);
    for (let j = 0; j <= n; j++) points.push({ x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n });
  }
  return points;
}
const boxes = [...SPLIT_ROCK_BOXES, ...THROAT_SLAB, ...WORKS_BOULDERS, ...STALL_BOXES, STALL_SLAB];
test('the walk-in route is open', () => {
  assert.ok(CLEFT.width >= 1.2);
  for (const p of samples(WORKS_WALK))
    for (const b of boxes)
      assert.ok(boxDistance(p, b) >= 0.4, `route ${JSON.stringify(p)} blocked by ${JSON.stringify(b)}`);
});
test('the throat is shut', () => {
  const slab = THROAT_SLAB[1]!;
  for (let s = -3.9; s <= 3.9; s += 0.1) {
    const p = { x: slab.x + s / Math.SQRT2, z: slab.z - s / Math.SQRT2 };
    assert.ok(THROAT_SLAB.some((b) => boxDistance(p, b) === 0));
  }
});
test('no box on a rail, path, plot or frame', () => {
  for (const line of Object.values(LINES))
    for (const p of samples(Array.from(line.xs, (x, i) => ({ x: x + ORIGIN.x, z: line.zs[i]! }))))
      for (const b of boxes) assert.ok(boxDistance(p, b) >= 3.5, `rail ${JSON.stringify(p)}: ${JSON.stringify(b)}`);
  for (const line of PATH_SAMPLES)
    for (const p of samples(line.map(([x, z]) => ({ x: x + ORIGIN.x, z }))))
      for (const b of boxes) assert.ok(boxDistance(p, b) >= 2, `path ${JSON.stringify(p)}: ${JSON.stringify(b)}`);
  const plots = [
    ...TOWN.start,
    ...TOWN.wood.flat(),
    ...TOWN.stone.flat(),
    ...TOWN.camps.flatMap((c) => [...c.asleep, ...c.awake]),
  ];
  const widths = { clock: 5, keep: 9, water: 3.6, stack: 2.4, derrick: 1 };
  for (const p of plots) {
    const w = p.w ?? widths[p.type as keyof typeof widths];
    assert.ok(w !== undefined);
    const d = p.d ?? w;
    // Full registered plot footprint, including its authored yaw and construction overhang.
    const pad = ['clock', 'keep', 'water', 'stack'].includes(p.type)
      ? 1
      : ['rock', 'block', 'derrick'].includes(p.type)
        ? 0.4
        : 0.8;
    for (const point of samples([
      { x: -w / 2 - pad, z: -d / 2 - pad },
      { x: w / 2 + pad, z: -d / 2 - pad },
      { x: w / 2 + pad, z: d / 2 + pad },
      { x: -w / 2 - pad, z: d / 2 + pad },
      { x: -w / 2 - pad, z: -d / 2 - pad },
    ])) {
      const c = Math.cos(p.yaw ?? 0),
        s = Math.sin(p.yaw ?? 0);
      const at = { x: ORIGIN.x + p.x + point.x * c + point.z * s, z: p.z - point.x * s + point.z * c };
      for (const b of boxes) assert.ok(boxDistance(at, b) >= 2, `plot ${p.type} ${p.x},${p.z}: ${JSON.stringify(b)}`);
    }
  }
  for (const p of LINE2_STATIONS)
    for (const b of boxes) assert.ok(boxDistance({ x: p.x / 100, z: p.z / 100 }, b) >= 6, `frame ${p.id}`);
});
test('the roller road clears the camp', () => {
  const camp = TOWN.camps[1]!;
  for (const p of [...camp.asleep, ...camp.awake]) {
    const w = p.w ?? (p.type === 'stack' ? 2.4 : 1),
      d = p.d ?? w;
    for (const at of samples(ROLLER_ROAD))
      assert.ok(
        boxDistance(at, { x: p.x + ORIGIN.x, z: p.z, y: 0, w: w + 2, d: d + 2, h: 1, yaw: p.yaw ?? 0 }) >= 2.5,
        `roller beside ${p.type} ${p.x},${p.z}`,
      );
  }
});
