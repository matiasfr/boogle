// Procedural museum exhibits; authored records select each object, the view alone updates live state.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { abs, float, mix, normalView, positionWorld, sin, time, uv, vertexColor } from 'three/tsl';
import { smoothstep } from '../../math.ts';
import { readableGlow, readableUnlit } from '../../render/readable-unlit.ts';
import { GRID } from '../../place/layout.ts';
import { pathMask, heights, at as cellAt, NX, NZ, cellX, cellZ, gorgeD } from '../../place/terrain.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { softGlow } from '../../place/look.ts';
import { registerBuilder } from '../builders.ts';
import type { JsonObject } from '../types.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'town.museum-exhibit': true;
  }
}
const TABLE = { x: 0, z: 1.05, w: 6.0, d: 4.0, top: 1.0 };
const SPEC = { x: 0, z: -3.75 };
// ---------------------------------------------------------------- the specimen's making
function jitter(g: THREE.BufferGeometry, amount: number) {
  const p = g.getAttribute('position');
  for (let k = 0; k < p.count; k++) {
    const x = p.getX(k),
      y = p.getY(k),
      z = p.getZ(k);
    // Same point, same push: seams stay shut.
    const n = Math.sin(x * 7.3 + y * 3.1) * Math.cos(z * 6.1 - y * 4.7) + 0.6 * Math.sin(x * 13.1 - z * 11.3);
    const f = 1 + n * amount;
    p.setXYZ(k, x * f, y * f, z * f);
  }
  return g;
}
const paint = (g: THREE.BufferGeometry, fn: (x: number, y: number, z: number, out: THREE.Color) => void) => {
  const p = g.getAttribute('position'),
    col = new Float32Array(p.count * 3),
    c = new THREE.Color();
  for (let k = 0; k < p.count; k++) {
    fn(p.getX(k), p.getY(k), p.getZ(k), c);
    col.set([c.r, c.g, c.b], k * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
};
const R = 1.42;
const ROCK_A = new THREE.Color('#57524a'),
  ROCK_B = new THREE.Color('#3d3a35');
function halfShell() {
  const g = jitter(new THREE.SphereGeometry(R, 14, 10, Math.PI, Math.PI).toNonIndexed(), 0.05);
  return paint(g, (x, y, z, c) => {
    c.copy(ROCK_A).lerp(ROCK_B, 0.5 + 0.5 * Math.sin(x * 5 + y * 4 + z * 3));
  });
}
/** The cut face's rim: bands of agate round the edge. */
function rim() {
  const g = new THREE.RingGeometry(R * 0.72, R * 1.02, 22, 5).toNonIndexed();
  jitter(g, 0.035);
  const a = new THREE.Color('#e9e4f5'),
    b = new THREE.Color('#6c5bb0'),
    e = new THREE.Color('#3b2f73');
  paint(g, (x, y, _z, c) => {
    const q = (Math.hypot(x, y) / R - 0.72) / 0.3;
    c.copy(Math.sin(q * 18) > 0 ? a : b).lerp(e, smoothstep(0.7, 1, q));
  });
  // The ring's plane is z = 0, which is where the cut is.
  return g;
}
const CRYSTAL = {
  deep: new THREE.Color('#1c3dbb'),
  mid: new THREE.Color('#3f8ee0'),
  tip: new THREE.Color('#8fe0ff'),
  warm: new THREE.Color('#9a6bff'),
};
function liningOf(count: number, rng: () => number) {
  const out: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    from = new THREE.Vector3(0, 1, 0),
    n = new THREE.Vector3(),
    pos = new THREE.Vector3();
  for (let k = 0; k < count; k++) {
    // On the inside of the back half of a ball, pointing in.
    const u = rng() * 2 - 1,
      a = rng() * Math.PI * 2,
      s = Math.sqrt(1 - u * u);
    n.set(s * Math.cos(a), u, -Math.abs(s * Math.sin(a)) - 0.02).normalize();
    const big = rng();
    const len = 0.32 + big * big * 0.95,
      rad = 0.07 + big * 0.14;
    pos.copy(n).multiplyScalar(R * 0.98 - len / 2);
    const g = new THREE.ConeGeometry(rad, len, 5, 1).toNonIndexed();
    // Pointing at the middle, with a little scatter.
    n.negate();
    n.x += (rng() - 0.5) * 0.4;
    n.y += (rng() - 0.5) * 0.4;
    n.normalize();
    q.setFromUnitVectors(from, n);
    m.compose(pos, q, new THREE.Vector3(1, 1, 1));
    const tone = rng();
    paint(g, (_x, y, _z, c) => {
      const t = y / len + 0.5;
      c.copy(tone < 0.16 ? CRYSTAL.warm : CRYSTAL.deep)
        .lerp(CRYSTAL.mid, t)
        .lerp(CRYSTAL.tip, t * t * t);
    });
    g.applyMatrix4(m);
    out.push(g);
  }
  return mergeGeometries(out)!;
}
// Shared materials, built once whoever mounts the museum (owned-view: shared materials stay with their caches).
const rockMat = new THREE.MeshStandardNodeMaterial({
  vertexColors: true,
  roughness: 0.95,
  flatShading: true,
  side: THREE.DoubleSide,
});
const crystalMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.28, flatShading: true });
{
  // Light going slowly up through it: built once, and it runs on the clock.
  const band = sin(positionWorld.y.mul(2.4).sub(time.mul(0.8)))
    .mul(0.5)
    .add(0.5);
  crystalMat.emissiveNode = vertexColor().mul(mix(float(0.22), float(1.5), band.mul(band).mul(band)));
  readableGlow(crystalMat);
}
const coreMat = readableGlow(
  new THREE.MeshStandardNodeMaterial({
    color: '#bff1ff',
    emissive: '#6fc8ff',
    emissiveIntensity: 3,
    flatShading: true,
  }),
);
const hazeMat = softGlow('#4fa8ff', 0.1).mat;
// A pool of its light on the floor, and up the screen behind.
const poolMat = readableUnlit(
  new THREE.MeshBasicNodeMaterial({
    color: '#3f8ee0',
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
{
  const f = float(1).sub(uv().sub(0.5).length().mul(2)).clamp(0, 1);
  poolMat.opacityNode = f.mul(f).mul(0.75).mul(abs(normalView.z));
}
const landMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.92, flatShading: true });
const bitsMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.7 });

// ---------------------------------------------------------------- the miniature's land
const SCALE = 1 / 120,
  UP = SCALE * 1.5;
const SPAN = { x0: -220, x1: 480, z0: -238, z1: 222 };
const toTableX = (x: number) => (x - (SPAN.x0 + SPAN.x1) / 2) * SCALE + TABLE.x;
const toTableZ = (z: number) => (z - (SPAN.z0 + SPAN.z1) / 2) * SCALE + TABLE.z;
const seaY = TABLE.top + 0.012;
const tableY = (h: number) => seaY + Math.max(0, h) * UP;
function relief() {
  const every = 3; // cells of the land's 2 m grid
  const i0 = Math.max(0, Math.round((SPAN.x0 - GRID.x0) / GRID.cell)),
    i1 = Math.min(NX - 1, Math.round((SPAN.x1 - GRID.x0) / GRID.cell)),
    j0 = Math.max(0, Math.round((SPAN.z0 - GRID.z0) / GRID.cell)),
    j1 = Math.min(NZ - 1, Math.round((SPAN.z1 - GRID.z0) / GRID.cell));
  const cols = Math.floor((i1 - i0) / every) + 1,
    rows = Math.floor((j1 - j0) / every) + 1;
  const pos = new Float32Array(cols * rows * 3),
    col = new Float32Array(cols * rows * 3),
    index: number[] = [];
  const c = new THREE.Color();
  const GRASS = new THREE.Color('#6c9a42'),
    GRASS2 = new THREE.Color('#568740'),
    ROCK_ = new THREE.Color('#a08a70'),
    SAND = new THREE.Color('#e8d39a'),
    DIRT = new THREE.Color('#e0b271'),
    SEA = new THREE.Color('#2e7fb8');
  for (let b = 0; b < rows; b++)
    for (let a = 0; a < cols; a++) {
      const i = i0 + a * every,
        j = j0 + b * every,
        k = cellAt(i, j),
        h = heights[k]!,
        x = cellX(i),
        z = cellZ(j);
      const n = a + b * cols;
      pos.set([toTableX(x), tableY(h), toTableZ(z)], n * 3);
      const slope = Math.abs(heights[cellAt(Math.min(NX - 1, i + every), j)]! - h) / (every * GRID.cell);
      c.copy(GRASS).lerp(GRASS2, 0.5 + 0.5 * Math.sin(x * 0.03) * Math.cos(z * 0.04));
      if (slope > 0.5) c.copy(ROCK_);
      if (h < 3) c.lerp(SAND, smoothstep(3, 1, h));
      if (h <= 0.05) c.copy(SEA);
      else if (gorgeD(x, z) < 5 && h < 1) c.copy(SEA);
      c.lerp(DIRT, pathMask[k]!);
      col.set([c.r, c.g, c.b], n * 3);
      if (a < cols - 1 && b < rows - 1) index.push(n, n + cols, n + 1, n + 1, n + cols, n + cols + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(index);
  return g.toNonIndexed();
}

function buildExhibit(p: JsonObject): THREE.Object3D {
  if (p.piece === 'specimen') {
    const rng = mulberry32(7741);
    const specimen = new THREE.Group();
    specimen.position.set(SPEC.x, 1.95, SPEC.z);
    const CRACK = 1.62, // each half's middle from the gap: two halves, side by side, as a cut stone is shown
      OPEN = 0.38; // turned in a little, towards whoever's in front
    for (const side of [-1, 1]) {
      const half = new THREE.Group();
      half.position.x = side * CRACK;
      half.rotation.y = -side * OPEN;
      const shell = new THREE.Mesh(halfShell(), rockMat);
      shell.castShadow = true;
      const band = new THREE.Mesh(rim(), rockMat);
      const lining = new THREE.Mesh(liningOf(90, rng), crystalMat);
      half.add(shell, band, lining);
      specimen.add(half);
    }
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0).toNonIndexed(), coreMat);
    core.scale.set(0.8, 1.7, 0.8);
    core.position.set(0, 0.25, 0.1);
    const haze = new THREE.Mesh(new THREE.SphereGeometry(1.2, 18, 12), hazeMat);
    haze.position.set(0, 0.25, 0.1);
    specimen.add(core, haze);
    core.name = 'museum-core';
    return specimen;
  }
  if (p.piece === 'pool') {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(SPEC.x, 0.06, SPEC.z + 0.4);
    return pool;
  }
  if (p.piece === 'relief') {
    const land = new THREE.Mesh(relief(), landMat);
    land.receiveShadow = true;
    land.geometry.computeVertexNormals();
    return land;
  }
  if (p.piece === 'bits') {
    if (typeof p.capacity !== 'number' || p.capacity !== 720) throw new Error('museum: unexpected table capacity');
    const bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bitsMat, p.capacity);
    bits.frustumCulled = false;
    bits.count = 0;
    return bits;
  }
  throw new Error('museum: unknown exhibit');
}
// Geometry templates and materials are shared; OwnedView clones the geometry for each mounted room.
const templates = new Map<string, THREE.Object3D>();
export function museumExhibit(p: JsonObject): THREE.Object3D {
  if (typeof p.piece !== 'string') throw new Error('museum: missing exhibit kind');
  if (p.piece === 'bits' && p.capacity !== 720) throw new Error('museum: unexpected table capacity');
  let template = templates.get(p.piece);
  if (!template) {
    template = buildExhibit(p);
    templates.set(p.piece, template);
  }
  return template.clone(true);
}
registerBuilder('town.museum-exhibit', museumExhibit);
