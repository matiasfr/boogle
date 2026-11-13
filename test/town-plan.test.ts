// The Round as data (docs/plans/town-layout.md, step 1): the centre derives from the hall, each building sits where the
// plan's table says, and the gaps, alleys, doors, pads and the balcony's glide hold. Pure numbers: nothing here is
// drawn, and nothing in the game imports town-plan.ts yet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AXIS, HALL, STALLS, headPoints, stallFrame, type XZ } from '../src/place/home-station.ts';
import { LINES, VILLAGE, lineAt } from '../src/place/layout.ts';
import { LAND_TREES } from '../src/place/tree-catalog.ts';
import {
  TOWN_CENTRE,
  TOWN_FRONT,
  TOWN_PLOTS,
  TOWN_PROPS,
  TOWN_RING,
  TOWN_SLOTS,
  TOWN_STREETS,
  townBuilding,
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
    ['the bay', { ...TOWN_PROPS.bay, w: 5.9, d: 1 }],
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
  near(TOWN_PROPS.bay.x, -89.19, 0.01, 'bay.x');
  near(TOWN_PROPS.bay.z, 21.8, 0.01, 'bay.z');
});

test('the tree catalog retains its stable planting order (length, first and last rows)', () => {
  const at = (i: number) => [Math.round(LAND_TREES[i]!.x * 100) / 100, Math.round(LAND_TREES[i]!.z * 100) / 100];
  assert.equal(LAND_TREES.length, 362);
  assert.deepEqual(at(0), [1081.13, -89.07]);
  assert.deepEqual(at(LAND_TREES.length - 1), [1426.55, -214.11]);
});
