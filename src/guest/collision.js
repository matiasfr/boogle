// What the guest stands on and bumps into: the island's terrain and every static physics body (the lighthouse, the
// windmills, rocks, trees, the caves), as triangles around him in engine units, built from the shape descriptions the
// physics facade keeps (src/physics/engine.ts, forEachStatic), so it works on any physics backend. Collision groups follow the player body's
// mask, so the caves swap the ground for their own colliders just as they do for the normal player.
import { CELL, HALF, GRID_RES } from '../constants.ts';
import { heights } from '../adapters/terrain.js';
import { GROUP } from '../physics/physics.js';
import { forEachStatic } from '../physics/engine.ts';

export const UNITS = 100; // engine units per metre
const REACH = 5; // metres around the guest, every height
const BUCKET = 4; // metres per side of the grid big bodies' triangles are filed in

const cache = new WeakMap(); // body -> { shapes, tris: Float32Array (9 per triangle, world metres), buckets, bounds }

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
    return [(x / l) * r, (y / l) * r, (z / l) * r];
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
function boxMesh(hx, hy, hz) {
  const vertices = [];
  for (const x of [-hx, hx]) for (const y of [-hy, hy]) for (const z of [-hz, hz]) vertices.push([x, y, z]);
  // vertex index = 4*xi + 2*yi + zi
  const faces = [
    [0, 1, 3, 2],
    [4, 6, 7, 5],
    [0, 4, 5, 1],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 5, 7, 3],
  ];
  return { vertices, faces };
}
// Along y, like the physics cylinders: n sides, a top and a bottom.
function cylinderMesh(rTop, rBottom, h, n) {
  const vertices = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    vertices.push(
      [Math.cos(a) * rBottom, -h / 2, Math.sin(a) * rBottom],
      [Math.cos(a) * rTop, h / 2, Math.sin(a) * rTop],
    );
  }
  const faces = [];
  for (let k = 0; k < n; k++) faces.push([2 * k, 2 * ((k + 1) % n), 2 * ((k + 1) % n) + 1, 2 * k + 1]);
  faces.push(Array.from({ length: n }, (_, k) => 2 * k + 1));
  faces.push(Array.from({ length: n }, (_, k) => 2 * (n - 1 - k)));
  return { vertices, faces };
}

// Rotates [x, y, z] by quaternion q ({ x, y, z, w }), in place.
function rotate(q, p) {
  const [x, y, z] = p;
  const tx = 2 * (q.y * z - q.z * y),
    ty = 2 * (q.z * x - q.x * z),
    tz = 2 * (q.x * y - q.y * x);
  p[0] = x + q.w * tx + (q.y * tz - q.z * ty);
  p[1] = y + q.w * ty + (q.z * tx - q.x * tz);
  p[2] = z + q.w * tz + (q.x * ty - q.y * tx);
  return p;
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Convex shapes are fanned and wound to face outwards; trimeshes keep their own winding.
function shapeTriangles(shape, out, place) {
  if (shape.kind === 'trimesh') {
    const v = shape.vertices,
      idx = shape.indices;
    for (let i = 0; i < idx.length; i++) out.push(...place([v[idx[i] * 3], v[idx[i] * 3 + 1], v[idx[i] * 3 + 2]]));
    return;
  }
  const poly =
    shape.kind === 'sphere'
      ? sphereMesh(shape.r)
      : shape.kind === 'box'
        ? boxMesh(shape.hx, shape.hy, shape.hz)
        : shape.kind === 'cylinder'
          ? cylinderMesh(shape.rTop, shape.rBottom, shape.h, shape.segments)
          : null;
  if (!poly) return;
  const c = [0, 0, 0];
  for (const p of poly.vertices) for (let k = 0; k < 3; k++) c[k] += p[k] / poly.vertices.length;
  for (const face of poly.faces) {
    const a = poly.vertices[face[0]];
    for (let k = 1; k + 1 < face.length; k++) {
      let b = poly.vertices[face[k]],
        d = poly.vertices[face[k + 1]];
      if (dot(cross(sub(b, a), sub(d, b)), sub(a, c)) < 0) [b, d] = [d, b];
      for (const p of [a, b, d]) out.push(...place([...p]));
    }
  }
}

function bodyTriangles(body, shapes) {
  let entry = cache.get(body);
  if (entry && entry.shapes === shapes) return entry; // a growing mushroom gets new shapes: rebuild
  const out = [];
  for (const shape of shapes) {
    const off = shape.offset ?? { x: 0, y: 0, z: 0 };
    const place = (p) => {
      if (shape.rotation) rotate(shape.rotation, p);
      p[0] += off.x;
      p[1] += off.y;
      p[2] += off.z;
      rotate(body.quaternion, p);
      return [p[0] + body.position.x, p[1] + body.position.y, p[2] + body.position.z];
    };
    shapeTriangles(shape, out, place);
  }
  const tris = new Float32Array(out);
  const bounds = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  for (let t = 0; t < tris.length; t += 3) {
    bounds.x0 = Math.min(bounds.x0, tris[t]);
    bounds.x1 = Math.max(bounds.x1, tris[t]);
    bounds.z0 = Math.min(bounds.z0, tris[t + 2]);
    bounds.z1 = Math.max(bounds.z1, tris[t + 2]);
  }
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
  entry = { shapes, tris, buckets, bounds };
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

  forEachStatic(mask, (body, shapes) => {
    if (shapes.some((sh) => sh.kind === 'heightfield')) return; // the terrain, done above from the height grid
    const { tris, buckets, bounds: bb } = bodyTriangles(body, shapes);
    if (bb.x1 < x0 || bb.x0 > x1 || bb.z1 < z0 || bb.z0 > z1) return;
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
      return;
    }
    const seen = new Set();
    for (let bx = Math.floor(x0 / BUCKET); bx <= Math.floor(x1 / BUCKET); bx++)
      for (let bz = Math.floor(z0 / BUCKET); bz <= Math.floor(z1 / BUCKET); bz++)
        for (const t of buckets.get((bx + 512) * 1024 + bz + 512) ?? []) {
          if (seen.has(t)) continue;
          seen.add(t);
          take(t);
        }
  });
  return n;
}
