// Ring Island's ground (src/entities/ring-island/ground.ts; docs/plans/ring-island-build1.md, step 2b): off the fills
// it is Place's cones (ringHeight) within 5 cm, and it stays 50 cm under every planned deck on the island's side.
import test from 'node:test';
import assert from 'node:assert/strict';
import { RING_CONES, ringHeight } from '../src/proto/greybox/ring-cones.ts';
import { FAR, ORIGIN } from '../src/proto/place/layout.ts';
import {
  RING_BRACE_PLATFORM,
  RING_FORMATION,
  RING_GAP,
  RING_HALT,
  RING_LOOP,
  ringAt,
  ringDeckY,
} from '../src/sim/railway-ring-layout.ts';
import { createIslandGround, ISLAND_BED, ringUL } from '../src/entities/ring-island/ground.ts';

const centre = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };
const g = createIslandGround(RING_CONES, centre);
/** ringHeight takes Place's local metres (x less ORIGIN.x). */
const cones = (x: number, z: number) => ringHeight(x - ORIGIN.x, z - ORIGIN.z);
const w = (u: number, lat: number) => {
  const p = ringAt(Math.round(u * 100), Math.round(lat * 100));
  return { x: p.x / 100, z: p.z / 100 };
};
/** Off the fills: well clear of the halt's fill and the loop's grade, and of their embankments' reach. */
const offFills = (x: number, z: number) => g.fillOut(x, z) > 25 && g.loopOut(x, z) > 25;

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
  const under = (x: number, z: number, deck: number, what: string) => {
    const h = g.islandH(x, z);
    assert.ok(
      h <= deck - 0.5 + 1e-6,
      `${what} at (${x.toFixed(2)}, ${z.toFixed(2)}): ground ${h.toFixed(2)}, deck ${deck}`,
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
  // The loop deck (5 m wide) and its neck (both tracks, 4.4 m wide) at the halt's 8.0 m.
  const cx = RING_LOOP.x / 100,
    cz = RING_LOOP.z / 100,
    r = RING_LOOP.r / 100,
    y = RING_HALT.y / 100;
  for (let a = 0; a < Math.PI * 2; a += 0.005)
    for (const dr of [-2.5, -1.25, 0, 1.25, 2.5])
      under(cx + Math.cos(a) * (r + dr), cz + Math.sin(a) * (r + dr), y, 'the loop');
  for (const [t, a] of [
    [L.tracks[1] / 100, Math.PI - 0.22],
    [L.tracks[0] / 100, Math.PI + 0.22],
  ] as const) {
    const from = w(RING_HALT.u1 / 100, t),
      mid = w(RING_HALT.u1 / 100 + 12, t),
      to = { x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r };
    for (const [p, q] of [
      [from, mid],
      [mid, to],
    ] as const)
      for (let k = 0; k <= 40; k++)
        for (const s of [-2.2, 0, 2.2]) {
          const f = k / 40,
            dx = q.z - p.z,
            dz = p.x - q.x,
            n = Math.hypot(dx, dz);
          under(p.x + (q.x - p.x) * f + (dx / n) * s, p.z + (q.z - p.z) * f + (dz / n) * s, y, 'the neck');
        }
  }
});
