// Ring Island's ground (src/entities/ring-island/ground.ts; docs/plans/ring-island-build1.md, step 2b): off the fills
// it is Place's cones (ringHeight) within 5 cm, and it stays 50 cm under every planned deck on the island's side.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RING_CONES, ringHeight } from '../src/proto/greybox/ring-cones.ts';
import { FAR, ORIGIN } from '../src/place/layout.ts';
import {
  RING_BRACE_PLATFORM,
  RING_END,
  RING_FORMATION,
  RING_GAP,
  RING_HALT,
  ringAt,
  ringDeckY,
} from '../src/sim/railway-ring-layout.ts';
import { CONCOURSE } from '../src/proto/greybox/ring-house.ts';
import { createIslandGround, ISLAND_BED, ISLAND_FILL, ringUL } from '../src/entities/ring-island/ground.ts';

const centre = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };
const g = createIslandGround(RING_CONES, centre);
/** ringHeight takes Place's local metres (x less ORIGIN.x). */
const cones = (x: number, z: number) => ringHeight(x - ORIGIN.x, z - ORIGIN.z);
const w = (u: number, lat: number) => {
  const p = ringAt(Math.round(u * 100), Math.round(lat * 100));
  return { x: p.x / 100, z: p.z / 100 };
};
/** Off the fills: well clear of the halt's fill and the run-off bed's cutting, and of their embankments' reach. */
const offFills = (x: number, z: number) => g.fillOut(x, z) > 25 && g.bedOut(x, z) > 25;

test('ringUL inverts ringAt', () => {
  for (const [u, lat] of [
    [0, 0],
    [289, 6],
    [448, -7.55],
    [-50, 30],
  ] as const) {
    const p = w(u, lat),
      back = ringUL(p.x, p.z);
    assert.ok(Math.abs(back.u - u) < 0.02 && Math.abs(back.lat - lat) < 0.02, `${u}, ${lat}: ${JSON.stringify(back)}`);
  }
});

test('off the fills the ground is the cones within 5 cm, at every node and on the triangles between', () => {
  let nodes = 0,
    between = 0;
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      const x = g.x0 + i * g.cell,
        z = g.z0 + j * g.cell,
        want = cones(x, z);
      if (!offFills(x, z) || !(want > ISLAND_BED)) continue;
      nodes++;
      assert.ok(Math.abs(g.at(i, j) - want) <= 0.05, `node (${x}, ${z}): ${g.at(i, j)} against ${want}`);
    }
  // Between nodes the triangles stand within 5 cm of a cone's surface wherever one cone's straight slope spans the
  // cell: far enough from its apex (15 m, 25 m per unit of slope: a 2 m triangle across a cone sags about slope / d) and from where another cone stands higher (the ridges, where a 2 m triangle
  // can't follow the max of two cones' slopes).
  for (let z = g.bounds.minZ + 1.3; z < g.bounds.maxZ; z += 3.7)
    for (let x = g.bounds.minX + 0.7; x < g.bounds.maxX; x += 3.1) {
      if (!offFills(x, z)) continue;
      const surfaces = RING_CONES.map(([dx, dz, r, h]) => {
        const d = Math.hypot(x - centre.x - dx, z - centre.z - dz);
        return { y: h - 4 - (h * d) / r, d, inside: d < r, slope: h / r };
      });
      const top = surfaces.reduce((a, b) => (b.y > a.y ? b : a));
      const next = Math.max(...surfaces.filter((s) => s !== top).map((s) => s.y));
      if (!top.inside || top.d < Math.max(15, 25 * top.slope) || top.y - next < 6) continue;
      between++;
      assert.ok(
        Math.abs(g.islandH(x, z) - cones(x, z)) <= 0.05,
        `(${x}, ${z}): ${g.islandH(x, z)} against ${cones(x, z)}`,
      );
    }
  assert.ok(nodes > 20000 && between > 2000, `${nodes} nodes, ${between} between`);
});

test('the ground stays 50 cm under every planned deck on the folk side', () => {
  const under = (x: number, z: number, deck: number, what: string, slack = 1e-4) => {
    const h = g.islandH(x, z);
    assert.ok(
      h <= deck - 0.5 + slack,
      `${what} at (${x.toFixed(2)}, ${z.toFixed(2)}): ground ${h.toFixed(5)}, deck ${deck}`,
    );
  };
  const L = RING_FORMATION;
  // The Pilgrims' Way, the hinge to the halt's north end, across the double formation.
  for (let u = RING_GAP.hinge / 100; u <= RING_HALT.u1 / 100 + 2; u += 0.5)
    for (let lat = L.left / 100; lat <= L.right / 100 + 1e-6; lat += 0.38) {
      const p = w(u, lat);
      under(p.x, p.z, ringDeckY(Math.round(u * 100)) / 100, `the Way, u ${u}`);
    }
  // The halt's platforms, 0.9 m over its deck.
  for (const [l0, l1] of [RING_HALT.upLat, RING_HALT.downLat])
    for (let u = RING_HALT.u0 / 100; u <= RING_HALT.u1 / 100; u += 0.5)
      for (let lat = l0 / 100; lat <= l1 / 100 + 1e-6; lat += 0.35) {
        const p = w(u, lat);
        under(p.x, p.z, RING_HALT.y / 100 + 0.9, `a halt platform, u ${u}`);
      }
  // The brace platform.
  const B = RING_BRACE_PLATFORM;
  for (let u = B.u0 / 100; u <= B.u1 / 100; u += 0.5)
    for (let lat = B.lat0 / 100; lat <= B.lat1 / 100; lat += 0.5) {
      const p = w(u, lat);
      under(p.x, p.z, B.y / 100, 'the brace platform');
    }
  // The run-off bed (R2d): both tracks level at the halt's 8.0 m from the halt's north end to the buffers, 50 cm over the
  // cutting (RING_END.cut), on a sweep of its rect and on every grid node inside it.
  const bed = RING_END.bed;
  for (let u = bed.u0 / 100; u <= RING_END.bufferU / 100 + 1e-6; u += 0.5)
    // to the faces: behind them the ground meets the end
    for (let lat = bed.lat0 / 100; lat <= bed.lat1 / 100 + 1e-6; lat += 0.38) {
      const p = w(u, lat);
      // Within a cell of the bed's side or end edge a 2 m triangle spans the notch's bank and can rise into the 50 cm slab;
      // it must stay under the slab's top (the ground never shows through the deck). Everywhere else the full 50 cm holds.
      const edge = Math.min(lat - bed.lat0 / 100, bed.lat1 / 100 - lat, bed.u1 / 100 - u) < g.cell;
      under(p.x, p.z, bed.y / 100, `the run-off bed, u ${u}`, edge ? 0.5 : 1e-4);
    }
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      const x = g.x0 + i * g.cell,
        z = g.z0 + j * g.cell;
      if (g.bedOut(x, z) === 0) under(x, z, bed.y / 100, 'a node under the bed');
    }
});

test('the cutting is at most 2 m deep and its banks stop short of the station house terrace', () => {
  // The terrace (the greybox's CONCOURSE, level with the platforms) grown by 1 m: its nodes are the uncapped ground
  // (the cones and the halt's fill), so the cutting's cap never reaches the house's hillside (Level finding 20).
  const t = CONCOURSE.terrace,
    grow = 1;
  let inside = 0;
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      const x = g.x0 + i * g.cell,
        z = g.z0 + j * g.cell,
        { u, lat } = ringUL(x, z);
      if (u < t.u0 - grow || u > t.u1 + grow || lat < t.lat0 - grow || lat > t.lat1 + grow) continue;
      inside++;
      const free = Math.max(g.cone(x, z), ISLAND_FILL.top - ISLAND_FILL.fall * g.fillOut(x, z));
      assert.ok(
        Math.abs(g.at(i, j) - free) < 1e-4,
        `terrace node (${u.toFixed(1)}, ${lat.toFixed(1)}): ${g.at(i, j)} against ${free}`,
      );
    }
  assert.ok(inside > 40, `${inside} nodes`);
  // The cutting: under the bed, the cone is cut by at most 1.5 m, and the banks (which rise 1 in 1.5 from the bed's
  // edge to the cone) never reach lat -8.5, the plan's bound.
  let deepest = 0,
    reach = 0;
  const bed = RING_END.bed;
  for (let j = 0; j < g.nz; j++)
    for (let i = 0; i < g.nx; i++) {
      const x = g.x0 + i * g.cell,
        z = g.z0 + j * g.cell,
        { u, lat } = ringUL(x, z);
      if (u < bed.u0 / 100 || g.fillOut(x, z) === 0) continue;
      const cut = g.cone(x, z) - g.at(i, j);
      if (cut > 1e-3) {
        deepest = Math.max(deepest, cut);
        reach = Math.min(reach, lat);
      }
    }
  assert.ok(deepest > 0.5 && deepest <= 2 + 0.05, `deepest cut ${deepest}`);
  assert.ok(reach >= -8.5, `the cutting reaches lat ${reach}`);
});
