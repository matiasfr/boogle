// J1 departures: the existing table needs an on-rail exception; LINE2_BOILER is not merged yet.
// Only horizontal relocations (local metres): pier rack (402.4,-362) -> (398.94,-361.77),
// 3.467636 m; pier frame (402.1,-371) -> (405.54,-371.07), 3.440712 m.
// These are the nearest centimetre-grid candidates clearing the polyline rail by 3.5 m.
// H is not uniformly 24 m: cleft 21.48 m, rocks 24.62/24.68 m. No land x/z candidate moved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LINES,
  ORIGIN,
  TOWN,
  FORGE,
  RACK,
  SHELF,
  CRANE,
  DOCK,
  SPAWN,
  TURNTABLE,
  lineAt,
  railY,
} from '../src/proto/place/layout.ts';
import { H, PATH_SAMPLES } from '../src/proto/place/terrain.ts';
import { distToLine, parseMapPage, type XZ } from '../src/proto/greybox/map-data.ts';
import { LINE2_LEVER, LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { LINE1_ROCKS } from '../src/sim/railway-line-layout.ts';
import {
  WORKS,
  WORKS_SEAMS,
  WORKS_BREAKER,
  WORKS_CLEFT,
  WORKS_KILN,
  WORKS_RACK,
  WORKS_ROCKS,
  SHED_STALL,
  SHED_TABLE,
  SHED_ROAD,
  WAGON_S,
  PIER_STOP_CM,
  PIER_STOP,
  PIER_RACK,
  PIER_FRAME,
  CROSSING_BENTS,
  CROSSING_FOOT_OFF,
  RAIL_ROCKS,
} from '../src/sim/railway-works-layout.ts';

type Point = { x: number; z: number };
const local = (p: Point): XZ => [p.x / 100 - ORIGIN.x, p.z / 100 - ORIGIN.z];
const land = [WORKS_BREAKER, WORKS_CLEFT, WORKS_KILN, WORKS_RACK, ...WORKS_ROCKS, ...WORKS_SEAMS, SHED_STALL];
const points = [...land, SHED_TABLE, PIER_STOP, PIER_RACK, PIER_FRAME, ...CROSSING_BENTS];
const rails = Object.values(LINES).map((l) => Array.from(l.xs, (x, i): XZ => [x, l.zs[i]!]));
const plots = [
  ...TOWN.start,
  ...TOWN.wood.flat(),
  ...TOWN.stone.flat(),
  ...TOWN.camps.flatMap((c) => [...c.asleep, ...c.awake]),
];
// The plot dimensions in layout, including the square tower/block defaults from opening-plans.ts.
const widths = { clock: 5, keep: 9, water: 3.6, stack: 2.4, derrick: 1 };
function boxDistance(p: XZ, box: { x: number; z: number; w: number; d: number; yaw?: number }) {
  const dx = p[0] - box.x,
    dz = p[1] - box.z,
    c = Math.cos(box.yaw ?? 0),
    s = Math.sin(box.yaw ?? 0);
  return Math.hypot(
    Math.max(0, Math.abs(dx * c - dz * s) - box.w / 2),
    Math.max(0, Math.abs(dx * s + dz * c) - box.d / 2),
  );
}
const railPoint = (s: number) => lineAt(LINES.east, s, { x: 0, z: 0, ux: 0, uz: 0 });
const map = parseMapPage(readFileSync(new URL('../docs/world/map-prototypes.html', import.meta.url), 'utf8'));
const ring = map.common.lines.find((l) => l.id === 'ringx')!.pts;
function ringAt(s: number): XZ {
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1]!,
      b = ring[i]!,
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s <= length) return [a[0] + ((b[0] - a[0]) * s) / length, a[1] + ((b[1] - a[1]) * s) / length];
    s -= length;
  }
  throw new Error('past ringx');
}

test('every Works point stands on its ground', () => {
  for (const p of land) assert.ok(Math.abs(p.y - H(p.x / 100, p.z / 100) * 100) <= 50, JSON.stringify(p));
  for (const p of [SHED_TABLE, PIER_STOP, PIER_RACK, PIER_FRAME])
    assert.ok(Math.abs(p.y - railY(LINES.east, p === SHED_TABLE ? 0 : PIER_STOP_CM / 100) * 100) <= 5);
  for (const p of CROSSING_BENTS) assert.ok(H(p.x / 100, p.z / 100) <= 0);
});

test('clear of what is already there', () => {
  for (const p of points) {
    const at = local(p),
      label = JSON.stringify(p);
    for (const plot of plots) {
      const w = plot.w ?? widths[plot.type as keyof typeof widths];
      assert.ok(w !== undefined, `missing footprint: ${plot.type}`);
      // Match the full registered footprint (housePlan +0.8 m, towerPlan +1 m, blockPlan +0.4 m per side).
      const pad = ['clock', 'keep', 'water', 'stack'].includes(plot.type)
        ? 1
        : ['rock', 'block', 'derrick'].includes(plot.type)
          ? 0.4
          : 0.8;
      assert.ok(
        boxDistance(at, { ...plot, w: w + 2 * pad, d: (plot.d ?? w) + 2 * pad }) >= 2,
        `${label}: ${plot.type} at ${plot.x},${plot.z}`,
      );
    }
    assert.ok(boxDistance(at, FORGE) >= 2, `${label}: forge`);
    for (const prop of [RACK, SHELF, CRANE, DOCK])
      assert.ok(Math.hypot(at[0] - prop.x, at[1] - prop.z) >= 2, `${label}: yard prop`);
    assert.ok(Math.hypot(at[0] - SPAWN.x, at[1] - SPAWN.z) >= 6, `${label}: spawn`);
    assert.ok(Math.hypot(p.x - LINE2_LEVER.x, p.z - LINE2_LEVER.z) >= 400, `${label}: lever`);
    for (const st of LINE2_STATIONS) assert.ok(Math.hypot(p.x - st.x, p.z - st.z) >= 600, `${label}: ${st.id}`);
    for (const path of PATH_SAMPLES)
      assert.ok(
        distToLine(
          at,
          path.map((v) => [v[0], v[1]]),
        ) >= 2,
        `${label}: path`,
      );
    // The existing junction disc is deliberately on both rails; moving it would cease to be Place's table.
    if (p !== SHED_TABLE && p !== PIER_STOP)
      for (const rail of rails) assert.ok(distToLine(at, rail) >= 3.5, `${label}: rail`);
  }
});

test('the rack serves the halt', () => {
  const p = railPoint(166.6),
    at = local(WORKS_RACK);
  assert.ok(Math.hypot(at[0] - p.x, at[1] - p.z) <= 25);
});
test('the wagon waits between the table and the train', () => {
  assert.ok(WAGON_S / 100 - 1.6 > TURNTABLE.r);
  assert.ok(WAGON_S / 100 + 1.6 < 11.7);
  assert.deepEqual(local(SHED_TABLE), [TURNTABLE.x, TURNTABLE.z]);
  assert.deepEqual(SHED_ROAD, { stall: 0, line2: 1 });
});
test('the pier stop fits', () => {
  const p = railPoint(PIER_STOP_CM / 100),
    at = local(PIER_STOP);
  assert.ok(Math.hypot(at[0] - p.x, at[1] - p.z) <= 0.05);
  assert.ok(LINES.east.len >= 735.3);
});
test('bents follow the first sea crossing', () => {
  CROSSING_BENTS.forEach((p, i) => {
    const a = local(p),
      b = ringAt(20 * (i + 1));
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) <= 0.005 * Math.SQRT2);
    assert.ok(distToLine(a, ring) <= 0.5);
    // Both footing positions remain at sea, on the crossing's perpendicular, not merely the bent centre.
    const before = ringAt(20 * (i + 1) - 0.01),
      after = ringAt(20 * (i + 1) + 0.01);
    const dx = after[0] - before[0],
      dz = after[1] - before[1],
      length = Math.hypot(dx, dz);
    for (const side of [-1, 1])
      assert.ok(
        H(
          p.x / 100 - (((side * dz) / length) * CROSSING_FOOT_OFF) / 100,
          p.z / 100 + (((side * dx) / length) * CROSSING_FOOT_OFF) / 100,
        ) <= 0,
      );
  });
});
test('one footing for every use', () => {
  assert.equal(WORKS.total, WORKS.stall + WORKS.cradle + WORKS.pier);
  assert.equal(WORKS.pier, 2 * CROSSING_BENTS.length);
  assert.deepEqual(RAIL_ROCKS, [...LINE1_ROCKS, ...WORKS_ROCKS]);
  assert.equal(new Set(RAIL_ROCKS.map((r) => r.id)).size, RAIL_ROCKS.length);
  // LINE2_BOILER is not on this origin/main yet. Pin the same pedestal from props.ts's FORGE + (6, 8.4).
  assert.equal(WORKS_BREAKER.x, Math.round((ORIGIN.x + FORGE.x + 6) * 100));
  assert.equal(WORKS_BREAKER.z, Math.round((ORIGIN.z + FORGE.z + 8.4) * 100));
  assert.equal(WORKS_BREAKER.y, Math.round(H(WORKS_BREAKER.x / 100, WORKS_BREAKER.z / 100) * 100));
});
