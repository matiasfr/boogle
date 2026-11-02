// The land of ?proto=place: a height function baked onto one 2 m grid, drawn as one faceted mesh and collided as one
// heightfield. The gorge's walls are near-vertical cells of that grid, so nothing here overhangs; the footbridges and
// platforms are their own boxes. Trees have no colliders (greybox), and the spire's are a cylinder. Local.
import * as THREE from 'three/webgpu';
import { flat } from '../flat.ts';
import { scene } from '../../render/scene.ts';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { smoothstep } from '../../math.ts';
import {
  ARMS,
  GORGE,
  HEAP,
  LINES,
  LINKS,
  LOBE,
  ORIGIN,
  PATHS,
  SPIRE,
  VILLAGE,
  lineAt,
  railY,
  type LinePoint,
} from './layout.ts';

const CELL = 2,
  EXT = 260,
  N = (EXT * 2) / CELL + 1;
const heights = new Float32Array(N * N),
  pathMask = new Float32Array(N * N),
  clearMask = new Float32Array(N * N);
const at = (i: number, j: number) => i + j * N;
const cellX = (i: number) => -EXT + i * CELL;
const cellZ = (j: number) => -EXT + j * CELL;

// ---------------------------------------------------------------- the gorge
const rad = (d: number) => (d * Math.PI) / 180;
const ORG = { x: SPIRE.x, z: SPIRE.z };
function arm(bearing: number, phase: number) {
  const ax = Math.sin(rad(bearing)),
    az = -Math.cos(rad(bearing));
  const out: [number, number][] = [];
  for (let t = 0; t <= 330; t += 22) {
    const w = 5 * Math.sin(t * 0.035 + phase) * smoothstep(0, 40, t);
    out.push([ORG.x + ax * t - az * w, ORG.z + az * t + ax * w]);
  }
  return out;
}
const ARM_POLYS = [arm(ARMS.nw, 0.4), arm(ARMS.ne, 2.1), arm(ARMS.stem, 4)];
function gorgeD(x: number, z: number) {
  let best = Infinity;
  for (const poly of ARM_POLYS)
    for (let k = 0; k < poly.length - 1; k++) {
      const [ax, az] = poly[k]!,
        [bx, bz] = poly[k + 1]!;
      const dx = bx - ax,
        dz = bz - az,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      const qx = ax + dx * t - x,
        qz = az + dz * t - z,
        d = qx * qx + qz * qz;
      if (d < best) best = d;
    }
  return Math.sqrt(best);
}

// ---------------------------------------------------------------- the lobes
function ground(x: number, z: number) {
  const dx = x - ORG.x,
    dz = z - ORG.z,
    r = Math.hypot(dx, dz);
  const a = (Math.atan2(dx, -dz) * 180) / Math.PI;
  const north = a > ARMS.nw && a < ARMS.ne,
    west = !north && a > ARMS.stem && a < ARMS.nw;
  const angle = Math.atan2(dx, -dz);
  const R = (north ? 238 : 226) + 13 * Math.sin(3 * angle + 1) + 7 * Math.sin(7 * angle + 2);
  const shore = smoothstep(R, R - 46, r);
  let top = west ? LOBE.west : north ? LOBE.north : LOBE.east;
  if (north) top += 25 * Math.exp(-((x + 20) ** 2 + (z + 188) ** 2) / (38 * 38));
  const noise =
    0.8 * Math.sin(x * 0.05 + 1) * Math.cos(z * 0.06) +
    0.5 * Math.sin(x * 0.13 + z * 0.09) +
    0.3 * Math.cos(x * 0.31 - z * 0.23);
  const beach = -5 + (top + 5) * smoothstep(0, 1, shore);
  let h = beach + noise * shore;
  // the gorge
  const w = 1 + 0.1 * Math.sin(x * 0.07 + z * 0.05);
  const d = gorgeD(x, z) / w;
  const floor = GORGE.bed + (GORGE.floor - GORGE.bed) * smoothstep(GORGE.river, GORGE.river + 3.5, d);
  const wall = smoothstep(GORGE.bank, GORGE.bank + GORGE.wall, d);
  h = Math.min(h, floor + (Math.max(h, floor) - floor) * wall);
  // the spire's islet
  const dc = Math.hypot(dx, dz);
  if (dc < 22) h = Math.max(h, 4 * smoothstep(22, 12, dc));
  return h;
}

/** Pulls the ground toward y within a soft disc. */
function pad(x0: number, z0: number, y: number, r: number, soft: number) {
  const i0 = Math.max(0, Math.floor((x0 - r - soft + EXT) / CELL)),
    i1 = Math.min(N - 1, Math.ceil((x0 + r + soft + EXT) / CELL)),
    j0 = Math.max(0, Math.floor((z0 - r - soft + EXT) / CELL)),
    j1 = Math.min(N - 1, Math.ceil((z0 + r + soft + EXT) / CELL));
  for (let j = j0; j <= j1; j++)
    for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(cellX(i) - x0, cellZ(j) - z0);
      if (gorgeD(cellX(i), cellZ(j)) < GORGE.bank + GORGE.wall + 4) continue;
      const t = smoothstep(r + soft, r, d);
      heights[at(i, j)] = heights[at(i, j)]! + (y - heights[at(i, j)]!) * t;
      clearMask[at(i, j)] = Math.max(clearMask[at(i, j)]!, t);
    }
}

/** Rasterises a strip along samples [x, z, y]: within `inner` it is y, fading to the land by `outer`. */
function strip(
  samples: [number, number, number][],
  inner: number,
  outer: number,
  painted: boolean,
  skip?: (x: number, z: number) => boolean,
) {
  const best = new Map<number, [number, number]>();
  const cells = Math.ceil(outer / CELL) + 1;
  for (const [x, z, y] of samples) {
    const ci = Math.round((x + EXT) / CELL),
      cj = Math.round((z + EXT) / CELL);
    for (let j = Math.max(0, cj - cells); j <= Math.min(N - 1, cj + cells); j++)
      for (let i = Math.max(0, ci - cells); i <= Math.min(N - 1, ci + cells); i++) {
        const d = Math.hypot(cellX(i) - x, cellZ(j) - z);
        if (d > outer) continue;
        const k = at(i, j),
          b = best.get(k);
        if (!b || d < b[0]) best.set(k, [d, y]);
      }
  }
  for (const [k, [d, y]] of best) {
    const i = k % N,
      j = Math.floor(k / N);
    if (skip?.(cellX(i), cellZ(j))) continue;
    const t = smoothstep(outer, inner, d);
    heights[k] = heights[k]! + (y - heights[k]!) * t;
    clearMask[k] = Math.max(clearMask[k]!, t);
    if (painted) pathMask[k] = Math.max(pathMask[k]!, smoothstep(inner + 1, inner - 0.5, d));
  }
}

/** One path's samples every metre, in order, with its total. Bridges are left out of the ground. */
export const PATH_SAMPLES: [number, number, number][][] = PATHS.map((p) => {
  const out: [number, number, number][] = [];
  p.pts.slice(0, -1).forEach((a, k) => {
    const b = p.pts[k + 1]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let n = 0; n < Math.ceil(len); n++) {
      const t = n / Math.ceil(len);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  });
  return out;
});

function bake() {
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) heights[at(i, j)] = ground(cellX(i), cellZ(j));
  pad(VILLAGE.x, VILLAGE.z, VILLAGE.y, VILLAGE.r, 18);
  for (const l of LINKS) pad(l.camp.x, l.camp.z, l.camp.y, 34, 22);
  pad(HEAP.x, HEAP.z, VILLAGE.y, 26, 10);
  // Rail on the land: a cutting or low bank along it, none in the gorge (that's what the trestle's for).
  const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  for (const line of Object.values(LINES)) {
    const samples: [number, number, number][] = [];
    for (let s = -12; s <= line.len + 8; s += 1) {
      lineAt(line, s, P);
      samples.push([P.x, P.z, railY(line, s) - 0.35]);
    }
    strip(samples, 5, 9, false, (x, z) => gorgeD(x, z) < GORGE.bank + GORGE.wall + 2);
  }
  // Paths last: they cut their ramps into the walls and fill across whatever they meet.
  PATHS.forEach((p) => {
    const samples: [number, number, number][] = [];
    p.pts.slice(0, -1).forEach((a, k) => {
      if (k === p.bridgeAt) return;
      const b = p.pts[k + 1]!;
      const len = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
      for (let m = 0; m <= len; m++) {
        const t = m / len;
        samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
      }
    });
    strip(samples, 2.6, 5.2, true);
  });
}
bake();

/** The land's height at a world point. */
export function H(wx: number, wz: number) {
  const fx = (wx - ORIGIN.x + EXT) / CELL,
    fz = (wz - ORIGIN.z + EXT) / CELL;
  if (fx < 0 || fz < 0 || fx >= N - 1 || fz >= N - 1) return -6;
  const i = Math.floor(fx),
    j = Math.floor(fz),
    u = fx - i,
    v = fz - j;
  const a = heights[at(i, j)]!,
    b = heights[at(i + 1, j)]!,
    c = heights[at(i, j + 1)]!,
    d = heights[at(i + 1, j + 1)]!;
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
export const insidePlace = (wx: number, wz: number) =>
  Math.abs(wx - ORIGIN.x) < EXT - 4 && Math.abs(wz - ORIGIN.z) < EXT - 4;

// ---------------------------------------------------------------- the mesh and the heightfield
const FLAT = (color: string) => flat(color);

function buildMesh() {
  const pos = new Float32Array(N * N * 3),
    col = new Float32Array(N * N * 3);
  const c = new THREE.Color();
  const SAND = new THREE.Color('#e8d39a'),
    GRASS = new THREE.Color('#79b84a'),
    GRASS2 = new THREE.Color('#5ea241'),
    ROCK = new THREE.Color('#a08a70'),
    ROCK_LOW = new THREE.Color('#6d6f78'),
    DIRT = new THREE.Color('#cfa767'),
    BANK = new THREE.Color('#8e9a78');
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const k = at(i, j),
        h = heights[k]!,
        x = cellX(i),
        z = cellZ(j);
      pos.set([x + ORIGIN.x, h, z + ORIGIN.z], k * 3);
      const hx = heights[at(Math.min(N - 1, i + 1), j)]! - heights[at(Math.max(0, i - 1), j)]!,
        hz = heights[at(i, Math.min(N - 1, j + 1))]! - heights[at(i, Math.max(0, j - 1))]!;
      const slope = Math.hypot(hx, hz) / (2 * CELL);
      c.copy(GRASS).lerp(
        GRASS2,
        0.5 + 0.25 * Math.sin(x * 0.023 + 1) * Math.cos(z * 0.031) + 0.25 * Math.sin(x * 0.071 - z * 0.053),
      );
      if (h < 3.2) c.lerp(gorgeD(x, z) < 18 ? BANK : SAND, smoothstep(3.2, 1.6, h));
      c.lerp(h < 9 ? ROCK_LOW : ROCK, smoothstep(0.55, 1.1, slope));
      c.lerp(DIRT, pathMask[k]! * 0.92);
      col.set([c.r, c.g, c.b], k * 3);
    }
  const idx: number[] = [];
  for (let j = 0; j < N - 1; j++)
    for (let i = 0; i < N - 1; i++) {
      const a = at(i, j),
        b = at(i + 1, j),
        c0 = at(i, j + 1),
        d = at(i + 1, j + 1);
      if (Math.max(heights[a]!, heights[b]!, heights[c0]!, heights[d]!) < -3.5) continue;
      idx.push(a, c0, b, b, c0, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
  );
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);

  // heights[i][j]: i steps +x, j steps -z, from the body's position.
  const hf: number[][] = [];
  for (let i = 0; i < N; i++) {
    const col2: number[] = [];
    for (let j = 0; j < N; j++) col2.push(heights[at(i, N - 1 - j)]!);
    hf.push(col2);
  }
  addStatic({ kind: 'heightfield', heights: hf, cell: CELL }, { x: ORIGIN.x - EXT, y: 0, z: ORIGIN.z + EXT });
}

export function addStatic(shape: Shape, position: { x: number; y: number; z: number }, rotation?: THREE.Quaternion) {
  addBody(
    createBody({
      material: groundMat,
      group: GROUP.SCENERY,
      position,
      ...(rotation ? { rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w } } : {}),
      shapes: [shape],
    }),
  );
}

/** A solid box between two world points, top at y. */
export function plank(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  topA: number,
  topB: number,
  width: number,
  color: string,
  thick = 0.3,
) {
  const mx = (ax + bx) / 2,
    mz = (az + bz) / 2,
    dx = bx - ax,
    dz = bz - az,
    dy = topB - topA,
    len = Math.hypot(dx, dz),
    full = Math.hypot(len, dy);
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(dy, len), Math.atan2(dx, dz), 0, 'YXZ'));
  const c = { x: mx, y: (topA + topB) / 2 - thick / 2, z: mz };
  addStatic({ kind: 'box', hx: width / 2, hy: thick / 2, hz: full / 2 }, c, q);
  const m = new THREE.Mesh(new THREE.BoxGeometry(width, thick, full), FLAT(color));
  m.position.set(c.x, c.y, c.z);
  m.quaternion.copy(q);
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  return m;
}

// ---------------------------------------------------------------- the spire: Needle Bell, 105 m, the address of the place
function buildSpire() {
  const X = SPIRE.x + ORIGIN.x,
    Z = SPIRE.z + ORIGIN.z;
  const ROCK = '#8c8478',
    ROCK2 = '#a2978a';
  // Stacked, leaning drums: lopsided on purpose, so it reads as rock and not a tower.
  const drums: [r0: number, r1: number, h: number, dx: number, dz: number, color: string][] = [
    [11, 7, 26, 0, 0, ROCK],
    [7.4, 5, 26, 1.5, -1, ROCK2],
    [5.4, 3.6, 24, 3.5, -2, ROCK],
    [4, 2.4, 20, 6, -2, ROCK2],
    [2.6, 1.3, 11, 8, -1, ROCK],
  ];
  let y = 0;
  for (const [r0, r1, h, dx, dz, color] of drums) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 7, 1), FLAT(color));
    m.position.set(X + dx, y + h / 2, Z + dz);
    m.rotation.y = y * 0.7;
    m.castShadow = true;
    scene.add(m);
    y += h - 0.5;
  }
  // The lookout and the orange vane that say "that one" from every lobe.
  const top = y;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(6, 0.6, 6), FLAT('#7f5630'));
  deck.position.set(X + 8, top - 2.4, Z - 1);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), FLAT('#3a302c'));
  mast.position.set(X + 8, top + 2, Z - 1);
  const vane = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 0.25), FLAT('#f0752c'));
  vane.position.set(X + 9.6, top + 4.4, Z - 1);
  scene.add(deck, mast, vane);
  addStatic({ kind: 'cylinder', rTop: 5, rBottom: 11, h: 50, segments: 8 }, { x: X, y: 25, z: Z });
}

// ---------------------------------------------------------------- footbridges, trees, a few places to stop at
function buildBridges() {
  for (const p of PATHS) {
    const a = p.pts[p.bridgeAt]!,
      b = p.pts[p.bridgeAt + 1]!;
    const ax = a[0] + ORIGIN.x,
      az = a[1] + ORIGIN.z,
      bx = b[0] + ORIGIN.x,
      bz = b[1] + ORIGIN.z;
    plank(ax, az, bx, bz, a[2] + 0.12, b[2] + 0.12, 3, '#c08a4c', 0.35);
    // Posts and rails, drawn only: it's low, and falling in is fine.
    const len = Math.hypot(bx - ax, bz - az),
      ux = (bx - ax) / len,
      uz = (bz - az) / len;
    for (const side of [-1, 1]) {
      for (let s = 0; s <= len; s += 3.6) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), FLAT('#7f5630'));
        post.position.set(ax + ux * s - uz * side * 1.45, a[2] + 0.65, az + uz * s + ux * side * 1.45);
        scene.add(post);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, len), FLAT('#7f5630'));
      rail.position.set((ax + bx) / 2 - uz * side * 1.45, a[2] + 1.15, (az + bz) / 2 + ux * side * 1.45);
      rail.rotation.y = Math.atan2(ux, uz);
      scene.add(rail);
    }
  }
}

function buildTrees() {
  const rng = mulberry32(31);
  const pose = new THREE.Object3D();
  const spots: { x: number; y: number; z: number; s: number }[] = [];
  for (let n = 0; n < 2600 && spots.length < 340; n++) {
    const x = (rng() * 2 - 1) * (EXT - 12),
      z = (rng() * 2 - 1) * (EXT - 12);
    const i = Math.round((x + EXT) / CELL),
      j = Math.round((z + EXT) / CELL),
      h = heights[at(i, j)]!;
    if (h < 4 || clearMask[at(i, j)]! > 0.05 || gorgeD(x, z) < 21) continue;
    if (Math.hypot(x - SPIRE.x, z - SPIRE.z) < 30) continue;
    // Groves, not a scatter: a slow field thins most of the land out, and the ridge is the densest.
    const grove = Math.sin(x * 0.036 + 1.2) * Math.cos(z * 0.041 - 0.4) + (z < -100 ? 0.8 : 0);
    if (grove < 0.15 + rng() * 0.25) continue;
    spots.push({ x, y: h, z, s: 0.8 + rng() * 0.7 });
  }
  const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(2.6, 6.5, 6), FLAT('#3f8a3a'), spots.length);
  const crown2 = new THREE.InstancedMesh(new THREE.ConeGeometry(1.9, 4.6, 6), FLAT('#4f9c44'), spots.length);
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.42, 3, 5), FLAT('#6e4c2a'), spots.length);
  spots.forEach((t, k) => {
    pose.position.set(t.x + ORIGIN.x, t.y + 1.5 * t.s, t.z + ORIGIN.z);
    pose.scale.setScalar(t.s);
    pose.rotation.y = k;
    pose.updateMatrix();
    trunk.setMatrixAt(k, pose.matrix);
    pose.position.y = t.y + 5.4 * t.s;
    pose.updateMatrix();
    crown.setMatrixAt(k, pose.matrix);
    pose.position.y = t.y + 8.2 * t.s;
    pose.updateMatrix();
    crown2.setMatrixAt(k, pose.matrix);
  });
  for (const m of [crown, crown2, trunk]) {
    m.castShadow = true;
    m.frustumCulled = false;
    scene.add(m);
  }
}

export function buildLand() {
  buildMesh();
  buildSpire();
  buildBridges();
  buildTrees();
}
