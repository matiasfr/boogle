import * as THREE from 'three';
import { SPAWN, COURT, CELL, HALF } from '../constants.ts';
import { island } from '../island/index.js';
import { MASSIF } from '../island/shape.js';
import { PATCH } from '../sim/mushrooms.ts';
import { mulberry32 } from '../math.ts';
import { groundHeight } from '../adapters/terrain.js';
import { scene } from './scene.ts';
import { addStaticSpheres } from '../physics/physics.ts';
import { onFrame } from '../loop.ts';
import { freezeStatic } from './instances.ts';
import type { Body } from '../physics/engine.ts';

type Sphere = { x: number; y: number; z: number; r: number };
type Merge = (spheres: Sphere[]) => void;
/** A footprint on the ground plane. */
export type Obstacle = { x: number; z: number; r: number };
/** A home palm: where it stands, and once built its crown, frond angles and collider body. */
export type Tree = { x: number; z: number; h: number; top?: THREE.Vector3; hang?: number[]; body?: Body };

// Concatenate many small vertex-colored geometries into one draw call (POIs use these too).
export function addPart(
  parts: THREE.BufferGeometry[],
  geo: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  color: THREE.ColorRepresentation,
) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(matrix);
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let k = 0; k < n; k++) {
    col[k * 3] = c.r;
    col[k * 3 + 1] = c.g;
    col[k * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  parts.push(g);
}
export function mergeParts(parts: THREE.BufferGeometry[]) {
  let total = 0;
  for (const g of parts) total += g.attributes.position.count;
  const pos = new Float32Array(total * 3),
    nrm = new Float32Array(total * 3),
    col = new Float32Array(total * 3);
  let off = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, off * 3);
    nrm.set(g.attributes.normal.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    off += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

// Footprints of trees, rocks and POIs ({ x, z, r } on the ground plane), for things that walk around them.
// Push freely; blockedAt() re-indexes when the list grows.
export const obstacles: Obstacle[] = [];
// Home palms in a fixed order (the same on every client): { x, z, h, top: Vector3 crown, hang: [3 angles], body }. Their
// cells are the wood age's log spots (src/features/log-sources.ts). Mainland trees are scenery and obstacles only.
export const trees: Tree[] = [];

const BUCKET = 16; // metres, spatial index cell for obstacles
let indexed = -1;
const buckets = new Map<number, Obstacle[]>();
const bkey = (bx: number, bz: number) => bx * 4096 + bz;
// True when (x, z) is within r + pad of an obstacle.
export function blockedAt(x: number, z: number, pad = 0) {
  if (indexed !== obstacles.length) {
    buckets.clear();
    for (const o of obstacles) {
      const k = bkey(Math.floor(o.x / BUCKET), Math.floor(o.z / BUCKET));
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k)!.push(o);
    }
    indexed = obstacles.length;
  }
  const bx = Math.floor(x / BUCKET),
    bz = Math.floor(z / BUCKET);
  for (let a = bx - 1; a <= bx + 1; a++)
    for (let b = bz - 1; b <= bz + 1; b++)
      for (const o of buckets.get(bkey(a, b)) ?? []) {
        const r = o.r + pad;
        if ((o.x - x) ** 2 + (o.z - z) ** 2 < r * r) return true;
      }
  return false;
}

// Merged meshes are split into TILE-metre tiles so the camera and the shadow pass skip the ones out of view.
const TILE = 64;
function tiledParts() {
  const map = new Map<number, THREE.BufferGeometry[]>(),
    shapes = new Map<number, Sphere[]>();
  const key = (x: number, z: number) => bkey(Math.floor((x + HALF) / TILE), Math.floor((z + HALF) / TILE));
  return {
    at(x: number, z: number) {
      const k = key(x, z);
      if (!map.has(k)) map.set(k, []);
      return map.get(k)!;
    },
    // Static collider spheres, merged into one physics body per tile (the physics step pays per body).
    collide(x: number, z: number, spheres: Sphere[]) {
      const k = key(x, z);
      if (!shapes.has(k)) shapes.set(k, []);
      shapes.get(k)!.push(...spheres);
    },
    addTo(parent: THREE.Object3D, material: THREE.Material) {
      for (const list of shapes.values()) addStaticSpheres(list);
      for (const parts of map.values()) {
        const mesh = new THREE.Mesh(mergeParts(parts), material);
        mesh.geometry.computeBoundingSphere();
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
      }
    },
  };
}

// Non-indexed already, so addPart only clones them.
const trunkGeo = new THREE.CylinderGeometry(0.8, 1, 1, 7).toNonIndexed();
const frondGeo = new THREE.ConeGeometry(0.55, 3.3, 4, 1).translate(0, 1.65, 0).toNonIndexed();
const blobGeo = new THREE.IcosahedronGeometry(1, 0); // rocks and leafy crowns
const m = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  up = new THREE.Vector3(0, 1, 0),
  sc = new THREE.Vector3(1, 1, 1);

// A leaning palm: trunk segments, fronds, colliders (its own body, or merged into `merge` when given).
function addPalm(parts: THREE.BufferGeometry[], t: Tree, rng: () => number, merge: Merge | null = null) {
  const lean = rng() * Math.PI * 2,
    leanAmt = 0.18 + rng() * 0.3,
    height = 4.4 + rng() * 2.2;
  const colliders: Sphere[] = [];
  let prev = new THREE.Vector3(t.x, t.h - 0.3, t.z);
  const segs = 7;
  for (let k = 0; k < segs; k++) {
    const f = (k + 1) / segs;
    const off = leanAmt * f * f * height;
    const next = new THREE.Vector3(t.x + Math.cos(lean) * off, t.h + f * height, t.z + Math.sin(lean) * off);
    const dir = next.clone().sub(prev);
    const len = dir.length();
    const r = 0.27 - 0.1 * (k / segs);
    q.setFromUnitVectors(up, dir.normalize());
    m.compose(prev.clone().lerp(next, 0.5), q, sc.set(r, len * 1.05, r));
    addPart(parts, trunkGeo, m, k % 2 ? '#9a6a3e' : '#80552d');
    colliders.push({ x: prev.x, y: prev.y + 0.25, z: prev.z, r: 0.32 });
    prev = next;
  }
  const top = prev;
  const fronds = 7 + Math.floor(rng() * 2);
  for (let k = 0; k < fronds; k++) {
    const ang = (k / fronds) * Math.PI * 2 + rng() * 0.4;
    const droop = 0.25 + rng() * 0.45;
    const mm = new THREE.Matrix4()
      .makeTranslation(top.x, top.y, top.z)
      .multiply(new THREE.Matrix4().makeRotationY(ang))
      .multiply(new THREE.Matrix4().makeRotationZ(-(Math.PI / 2 + droop)))
      .multiply(new THREE.Matrix4().makeScale(0.16, 1, 1));
    addPart(parts, frondGeo, mm, k % 2 ? '#3f9b3a' : '#57b845');
  }
  t.top = top;
  // `hang` is unused now, but its three draws stay: they feed the seeded layout, and later props would move without them.
  t.hang = [rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2];
  if (merge) merge(colliders);
  else t.body = addStaticSpheres(colliders);
}

// A round-crowned meadow tree: short trunk, a few leafy blobs.
function addBroadleaf(parts: THREE.BufferGeometry[], x: number, h: number, z: number, rng: () => number, merge: Merge) {
  const height = 2.2 + rng() * 1.6,
    crown = 1.6 + rng() * 1.1;
  m.compose(new THREE.Vector3(x, h + height / 2 - 0.2, z), q.identity(), sc.set(0.22, height + 0.4, 0.22));
  addPart(parts, trunkGeo, m, '#7a5232');
  const greens = ['#4f9a3a', '#5fae43', '#468a35'];
  for (let k = 0; k < 3; k++) {
    const a = rng() * Math.PI * 2,
      d = k === 0 ? 0 : crown * 0.55;
    const r = crown * (k === 0 ? 1 : 0.72);
    q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
    m.compose(
      new THREE.Vector3(x + Math.cos(a) * d, h + height + crown * 0.5 + (k ? -0.2 : 0.3), z + Math.sin(a) * d),
      q,
      sc.set(r, r * 0.85, r),
    );
    addPart(parts, blobGeo, m, greens[k]);
  }
  merge([
    { x, y: h + 0.4, z, r: 0.3 },
    { x, y: h + 1.2, z, r: 0.3 },
  ]);
  obstacles.push({ x, z, r: 0.45 });
}

function addRock(
  parts: THREE.BufferGeometry[],
  x: number,
  h: number,
  z: number,
  r: number,
  rng: () => number,
  merge: Merge,
) {
  q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, rng() * 3));
  m.compose(new THREE.Vector3(x, h + r * 0.15, z), q, sc.set(r * 1.1, r * 0.75, r));
  addPart(parts, blobGeo, m, rng() < 0.5 ? '#a19b90' : '#8a857c');
  merge([{ x, y: h + r * 0.1, z, r: r * 0.82 }]);
  obstacles.push({ x, z, r: r * 0.95 });
}

const flatEnough = (x: number, z: number, h: number, max: number) =>
  Math.abs(groundHeight(x + 1, z) - h) <= max && Math.abs(groundHeight(x, z + 1) - h) <= max;

export function createProps() {
  const tiles = tiledParts();
  // POIs keep their ground clear and are walked around.
  for (const k of island.keepOut) obstacles.push({ x: k.x, z: k.z, r: k.r });

  // Home: the original palms and rocks, from the same seed and in the same order as always.
  const rng = mulberry32(20261028);
  const gx0 = PATCH.i0 * CELL - HALF - 6,
    gx1 = (PATCH.i0 + PATCH.w) * CELL - HALF + 3,
    gz0 = HALF - (PATCH.j0 + PATCH.h) * CELL - 3,
    gz1 = HALF - PATCH.j0 * CELL + 4;
  const clear = (x: number, z: number, r: number) =>
    Math.hypot(x - SPAWN.x, z - SPAWN.z) > r &&
    Math.hypot(x - COURT.x, z - COURT.z) > COURT.r + 3 &&
    !(x > gx0 && x < gx1 && z > gz0 && z < gz1) &&
    !island.keptOut(x, z, 2);
  for (let tries = 0; tries < 900 && trees.length < 36; tries++) {
    const x = (rng() * 2 - 1) * 62,
      z = (rng() * 2 - 1) * 58;
    const h = groundHeight(x, z);
    if (h < 0.9 || h > 6.5 || !clear(x, z, 9)) continue;
    if (!flatEnough(x, z, h, 0.7)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 4.5)) continue;
    trees.push({ x, z, h });
    obstacles.push({ x, z, r: 0.5 });
  }
  for (const t of trees) addPalm(tiles.at(t.x, t.z), t, rng);
  let rocks = 0;
  for (let tries = 0; tries < 600 && rocks < 22; tries++) {
    const x = (rng() * 2 - 1) * 60,
      z = (rng() * 2 - 1) * 56;
    const h = groundHeight(x, z);
    if (h < -1.2 || h > 8 || !clear(x, z, 8)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3)) continue;
    const r = 0.6 + rng() * 1.3;
    addRock(tiles.at(x, z), x, h, z, r, rng, (c) => tiles.collide(x, z, c));
    rocks++;
  }

  // Mainland: palms along the coasts, round trees in the meadows, boulders (more of them up on the massif).
  const wild = mulberry32(20261029);
  // Beyond the home island's shore, clear of spawn, the court, the garden and home's own palms.
  const outsideHome = (x: number, z: number) =>
    x * x + z * z > 48 * 48 && clear(x, z, 9) && !trees.some((t) => (t.x - x) ** 2 + (t.z - z) ** 2 < 16);
  const onMassif = (x: number, z: number) =>
    ((x - MASSIF.x) / MASSIF.rx) ** 2 + ((z - MASSIF.z) / MASSIF.rz) ** 2 < 1.5;
  const spots: { x: number; z: number }[] = [];
  const spaced = (x: number, z: number, d: number) => !spots.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < d * d);
  const place = (
    count: number,
    tries: number,
    test: (x: number, z: number, h: number) => boolean,
    add: (x: number, z: number, h: number) => void,
  ) => {
    for (let n = 0, k = 0; k < tries && n < count; k++) {
      const x = (wild() * 2 - 1) * 140,
        z = -40 + (wild() * 2 - 1) * 110;
      const h = groundHeight(x, z);
      if (!outsideHome(x, z) || island.keptOut(x, z, 3) || !test(x, z, h)) continue;
      spots.push({ x, z });
      add(x, z, h);
      n++;
    }
  };
  place(
    55,
    6000,
    (x, z, h) => h > 0.9 && h < 3.2 && flatEnough(x, z, h, 0.7) && spaced(x, z, 5),
    (x, z, h) => {
      const t = { x, z, h };
      obstacles.push({ x, z, r: 0.5 });
      addPalm(tiles.at(x, z), t, wild, (c) => tiles.collide(x, z, c));
    },
  );
  place(
    70,
    6000,
    (x, z, h) => h > 2.4 && h < 15 && flatEnough(x, z, h, 0.9) && spaced(x, z, 6.5),
    (x, z, h) => addBroadleaf(tiles.at(x, z), x, h, z, wild, (c) => tiles.collide(x, z, c)),
  );
  place(
    55,
    4000,
    (x, z, h) => h > 0.4 && (onMassif(x, z) ? wild() < 0.9 : wild() < 0.3) && spaced(x, z, 3.5),
    (x, z, h) =>
      addRock(tiles.at(x, z), x, h, z, 0.6 + wild() * (onMassif(x, z) ? 2.2 : 1.3), wild, (c) =>
        tiles.collide(x, z, c),
      ),
  );

  const group = new THREE.Group();
  tiles.addTo(group, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
  scene.add(group);
  freezeStatic(group); // never moves: no per-frame matrix work
}

export const clouds: THREE.Mesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>[] = [];
export function createClouds() {
  const rng = mulberry32(77);
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const mat = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    emissive: '#d8ecff',
    emissiveIntensity: 0.45,
    flatShading: true,
  });
  for (let c = 0; c < 9; c++) {
    const parts: THREE.BufferGeometry[] = [];
    const m = new THREE.Matrix4();
    for (let k = 0; k < 5; k++) {
      const r = 5 + rng() * 6;
      m.compose(
        new THREE.Vector3((k - 2) * 6 + rng() * 3, rng() * 3, rng() * 6 - 3),
        new THREE.Quaternion(),
        new THREE.Vector3(r, r * 0.6, r),
      );
      addPart(parts, puff, m, '#ffffff');
    }
    const mesh = new THREE.Mesh(mergeParts(parts), mat);
    const a = rng() * Math.PI * 2,
      d = 140 + rng() * 180;
    mesh.position.set(Math.cos(a) * d, 55 + rng() * 35, Math.sin(a) * d);
    scene.add(mesh);
    clouds.push(mesh);
  }
}

function updateClouds(dt: number) {
  for (const c of clouds) {
    c.position.x += dt * 1.2;
    if (c.position.x > 340) c.position.x = -340;
  }
}
// update -190, after the camera (player.js, -200), before the feature update hooks (src/loop.ts lists the orders).
onFrame(({ dt }) => updateClouds(dt), { phase: 'update', order: -190 });
