// What the guest stands on and bumps into: the island's terrain and every static cannon-es body (the lighthouse, the
// windmills, rocks, trees, the caves), as triangles around him in engine units. Collision groups follow the player body's
// mask, so the caves swap the ground for their own colliders just as they do for the normal player.
import * as CANNON from 'cannon-es';
import { CELL, HALF, GRID_RES } from '../constants.js';
import { heights } from '../adapters/terrain.js';
import { world, GROUP } from '../physics/physics.js';

export const UNITS = 100; // engine units per metre
const REACH = 5; // metres around the guest, every height
const BUCKET = 4; // metres per side of the grid big bodies' triangles are filed in

const tmp = new CANNON.Vec3();
const cache = new WeakMap(); // body -> { tris: Float32Array (9 per triangle, world metres), buckets: Map | null }

function sphereMesh(r) {
  const t = (1 + Math.sqrt(5)) / 2;
  const v = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return new CANNON.Vec3((x / l) * r, (y / l) * r, (z / l) * r);
  });
  const f = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  return { vertices: v, faces: f };
}

// Convex shapes are fanned and wound to face outwards; trimeshes keep their own winding.
function shapeTriangles(shape, out, place) {
  if (shape instanceof CANNON.Trimesh) {
    const v = shape.vertices,
      idx = shape.indices;
    for (let i = 0; i < idx.length; i += 3) {
      for (const k of [idx[i], idx[i + 1], idx[i + 2]])
        out.push(...place(tmp.set(v[k * 3], v[k * 3 + 1], v[k * 3 + 2])));
    }
    return;
  }
  const poly =
    shape instanceof CANNON.Sphere
      ? sphereMesh(shape.radius)
      : shape instanceof CANNON.Box
        ? shape.convexPolyhedronRepresentation
        : shape instanceof CANNON.ConvexPolyhedron
          ? shape
          : null;
  if (!poly) return;
  const c = new CANNON.Vec3();
  for (const p of poly.vertices) c.vadd(p, c);
  c.scale(1 / poly.vertices.length, c);
  for (const face of poly.faces) {
    const a = poly.vertices[face[0]];
    for (let k = 1; k + 1 < face.length; k++) {
      let b = poly.vertices[face[k]],
        d = poly.vertices[face[k + 1]];
      const n = b.vsub(a).cross(d.vsub(b));
      if (n.dot(a.vsub(c)) < 0) [b, d] = [d, b];
      for (const p of [a, b, d]) out.push(...place(p));
    }
  }
}

function bodyTriangles(body) {
  let entry = cache.get(body);
  if (entry) return entry;
  const out = [];
  body.shapes.forEach((shape, i) => {
    const off = body.shapeOffsets[i],
      rot = body.shapeOrientations[i];
    const place = (p) => {
      const local = rot.vmult(p).vadd(off);
      const w = body.quaternion.vmult(local).vadd(body.position);
      return [w.x, w.y, w.z];
    };
    shapeTriangles(shape, out, place);
  });
  const tris = new Float32Array(out);
  let buckets = null;
  if (tris.length > 9 * 64) {
    buckets = new Map();
    for (let t = 0; t < tris.length; t += 9) {
      const xs = [tris[t], tris[t + 3], tris[t + 6]],
        zs = [tris[t + 2], tris[t + 5], tris[t + 8]];
      for (let bx = Math.floor(Math.min(...xs) / BUCKET); bx <= Math.floor(Math.max(...xs) / BUCKET); bx++)
        for (let bz = Math.floor(Math.min(...zs) / BUCKET); bz <= Math.floor(Math.max(...zs) / BUCKET); bz++) {
          const key = (bx + 512) * 1024 + bz + 512;
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key).push(t);
        }
    }
  }
  entry = { tris, buckets };
  cache.set(body, entry);
  return entry;
}

// Fills sim.surfaces with the triangles within REACH of (x, z) in metres, relative to the frame origin (ox, oz), and
// returns how many there are.
export function gatherSurfaces(sim, x, z, ox, oz, mask) {
  const out = sim.surfaces;
  const max = sim.capacity;
  let n = 0;
  const add = (ax, ay, az, bx, by, bz, cx, cy, cz) => {
    if (n >= max) return;
    const o = n++ * 10;
    out[o] = (ax - ox) * UNITS;
    out[o + 1] = ay * UNITS;
    out[o + 2] = (az - oz) * UNITS;
    out[o + 3] = (bx - ox) * UNITS;
    out[o + 4] = by * UNITS;
    out[o + 5] = (bz - oz) * UNITS;
    out[o + 6] = (cx - ox) * UNITS;
    out[o + 7] = cy * UNITS;
    out[o + 8] = (cz - oz) * UNITS;
    out[o + 9] = 0;
  };
  const x0 = x - REACH,
    x1 = x + REACH,
    z0 = z - REACH,
    z1 = z + REACH;

  if (mask & GROUP.SCENERY) {
    // heights[i][j] sits at x = i*CELL - HALF, z = HALF - j*CELL; both triangles of a cell face up.
    const i0 = Math.max(0, Math.floor((x0 + HALF) / CELL)),
      i1 = Math.min(GRID_RES - 2, Math.floor((x1 + HALF) / CELL));
    const j0 = Math.max(0, Math.floor((HALF - z1) / CELL)),
      j1 = Math.min(GRID_RES - 2, Math.floor((HALF - z0) / CELL));
    for (let i = i0; i <= i1; i++) {
      const xa = i * CELL - HALF,
        xb = xa + CELL;
      for (let j = j0; j <= j1; j++) {
        const za = HALF - j * CELL,
          zb = za - CELL;
        const h00 = heights[i][j],
          h10 = heights[i + 1][j],
          h01 = heights[i][j + 1],
          h11 = heights[i + 1][j + 1];
        add(xa, h00, za, xb, h10, za, xa, h01, zb);
        add(xb, h10, za, xb, h11, zb, xa, h01, zb);
      }
    }
  }

  for (const body of world.bodies) {
    if (body.type !== CANNON.Body.STATIC || !(body.collisionFilterGroup & mask)) continue;
    if (body.shapes.some((s) => s instanceof CANNON.Heightfield)) continue;
    if (body.aabbNeedsUpdate) body.updateAABB();
    const bb = body.aabb;
    if (bb.upperBound.x < x0 || bb.lowerBound.x > x1 || bb.upperBound.z < z0 || bb.lowerBound.z > z1) continue;
    const { tris, buckets } = bodyTriangles(body);
    const take = (t) => {
      const ax = tris[t],
        bx = tris[t + 3],
        cx = tris[t + 6],
        az = tris[t + 2],
        bz = tris[t + 5],
        cz = tris[t + 8];
      if (Math.max(ax, bx, cx) < x0 || Math.min(ax, bx, cx) > x1) return;
      if (Math.max(az, bz, cz) < z0 || Math.min(az, bz, cz) > z1) return;
      add(ax, tris[t + 1], az, bx, tris[t + 4], bz, cx, tris[t + 7], cz);
    };
    if (!buckets) {
      for (let t = 0; t < tris.length; t += 9) take(t);
      continue;
    }
    const seen = new Set();
    for (let bx = Math.floor(x0 / BUCKET); bx <= Math.floor(x1 / BUCKET); bx++)
      for (let bz = Math.floor(z0 / BUCKET); bz <= Math.floor(z1 / BUCKET); bz++)
        for (const t of buckets.get((bx + 512) * 1024 + bz + 512) ?? []) {
          if (seen.has(t)) continue;
          seen.add(t);
          take(t);
        }
  }
  return n;
}
