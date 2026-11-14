// The Round as data (docs/plans/town-layout.md, step 1): the centre derives from the hall, each building sits where the
// plan's table says, and the gaps, alleys, doors, pads and the balcony's glide hold. Pure numbers: nothing here is
// drawn here; the ground and streets consume the same plan rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import blockoutLevel from '../content/built/levels/town-blockout.json' with { type: 'json' };
import { blockoutFeet, standBlockout } from '../src/place/town-blockout.ts';
import { AXIS, HALL, SHELF_SIZE, STALLS, headPoints, stallFrame, type XZ } from '../src/place/home-station.ts';
import { prefabs as curioRecords } from '../src/content/prefabs/curio.ts';
import { curioParts } from '../src/prefab/builders/curio-parts.ts';
import {
  LINES,
  ORIGIN,
  PATHS,
  ROOM_FLOOR,
  ROOM_PLOTS,
  TOWN,
  TOWN_BLOCKS,
  TOWN_EAVE,
  TOWN_FOOTING,
  VILLAGE,
  lineAt,
} from '../src/place/layout.ts';
import { H, CELL, NX, NZ, at, cellX, cellZ, heights, pathMask, surfaceHeight } from '../src/place/terrain.ts';
import { SHORE_PATH } from '../src/place/shore-layout.ts';
import { SECRETS, padById } from '../src/place/tech-layout.ts';
import { LAND_TREES } from '../src/place/tree-catalog.ts';
import {
  TOWN_CENTRE,
  TOWN_FRONT,
  TOWN_GROUND,
  TOWN_PLOTS,
  TOWN_PROPS,
  TOWN_RING,
  TOWN_SLOTS,
  TOWN_STREETS,
  townBuilding,
  townLocal,
  slotPoint,
  type TownBuilding,
  type TownId,
} from '../src/place/town-plan.ts';

const FORGE = { x: -87, z: -3, yaw: 0, w: 10, d: 8 };
const SUMMIT = { x: 18, z: -6 };
const near = (a: number, b: number, tol: number, what: string) =>
  assert.ok(Math.abs(a - b) <= tol, `${what}: ${a.toFixed(3)} against ${b} (tolerance ${tol})`);

/** A footprint's four corners (the door is local +z). */
function corners(b: TownBuilding): XZ[] {
  const c = Math.cos(b.yaw),
    s = Math.sin(b.yaw);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([i, j]) => {
    const x = (i! * b.w) / 2,
      z = (j! * b.d) / 2;
    return { x: b.x + x * c + z * s, z: b.z - x * s + z * c };
  });
}
function toSegment(p: XZ, a: XZ, b: XZ) {
  const dx = b.x - a.x,
    dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz);
}
const inside = (p: XZ, q: XZ[]) => {
  let hit = false;
  for (let i = 0, j = 3; i < 4; j = i++)
    if (
      q[i]!.z > p.z !== q[j]!.z > p.z &&
      p.x < ((q[j]!.x - q[i]!.x) * (p.z - q[i]!.z)) / (q[j]!.z - q[i]!.z) + q[i]!.x
    )
      hit = !hit;
  return hit;
};
/** The wall-to-wall distance between two footprints (0 if they overlap). */
function gap(a: TownBuilding, b: TownBuilding) {
  const A = corners(a),
    B = corners(b);
  if (A.some((p) => inside(p, B)) || B.some((p) => inside(p, A))) return 0;
  let m = Infinity;
  for (const [P, Q] of [
    [A, B],
    [B, A],
  ] as const)
    for (const p of P) for (let i = 0; i < 4; i++) m = Math.min(m, toSegment(p, Q[i]!, Q[(i + 1) % 4]!));
  return m;
}
/** A point's distance to a footprint (0 inside). */
function pointGap(p: XZ, b: TownBuilding) {
  const q = corners(b);
  if (inside(p, q)) return 0;
  return Math.min(...q.map((c, i) => toSegment(p, c, q[(i + 1) % 4]!)));
}

const ids = TOWN_SLOTS.map((s) => s.id);
const B = (id: TownId) => townBuilding(id);

test('the occupied rooms and the balcony use their Round poses', () => {
  for (const [id, high] of [
    ['house', 3.7],
    ['shop', 3.9],
    ['museum', 5],
  ] as const)
    assert.deepEqual(ROOM_PLOTS[id], { ...B(id), high });
  const balcony = padById('balcony'),
    secret = SECRETS.find((s) => s.id === 'balcony')!;
  assert.deepEqual({ x: balcony.x, z: balcony.z }, TOWN_PROPS.balcony);
  assert.deepEqual({ x: secret.x, z: secret.z }, TOWN_PROPS.balcony);
  assert.equal(balcony.top, 24.4);
  assert.equal(secret.y, 24.4);
});

test('the axis runs at 70 degrees and the centre is where the plan says, so a change at the flip fails loudly', () => {
  assert.equal(AXIS.bearing, 70);
  near(TOWN_CENTRE.x, -115.0, 0.05, 'G.x');
  near(TOWN_CENTRE.z, 20.07, 0.05, 'G.z');
});

test('there are twelve buildings, the eight plots in order, and two staked at once', () => {
  assert.deepEqual(ids, [
    'house',
    'gate',
    'museum',
    'shop',
    'plot1',
    'plot2',
    'plot3',
    'plot4',
    'plot5',
    'plot6',
    'plot7',
    'plot8',
  ]);
  assert.deepEqual(
    TOWN_PLOTS.order,
    ids.filter((id) => id.startsWith('plot')),
  );
  assert.equal(TOWN_PLOTS.stakedAtOnce, 2);
});

test("each derived position is within 0.02 m of the plan's table row", () => {
  const rows: [TownId, number, number, number][] = [
    ['house', -110.54, -5.23, -0.175],
    ['gate', -138.84, 15.87, 1.396],
    ['museum', -125.27, -8.11, 0.349],
    ['shop', -119.52, 45.68, 2.967],
    ['plot1', -131.53, 39.76, 2.443],
    ['plot2', -106.22, 44.23, -2.793],
    ['plot3', -90.5, 33.0, -1.571],
    ['plot4', -133.55, 4.52, 0.873],
    ['plot5', -91.5, 42.2, -1.571],
    ['plot6', -90.5, 51.5, -1.571],
    ['plot7', -99.1, -22.8, -0.675],
    ['plot8', -108.3, 56.0, 1.571],
  ];
  for (const [id, x, z, yaw] of rows) {
    const b = B(id);
    near(b.x, x, 0.02, `${id}.x`);
    near(b.z, z, 0.02, `${id}.z`);
    near(b.yaw, yaw, 0.002, `${id}.yaw`);
  }
});

test('every ring building faces the green squarely, and stands at its one setback (the museum sits back)', () => {
  for (const s of TOWN_SLOTS) {
    if (!s.ring) continue;
    const b = B(s.id);
    const toG = { x: TOWN_CENTRE.x - b.x, z: TOWN_CENTRE.z - b.z };
    const door = { x: Math.sin(b.yaw), z: Math.cos(b.yaw) };
    near(toG.x * door.z - toG.z * door.x, 0, 0.01, `${s.id}: the door points at G (cross)`);
    assert.ok(toG.x * door.x + toG.z * door.z > 0, `${s.id}: the door faces G, not away`);
    assert.equal(s.ring.front, s.id === 'museum' ? 24 : TOWN_FRONT, `${s.id}'s front`);
  }
});

test('every building is 2.4 m or more from every other, and 1 m or more from the hall, forge, stalls, bay and rails', () => {
  const town = ids.map((id) => ({ id, b: B(id) }));
  let narrowest = Infinity;
  for (let i = 0; i < town.length; i++)
    for (let j = i + 1; j < town.length; j++) {
      const g = gap(town[i]!.b, town[j]!.b);
      narrowest = Math.min(narrowest, g);
      assert.ok(g >= 2.4, `${town[i]!.id} to ${town[j]!.id} is ${g.toFixed(2)} m`);
    }
  assert.ok(narrowest >= 2.4);
  const hall: TownBuilding = { x: HALL.x, z: HALL.z, yaw: HALL.yaw, w: HALL.w, d: HALL.d };
  const others: [string, TownBuilding][] = [
    ['the hall', hall],
    ['the forge', FORGE],
    ['the bay', TOWN_PROPS.bay.foot],
    ['the shelf', TOWN_PROPS.shelf.foot],
    ...STALLS.bearings.map((b): [string, TownBuilding] => {
      const f = stallFrame(b);
      return [`the ${b} stall`, { ...f.centre, yaw: f.yaw, w: STALLS.width, d: STALLS.depth }];
    }),
  ];
  for (const { id, b } of town)
    for (const [name, o] of others) {
      const g = gap(b, o);
      assert.ok(g >= 1, `${id} is ${g.toFixed(2)} m from ${name}`);
    }
  const rails: XZ[] = [...headPoints(0), ...headPoints(1)];
  const out = { x: 0, z: 0, ux: 0, uz: 0 };
  for (const line of [LINES.north, LINES.east])
    for (let s = 0; s <= 200; s += 2) {
      lineAt(line, s, out);
      rails.push({ x: out.x, z: out.z });
    }
  for (const { id, b } of town)
    for (const r of rails)
      assert.ok(
        pointGap(r, b) >= 1,
        `${id} is ${pointGap(r, b).toFixed(2)} m from a rail at (${r.x.toFixed(1)}, ${r.z.toFixed(1)})`,
      );
});

test("no ring building's corner is inside 20.5 m of G, or within the dock street's half width", () => {
  const dock = TOWN_STREETS.dock;
  const a = {
    x: TOWN_CENTRE.x + dock.from * Math.sin((dock.bearing * Math.PI) / 180),
    z: TOWN_CENTRE.z - dock.from * Math.cos((dock.bearing * Math.PI) / 180),
  };
  const z = {
    x: TOWN_CENTRE.x + dock.to * Math.sin((dock.bearing * Math.PI) / 180),
    z: TOWN_CENTRE.z - dock.to * Math.cos((dock.bearing * Math.PI) / 180),
  };
  for (const s of TOWN_SLOTS)
    for (const c of corners(B(s.id))) {
      if (s.ring)
        assert.ok(Math.hypot(c.x - TOWN_CENTRE.x, c.z - TOWN_CENTRE.z) >= 20.5, `${s.id} corner is inside 20.5 m of G`);
      assert.ok(
        toSegment(c, a, z) >= dock.width / 2,
        `${s.id} corner is on the dock street: ${toSegment(c, a, z).toFixed(2)} m from its axis`,
      );
    }
});

test('every ring door is within 3.5 m of the ring road outer edge (the museum 4.0 m: its forecourt)', () => {
  for (const s of TOWN_SLOTS) {
    if (!s.ring) continue;
    const d = s.ring.front - TOWN_RING.outer;
    assert.ok(d <= (s.id === 'museum' ? 4.0 : 3.5) && d > 0, `${s.id}'s door is ${d} m from the edge`);
  }
});

test('every pad is within 56 m of VILLAGE, and the balcony pad is within the glide budget of the summit', () => {
  for (const [name, p] of [
    ['the balcony pad', TOWN_PROPS.balcony],
    ['the yard find', TOWN_PROPS.yard],
    ['the bay', TOWN_PROPS.bay],
  ] as const)
    assert.ok(
      Math.hypot(p.x - VILLAGE.x, p.z - VILLAGE.z) <= 56,
      `${name} is ${Math.hypot(p.x - VILLAGE.x, p.z - VILLAGE.z).toFixed(1)} m from VILLAGE`,
    );
  const glide = Math.hypot(TOWN_PROPS.balcony.x - SUMMIT.x, TOWN_PROPS.balcony.z - SUMMIT.z);
  assert.ok(glide <= 187, `the balcony is ${glide.toFixed(1)} m from the summit`);
});

test("every cottage roof is 11 m or more from the shop's roof and the balcony pad", () => {
  const shop = B('shop');
  for (const s of TOWN_SLOTS) {
    if (s.kit !== 'cottage') continue;
    const c = B(s.id);
    assert.ok(gap(c, shop) >= 11, `${s.id} is ${gap(c, shop).toFixed(1)} m from the shop`);
    assert.ok(
      pointGap(TOWN_PROPS.balcony, c) >= 11,
      `${s.id} is ${pointGap(TOWN_PROPS.balcony, c).toFixed(1)} m from the balcony pad`,
    );
  }
});

test('the yard find is 4.5 m behind the gate cottage, and the forge door and the clock stand where the plan says', () => {
  const gate = B('gate');
  near(pointGap(TOWN_PROPS.yard, gate), 4.5, 0.05, 'the yard find behind the back wall');
  assert.deepEqual(TOWN_PROPS.forgeDoor, { x: -92, z: -3, w: 2.8 });
  assert.deepEqual({ x: TOWN_PROPS.clock.x, z: TOWN_PROPS.clock.z }, TOWN_CENTRE);
  near(TOWN_PROPS.bay.x, -87.86, 0.01, 'bay.x');
  near(TOWN_PROPS.bay.z, 21.31, 0.01, 'bay.z');
});

test('the curio frames’ footprints are the drawn crowns’: SHELF_SIZE agrees with the parts the records build', () => {
  for (const piece of ['shelf', 'bay'] as const) {
    const record = curioRecords.find((r) => r.key === `town.curio-${piece}`);
    assert.ok(record && 'builder' in record.visual, `${piece} record`);
    const { parts } = curioParts(record.visual.params);
    // A box part is [kind, x, y, z, w, h, d, colour], in the frame's own space (+z its front).
    const lo = (at: 1 | 3, size: 4 | 6) => Math.min(...parts.map((p) => Number(p[at]) - Number(p[size]) / 2)),
      hi = (at: 1 | 3, size: 4 | 6) => Math.max(...parts.map((p) => Number(p[at]) + Number(p[size]) / 2));
    near(hi(1, 4), SHELF_SIZE.crown, 1e-9, `${piece} half-width`);
    near(lo(1, 4), -SHELF_SIZE.crown, 1e-9, `${piece} half-width`);
    near(hi(3, 6), SHELF_SIZE.front, 1e-9, `${piece} front`);
    near(-lo(3, 6), SHELF_SIZE.back, 1e-9, `${piece} back`);
    const foot = TOWN_PROPS[piece].foot;
    near(foot.w, hi(1, 4) - lo(1, 4), 1e-9, `${piece} footprint width`);
    near(foot.d, hi(3, 6) - lo(3, 6), 1e-9, `${piece} footprint depth`);
    // The footprint's centre is the drawn crown's: forward of the frame's by half the difference.
    const face = { x: Math.sin(foot.yaw), z: Math.cos(foot.yaw) },
      off = (foot.x - TOWN_PROPS[piece].x) * face.x + (foot.z - TOWN_PROPS[piece].z) * face.z;
    near(off, (hi(3, 6) + lo(3, 6)) / 2, 1e-9, `${piece} footprint centre`);
  }
  near(SHELF_SIZE.top, 3.47, 1e-9, 'the shelf’s top');
  // The shelf's drawn crown clears the Round's plot 3 by a metre with a little over.
  const plot3 = gap(B('plot3'), TOWN_PROPS.shelf.foot);
  assert.ok(plot3 >= 1.1, `the shelf is ${plot3.toFixed(3)} m from plot 3`);
});

test('the tree catalog retains its stable planting order (length, first and last rows)', () => {
  const at = (i: number) => [Math.round(LAND_TREES[i]!.x * 100) / 100, Math.round(LAND_TREES[i]!.z * 100) / 100];
  assert.equal(LAND_TREES.length, 362);
  assert.deepEqual(at(0), [1081.13, -89.07]);
  assert.deepEqual(at(LAND_TREES.length - 1), [1426.55, -214.11]);
});

test('the ground under the Round footprints and their 3 m aprons is level', () => {
  const level = (p: XZ, label: string) => near(H(p.x + ORIGIN.x, p.z), VILLAGE.y, 0.05, label);
  for (const s of TOWN_SLOTS) {
    const b = B(s.id);
    for (const apron of [0, 3])
      for (const p of corners({ ...b, w: b.w + apron * 2, d: b.d + apron * 2 })) level(p, `${s.id}, apron ${apron}`);
  }
  // Test the baked road cells, avoiding the bowl bank's interpolation across the inner boundary.
  // The existing hall/rail apron reaches inward to r17 (not just r18 as the plan estimated).
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const dx = cellX(i) - TOWN_CENTRE.x,
        dz = cellZ(j) - TOWN_CENTRE.z;
      const r = Math.hypot(dx, dz);
      if (r < TOWN_RING.inner || r > TOWN_GROUND.r) continue;
      const bearing = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
      const hall = bearing >= 60 && bearing <= 100;
      const threshold = Object.values(ROOM_PLOTS).some((room) => {
        const door = townLocal(room, 0, room.d / 2);
        return Math.hypot(cellX(i) - door.x, cellZ(j) - door.z) <= 3;
      });
      const lift = threshold && r > TOWN_RING.outer && heights[at(i, j)]! > 18 ? ROOM_FLOOR : 0.05;
      near(heights[at(i, j)]!, 18, hall ? 0.25 : lift, `Round ${cellX(i)},${cellZ(j)}`);
      if (r <= TOWN_RING.outer) assert.ok(pathMask[at(i, j)]! >= 0.99, 'the ring is painted');
    }
  for (let r = 20; r <= 36; r += CELL) level(slotPoint(250, r), `dock r${r}`);
});

test('the green has one 0.8 m drop tunable and a shallow bank to the level ring', () => {
  assert.deepEqual(TOWN_GROUND, { r: 38, soft: 8, green: { drop: 0.8, flat: 10 } });
  near(H(TOWN_CENTRE.x + ORIGIN.x, TOWN_CENTRE.z), 18 - TOWN_GROUND.green.drop, 0.001, 'bowl floor');
  for (let bearing = 0; bearing < 360; bearing += 30) {
    const floor = slotPoint(bearing, TOWN_GROUND.green.flat - CELL);
    near(H(floor.x + ORIGIN.x, floor.z), 17.2, 0.001, 'flat green');
  }
});

test('the tree table keeps all 362 trunks outside the Round pad and edge', () => {
  assert.equal(LAND_TREES.length, 362);
  for (const t of LAND_TREES)
    assert.ok(Math.hypot(t.x - ORIGIN.x - TOWN_CENTRE.x, t.z - TOWN_CENTRE.z) > TOWN_GROUND.r + TOWN_GROUND.soft);
});

test("no footprint corner is within 2.4 m of a road's centre line", () => {
  const roads = [
    PATHS[0]!.pts.slice(0, 2).map(([x, z]) => ({ x, z })),
    PATHS[1]!.pts.slice(0, 4).map(([x, z]) => ({ x, z })),
    TOWN_STREETS.dock.line,
  ];
  for (const s of TOWN_SLOTS)
    for (const p of corners(B(s.id)))
      for (const road of roads)
        for (let i = 1; i < road.length; i++)
          assert.ok(toSegment(p, road[i - 1]!, road[i]!) >= 2.4, `${s.id} clears the road`);
  const quarry = roads[1]!;
  for (const [id, expected] of [
    ['plot2', 3.6248],
    ['plot3', 3.8746],
    ['plot6', 3.65],
  ] as const) {
    const clearance = Math.min(
      ...corners(B(id)).flatMap((p) => quarry.slice(1).map((b, i) => toSegment(p, quarry[i]!, b))),
    );
    near(clearance, expected, 0.001, `${id} to threaded quarry centre line`);
  }
});

test("the quarry path's bridge still spans the river after adding two head points", () => {
  const quarry = PATHS[1]!;
  assert.equal(quarry.bridgeAt, 8);
  assert.deepEqual(quarry.pts[quarry.bridgeAt], [-36.5, 112.4, 1.7]);
  assert.deepEqual(quarry.pts[quarry.bridgeAt + 1], [-19.2, 117.4, 1.7]);
});

test('the gate is the one cottage, the yard is behind it and the shore ends at the dock street', () => {
  const gate = B('gate');
  assert.equal(TOWN.start.length, 1);
  assert.deepEqual(TOWN.start[0], {
    type: 'cottage',
    x: gate.x,
    z: gate.z,
    yaw: gate.yaw,
    w: gate.w,
    d: gate.d,
    smoke: true,
  });
  const yard = SECRETS.find((s) => s.id === 'yard')!;
  assert.deepEqual({ x: yard.x, z: yard.z }, TOWN_PROPS.yard);
  assert.deepEqual(yard.from, { x: -136, z: 22 });
  assert.deepEqual(
    SHORE_PATH.slice(-2),
    TOWN_STREETS.dock.line.map((p) => [p.x, p.z, 18]),
  );
});

// B3, the blockout: the eight bought plots as plain blocks and the clock's footing (docs/plans/home-flip.md).
type Stood = {
  id: string;
  prefab: string;
  pos: readonly number[];
  rot: readonly number[];
  scale?: readonly number[];
  params?: { colour?: string };
};
const stood: Stood[] = standBlockout(blockoutLevel.placements, H);
const piece = (id: string) => stood.find((p) => p.id === id)!;

test('every slot is drawn once: a room, the gate cottage or a block', () => {
  for (const s of TOWN_SLOTS) {
    const drawn = [
      Object.hasOwn(ROOM_PLOTS, s.id),
      s.id === 'gate' && TOWN.start.length === 1,
      TOWN_BLOCKS.some((b) => b.id === s.id),
    ].filter(Boolean).length;
    assert.equal(drawn, 1, `${s.id} is drawn ${drawn} times`);
  }
  assert.deepEqual(
    TOWN_BLOCKS.map((b) => b.id),
    TOWN_PLOTS.order,
  );
});

test("a block's height is its kit's eave: a house's slab and wall, a cottage's wall", () => {
  near(TOWN_EAVE.house, ROOM_FLOOR + ROOM_PLOTS.house.high, 1e-9, 'house eave');
  // The cottage kit's wall height is `planOf`'s (a view module the test does not load).
  const cottage = /case 'cottage':\s+return housePlan\(\{[^}]*?high: (\d+(?:\.\d+)?),/.exec(
    fs.readFileSync('src/place/opening-plans.ts', 'utf8'),
  );
  assert.equal(TOWN_EAVE.cottage, Number(cottage?.[1]));
  for (const b of TOWN_BLOCKS) assert.equal(b.high, TOWN_EAVE[b.kit]);
  assert.deepEqual(TOWN_FOOTING, { ...TOWN_CENTRE, yaw: 0, w: 5, d: 5, high: 0.3 });
});

test('the built level is the plan: eight solid blocks at their rows, a door panel and a mat on each door side', () => {
  assert.equal(blockoutLevel.placements.length, 25);
  assert.equal(stood.filter((p) => p.prefab === 'greybox.box').length, 9, 'eight blocks and the footing are solid');
  for (const b of TOWN_BLOCKS) {
    const plan = townBuilding(b.id),
      block = piece(`town.block.${b.id}`),
      door = piece(`town.block.${b.id}.door`),
      mat = piece(`town.block.${b.id}.mat`);
    assert.equal(block.prefab, 'greybox.box');
    near(block.pos[0]!, plan.x + ORIGIN.x, 0.01, `${b.id} x`);
    near(block.pos[2]!, plan.z, 0.01, `${b.id} z`);
    near(block.rot[0]!, plan.yaw, 0.01, `${b.id} yaw`);
    assert.deepEqual(block.scale, [plan.w, b.high, plan.d]);
    near(block.pos[1]! - b.high / 2, VILLAGE.y, 0.001, `${b.id} stands on the ground`);
    // The marks are not solid, and stand on the door side: the panel proud of the door face, the mat outside it.
    for (const mark of [door, mat]) assert.equal(mark.prefab, 'greybox.decoration');
    const face = townLocal(plan, 0, plan.d / 2 + door.scale![2]! / 2);
    near(door.pos[0]!, face.x + ORIGIN.x, 0.001, `${b.id} door x`);
    near(door.pos[2]!, face.z, 0.001, `${b.id} door z`);
    near(door.pos[1]! - door.scale![1]! / 2, VILLAGE.y, 0.001, `${b.id} door foot`);
    const out = { x: mat.pos[0]! - ORIGIN.x - plan.x, z: mat.pos[2]! - plan.z };
    const along = out.x * Math.sin(plan.yaw) + out.z * Math.cos(plan.yaw),
      across = out.x * Math.cos(plan.yaw) - out.z * Math.sin(plan.yaw);
    near(across, 0, 0.001, `${b.id} mat is centred on the door`);
    assert.ok(along - mat.scale![2]! / 2 > plan.d / 2 - 1e-9, `${b.id} mat is outside the door`);
    assert.ok(along + mat.scale![2]! / 2 < plan.d / 2 + 2, `${b.id} mat is within 2 m of the door`);
    // As wide as the door panel, against the wall, 1.5 m deep; plot 6's stops at the quarry road's 1.25 m verge.
    assert.equal(mat.scale![0], door.scale![0], `${b.id} mat is the door's width`);
    near(along - mat.scale![2]! / 2, plan.d / 2, 1e-9, `${b.id} mat lies against the wall`);
    assert.equal(mat.scale![2], b.id === 'plot6' ? 1.25 : 1.5, `${b.id} mat depth`);
    assert.notEqual(mat.params?.colour, door.params?.colour, `${b.id} mat is not the door's pale`);
    near(mat.pos[1]! - mat.scale![1]! / 2, VILLAGE.y, 0.001, `${b.id} mat lies on the ground`);
  }
  const footing = piece('town.footing');
  assert.deepEqual(footing.scale, [TOWN_FOOTING.w, TOWN_FOOTING.high, TOWN_FOOTING.d]);
  near(footing.pos[0]!, TOWN_CENTRE.x + ORIGIN.x, 0.001, 'footing x');
  near(footing.pos[2]!, TOWN_CENTRE.z, 0.001, 'footing z');
  near(footing.pos[1]! - TOWN_FOOTING.high / 2, VILLAGE.y - TOWN_GROUND.green.drop, 0.001, 'footing on the green');
});

test('every block, mat and the footing stands on drawn ground: nothing floats, no terrain comes through', () => {
  for (const b of [...TOWN_BLOCKS, { id: 'footing', ...TOWN_FOOTING }]) {
    const base = H(b.x + ORIGIN.x, b.z);
    // The footprint and the 1.5 m outside the door the mat lies on, every 0.2 m, on both height reads.
    for (let x = -b.w / 2; x <= b.w / 2 + 1e-9; x += b.w / 40)
      for (let z = -b.d / 2; z <= b.d / 2 + 1.5; z += 0.2) {
        const p = townLocal(b, x, z);
        for (const h of [H(p.x + ORIGIN.x, p.z), surfaceHeight(p.x + ORIGIN.x, p.z)])
          near(h, base, 0.02, `${b.id} ground at ${x.toFixed(1)},${z.toFixed(1)}`);
      }
  }
});

test("no block's mat lies on a road: each is off the ring and outside the quarry road's 2.4 m half width", () => {
  const quarry = TOWN_STREETS.quarry.head;
  for (const b of TOWN_BLOCKS) {
    const mat = piece(`town.block.${b.id}.mat`);
    const p = { x: mat.pos[0]! - ORIGIN.x, z: mat.pos[2]! };
    for (const c of corners({ ...p, yaw: b.yaw, w: mat.scale![0]!, d: mat.scale![2]! })) {
      const r = Math.hypot(c.x - TOWN_CENTRE.x, c.z - TOWN_CENTRE.z);
      assert.ok(r > TOWN_RING.outer, `${b.id} mat is off the ring road (${r.toFixed(2)} m from G)`);
      for (let i = 0; i + 1 < quarry.length; i++)
        assert.ok(toSegment(c, quarry[i]!, quarry[i + 1]!) >= 2.4 - 1e-9, `${b.id} mat is off the quarry road`);
    }
  }
});

test('the little guys walk round the footing and the blocks: every solid has an avoidance footprint', () => {
  // folk.ts steers round `feet` (src/place/sites.ts), not colliders: each solid piece registers its footprint.
  const feet = blockoutFeet(stood);
  assert.equal(feet.length, 9);
  for (const b of [...TOWN_BLOCKS, TOWN_FOOTING]) {
    const foot = feet.find((f) => Math.hypot(f.x - b.x - ORIGIN.x, f.z - b.z) < 0.001);
    assert.ok(foot, 'a footprint at each solid');
    assert.deepEqual([foot.yaw, foot.hw, foot.hd], [b.yaw, b.w / 2, b.d / 2]);
  }
  // The walk the review found: the green's wander points (-6, -6) and (6, 6) from G cross the footing.
  const foot = feet.find((f) => Math.hypot(f.x - TOWN_CENTRE.x - ORIGIN.x, f.z - TOWN_CENTRE.z) < 0.001)!;
  let crossed = false;
  for (let t = 0; t <= 1; t += 0.01) {
    const x = TOWN_CENTRE.x + ORIGIN.x - 6 + 12 * t - foot.x,
      z = TOWN_CENTRE.z - 6 + 12 * t - foot.z;
    crossed ||= Math.abs(x) <= foot.hw && Math.abs(z) <= foot.hd;
  }
  assert.ok(crossed, 'the diagonal across the green meets the footing footprint');
  // The view registers every one of them with its owner, so they leave with the blocks.
  const view = fs.readFileSync('src/entities/town/blockout.ts', 'utf8');
  assert.match(
    view,
    /for \(const f of blockoutFeet\(placements\)\) addFoot\(f\.x, f\.z, f\.yaw, f\.hw, f\.hd, owner\);/,
  );
});
