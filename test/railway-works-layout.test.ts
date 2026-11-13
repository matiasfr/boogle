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
} from '../src/place/layout.ts';
import { H, PATH_SAMPLES } from '../src/place/terrain.ts';
import { distToLine, parseMapPage, type XZ } from '../src/proto/greybox/map-data.ts';
import { LINE2_BOILER, LINE2_LEVER, LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';
import { LINE1_ROCKS } from '../src/sim/railway-line-layout.ts';
import { TRAIN_STOPS, trainStopsOf } from '../src/sim/railway-train.ts';
import { LOCO, TRAILER, TRAIN_CARS, TRAIN_OFFSETS } from '../src/entities/railway/cars.ts';
import { ENGINE, ENGINE_LONG_AHEAD } from '../src/entities/railway/engine.ts';
/** src/entities/railway/machine-model.ts MACHINE_GAP (that module loads three.js, so it is pinned here). */
const MACHINE_GAP = 3.7;
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
  CROSSING_DECK_Y,
  RAIL_ROCKS,
} from '../src/sim/railway-works-layout.ts';

type Point = { x: number; z: number };
const local = (p: Point): XZ => [p.x / 100 - ORIGIN.x, p.z / 100 - ORIGIN.z];
// The Works' seams on land; the third, Ring Island's rivet (v27), is over the sea at the leaf's toe.
const land = [
  WORKS_BREAKER,
  WORKS_CLEFT,
  WORKS_KILN,
  WORKS_RACK,
  ...WORKS_ROCKS,
  ...WORKS_SEAMS.filter((s) => s.id < 2),
  SHED_STALL,
];
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
  assert.ok(WAGON_S / 100 + 1.6 < 12.95, 'short of the plain train at the stop (v33: 18.25 less 3.7 and 1.6)');
  assert.equal(SHED_TABLE.x, Math.round((ORIGIN.x + TURNTABLE.x) * 100));
  assert.equal(SHED_TABLE.z, Math.round((ORIGIN.z + TURNTABLE.z) * 100));
  assert.deepEqual(SHED_ROAD, { stall: 0, line2: 1 });
});
test('the pier stop fits', () => {
  const p = railPoint(PIER_STOP_CM / 100),
    at = local(PIER_STOP);
  assert.ok(Math.hypot(at[0] - p.x, at[1] - p.z) <= 0.05);
  assert.ok(LINES.east.len >= 735.3);
});
// Line 2's footprints along its rails, in metres, from the constants the views pose with (src/entities/railway/cars.ts):
// train-view puts car n at the train's along + TRAIN_OFFSETS[n], sized TRAIN_CARS[n]; rail.ts `buildMachine().at(line,
// head, 1, setback)` puts the track layer's flatbed (TRAILER) at head − setback and its loco (LOCO) MACHINE_GAP behind,
// with line2-view's setback of 2.4 m whenever it isn't laying. `engine` grows the engine (ENGINE) alone, as cars.ts places it.
type Span = readonly [number, number];
function trainSpan(along: number, engine = 1): Span {
  const wagon = TRAIN_CARS.length - 1,
    grown = ENGINE.hz * (engine - 1);
  return [
    along + TRAIN_OFFSETS[wagon]! - TRAIN_CARS[wagon]!.hz,
    along + TRAIN_OFFSETS[0]! + grown + TRAIN_CARS[0]!.hz + grown,
  ];
}
const layerSpan = (head: number, setback = 2.4): Span => [
  head - setback - MACHINE_GAP - LOCO.hz,
  head - setback + TRAILER.hz,
];
/** Air between two spans along the line (negative: they overlap by that much). */
const gap = (a: Span, b: Span) => Math.max(a[0], b[0]) - Math.min(a[1], b[1]);
test('no train stands inside the track layer, even with the longer boiler', () => {
  // Trains run from the boiler on, after Q5 is laid: the track layer is then parked at Q6's start, laying Q6 (its
  // flatbed never backs past where it stood) or parked at the rails' end once Q6 is laid and the Pier stop opens.
  const q6 = LINE2_STATIONS.at(-1)!;
  // A as built, and with the longer boiler's frame 0.5 m longer ahead (docs/plans/engine-previz.md).
  for (const engine of [1, 1 + ENGINE_LONG_AHEAD / (2 * ENGINE.hz)])
    for (const [pier, head] of [
      [false, q6.fromCm / 100],
      [true, q6.toCm / 100],
    ] as const) {
      const layer = layerSpan(head);
      for (const stop of trainStopsOf(1, pier)) {
        const g = gap(trainSpan(stop / 100, engine), layer);
        assert.ok(g >= 1, `line 2 at ${stop / 100} m, engine ×${engine}, pier ${pier}: ${g.toFixed(2)} m clear`);
      }
    }
  // At the Pier halt (s 719-741 m) the engine stands at the deck and the wagon at least half on it.
  const [rear, front] = trainSpan(PIER_STOP_CM / 100);
  assert.ok(rear + TRAIN_CARS.at(-1)!.hz >= 719 && front <= 741, `${rear}..${front}`);
  // Its consist is the one the wagon couples to at the village.
  assert.equal(WAGON_S, TRAIN_STOPS[1]![0]! + TRAIN_OFFSETS.at(-1)! * 100);
});
test('bents follow the first sea crossing, centred on the double deck', () => {
  CROSSING_BENTS.forEach((p, i) => {
    // Bent n stands at u = 20 n, its centre the 7.6 m formation's middle: 2 m west of line 2's track (ruling 11).
    const before = ringAt(20 * (i + 1) - 0.01),
      after = ringAt(20 * (i + 1) + 0.01);
    const dx = after[0] - before[0],
      dz = after[1] - before[1],
      length = Math.hypot(dx, dz);
    const a = local(p),
      b = ringAt(20 * (i + 1)),
      mid: XZ = [b[0] + (2 * dz) / length, b[1] - (2 * dx) / length];
    assert.ok(Math.hypot(a[0] - mid[0], a[1] - mid[1]) <= 0.005 * Math.SQRT2, `bent ${i + 1}`);
    assert.ok(Math.abs(distToLine(a, ring) - 2) <= 0.05);
    // Both footing positions remain at sea, on the crossing's perpendicular, not merely the bent centre.
    for (const side of [-1, 1])
      assert.ok(
        H(
          p.x / 100 - (((side * dz) / length) * CROSSING_FOOT_OFF) / 100,
          p.z / 100 + (((side * dx) / length) * CROSSING_FOOT_OFF) / 100,
        ) <= 0,
      );
  });
});
test('the bents carry the 7.6 m deck: two footings each, 3.3 m either side of the middle, posts under its edges', () => {
  // The deck spans 3.8 m either side of the middle; the posts (0.75 m) stand under its edges, inside the cap.
  assert.equal(CROSSING_FOOT_OFF, 330);
  assert.ok(CROSSING_FOOT_OFF / 100 + 0.375 <= 3.8 && (2 * CROSSING_FOOT_OFF) / 100 >= 6);
  for (let i = 1; i < CROSSING_BENTS.length; i++) {
    const a = CROSSING_BENTS[i - 1]!,
      b = CROSSING_BENTS[i]!;
    assert.ok(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - 2000) <= 2, `bents ${i} to ${i + 1}`);
  }
});
test('the bents bow down at the 4% ruling grade from the pier head', () => {
  assert.equal(CROSSING_DECK_Y.length, CROSSING_BENTS.length);
  assert.equal(CROSSING_DECK_Y[0], PIER_STOP.y); // bent 1 is level with the pier head (ring-island ruling 5)
  assert.equal(CROSSING_DECK_Y.at(-1), 2030);
  const first = CROSSING_BENTS[0]!;
  CROSSING_BENTS.forEach((p, i) => {
    const out = Math.hypot(p.x - first.x, p.z - first.z);
    assert.ok(Math.abs(CROSSING_DECK_Y[i]! - (2430 - 0.04 * out)) <= 1, `bent ${i + 1}: ${CROSSING_DECK_Y[i]} cm`);
    assert.ok(Number.isInteger(CROSSING_DECK_Y[i]));
  });
});
test('one footing for every use', () => {
  assert.equal(WORKS.total, WORKS.stall + WORKS.cradle + WORKS.pier + WORKS.ring + WORKS.counterweight);
  assert.equal(WORKS.ring, 2 * 7, 'two footings a bent, bents 7-13');
  assert.equal(WORKS.pier, 2 * CROSSING_BENTS.length);
  assert.deepEqual(RAIL_ROCKS, [...LINE1_ROCKS, ...WORKS_ROCKS]);
  assert.equal(new Set(RAIL_ROCKS.map((r) => r.id)).size, RAIL_ROCKS.length);
  // The breaker uses the boiler's pedestal at Home (home-flip X1).
  assert.deepEqual([WORKS_BREAKER.x, WORKS_BREAKER.z], [92200, -117]);
  assert.equal(WORKS_BREAKER.x, LINE2_BOILER.x);
  assert.equal(WORKS_BREAKER.z, LINE2_BOILER.z);
  assert.equal(WORKS_BREAKER.y, Math.round(H(WORKS_BREAKER.x / 100, WORKS_BREAKER.z / 100) * 100));
});
