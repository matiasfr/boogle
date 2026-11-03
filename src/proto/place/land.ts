// The land of ?proto=place, drawn: the heights of ./terrain.ts as one faceted mesh, collided as one heightfield, with the
// spire, the footbridges, the trees and what stands across the sea. Local.
import * as THREE from 'three/webgpu';
import { flat } from '../flat.ts';
import { LOOK, addBlob, groundMaterial, spireRock } from './look.ts';
import { scene } from '../../render/scene.ts';
import { newWaterEnabled } from '../../render/water/flags.ts';
import { registerWaterReceiver } from '../../render/water/receivers.ts';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { mulberry32 } from '../../sim/rng.ts';
import { smoothstep } from '../../math.ts';
import { FAR, GRID, GROVES, HEAD, ORIGIN, PATHS, SPIRE } from './layout.ts';
import {
  CELL,
  H,
  NX,
  NZ,
  PATH_SAMPLES,
  at,
  cellX,
  cellZ,
  clearMask,
  gorgeD,
  heights,
  insidePlace,
  pathMask,
} from './terrain.ts';

export { H, PATH_SAMPLES, insidePlace };

// ---------------------------------------------------------------- the mesh and the heightfield
const FLAT = (color: string) => flat(color);

function buildMesh() {
  const pos = new Float32Array(NX * NZ * 3),
    col = new Float32Array(NX * NZ * 3);
  const c = new THREE.Color();
  const SAND = new THREE.Color('#e8d39a'),
    GRASS = new THREE.Color(LOOK.ground ? '#6c9a42' : '#79b84a'),
    GRASS2 = new THREE.Color(LOOK.ground ? '#568740' : '#5ea241'),
    ROCK = new THREE.Color('#a08a70'),
    ROCK_LOW = new THREE.Color('#6d6f78'),
    DIRT = new THREE.Color('#e0b271'),
    BANK = new THREE.Color('#8e9a78');
  for (let j = 0; j < NZ; j++)
    for (let i = 0; i < NX; i++) {
      const k = at(i, j),
        h = heights[k]!,
        x = cellX(i),
        z = cellZ(j);
      pos.set([x + ORIGIN.x, h, z + ORIGIN.z], k * 3);
      const hx = heights[at(Math.min(NX - 1, i + 1), j)]! - heights[at(Math.max(0, i - 1), j)]!,
        hz = heights[at(i, Math.min(NZ - 1, j + 1))]! - heights[at(i, Math.max(0, j - 1))]!;
      const slope = Math.hypot(hx, hz) / (2 * CELL);
      c.copy(GRASS).lerp(
        GRASS2,
        0.5 + 0.25 * Math.sin(x * 0.023 + 1) * Math.cos(z * 0.031) + 0.25 * Math.sin(x * 0.071 - z * 0.053),
      );
      if (h < 3.2) c.lerp(gorgeD(x, z) < 18 ? BANK : SAND, smoothstep(3.2, 1.6, h));
      if (!LOOK.ground) c.lerp(h < 9 ? ROCK_LOW : ROCK, smoothstep(0.55, 1.1, slope)); // with it, rock is per pixel
      c.lerp(DIRT, pathMask[k]!);
      col.set([c.r, c.g, c.b], k * 3);
    }
  const idx: number[] = [];
  for (let j = 0; j < NZ - 1; j++)
    for (let i = 0; i < NX - 1; i++) {
      const a = at(i, j),
        b = at(i + 1, j),
        c0 = at(i, j + 1),
        d = at(i + 1, j + 1);
      if (!newWaterEnabled && Math.max(heights[a]!, heights[b]!, heights[c0]!, heights[d]!) < -3.5) continue;
      idx.push(a, c0, b, b, c0, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    LOOK.ground
      ? groundMaterial()
      : new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
  );
  mesh.receiveShadow = true;
  if (new URLSearchParams(location.search).get('terrain') === 'demo')
    void import('../water/terrain-demo.ts').then((m) => m.applyTerrainDemo(mesh.material, ORIGIN.x));
  registerWaterReceiver(mesh.material);
  mesh.frustumCulled = false;
  scene.add(mesh);

  // heights[i][j]: i steps +x, j steps -z, from the body's position.
  const hf: number[][] = [];
  for (let i = 0; i < NX; i++) {
    const col2: number[] = [];
    for (let j = 0; j < NZ; j++) col2.push(heights[at(i, NZ - 1 - j)]!);
    hf.push(col2);
  }
  addStatic({ kind: 'heightfield', heights: hf, cell: CELL }, { x: ORIGIN.x + GRID.x0, y: 0, z: ORIGIN.z + GRID.z1 });
}

/** Walls and roofs of buildings you can walk into: solid to you (your mask has every bit), and the indoor camera leaves this
 * bit out of its arm, so the wall it's cut away doesn't push the lens into your back (docs/research/town-interiors.md). */
export const ROOM_GROUP = 8;
export function addStatic(
  shape: Shape,
  position: { x: number; y: number; z: number },
  rotation?: THREE.Quaternion,
  group: number = GROUP.SCENERY,
) {
  const body = createBody({
    material: groundMat,
    group,
    position,
    ...(rotation ? { rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w } } : {}),
    shapes: [shape],
  });
  addBody(body);
  return body;
}

/** Many small solid things in one body: `offset`s are from `position`. */
export function addStatics(shapes: Shape[], position: { x: number; y: number; z: number }) {
  const body = createBody({ material: groundMat, group: GROUP.SCENERY, position, shapes });
  addBody(body);
  return body;
}

/** A solid slab between two world points, top at y, with nothing drawn: built track's walkable top. */
export function slab(ax: number, az: number, bx: number, bz: number, topA: number, topB: number, width: number) {
  const dx = bx - ax,
    dz = bz - az,
    dy = topB - topA,
    len = Math.hypot(dx, dz),
    full = Math.hypot(len, dy),
    thick = 0.4;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(dy, len), Math.atan2(dx, dz), 0, 'YXZ'));
  const c = { x: (ax + bx) / 2, y: (topA + topB) / 2 - thick / 2, z: (az + bz) / 2 };
  return addStatic({ kind: 'box', hx: width / 2, hy: thick / 2, hz: full / 2 + 0.05 }, c, q);
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
  const ROCK = spireRock('#8c8478'),
    ROCK2 = spireRock('#a2978a');
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
    // Round 4: every drum's solid, as high as it's drawn. You climb this now.
    addStatic({ kind: 'cylinder', rTop: r1, rBottom: r0, h, segments: 8 }, { x: X + dx, y: y + h / 2, z: Z + dz });
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
      // The rail holds you in: what looks solid is solid.
      addStatic(
        { kind: 'box', hx: 0.08, hy: 0.6, hz: len / 2 },
        { x: rail.position.x, y: a[2] + 0.65, z: rail.position.z },
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rail.rotation.y),
      );
    }
  }
}

function buildTrees() {
  const rng = mulberry32(31);
  const pose = new THREE.Object3D();
  const spots: { x: number; y: number; z: number; s: number }[] = [];
  const EXT = 260;
  for (let n = 0; n < 2600 && spots.length < 400; n++) {
    // The first 340 over the old island; the rest on Far Head.
    const old = spots.length < 340,
      x = old ? (rng() * 2 - 1) * (EXT - 12) : HEAD.x + (rng() * 2 - 1) * HEAD.r,
      z = old ? (rng() * 2 - 1) * (EXT - 12) : HEAD.z + (rng() * 2 - 1) * HEAD.r;
    const i = Math.round((x - GRID.x0) / CELL),
      j = Math.round((z - GRID.z0) / CELL),
      h = heights[at(i, j)]!;
    if (h < 4 || clearMask[at(i, j)]! > 0.05 || gorgeD(x, z) < 21) continue;
    if (Math.hypot(x - SPIRE.x, z - SPIRE.z) < 30) continue;
    if (GROVES.some((g) => Math.hypot(x - g.x, z - g.z) < g.r + 6)) continue; // the groves' trees are the ones you chop
    // Groves, not a scatter: a slow field thins most of the land out, and the ridge is the densest.
    const grove = Math.sin(x * 0.036 + 1.2) * Math.cos(z * 0.041 - 0.4) + (z < -100 ? 0.8 : 0);
    if (old && grove < 0.15 + rng() * 0.25) continue;
    if (!old && rng() < 0.4) continue;
    spots.push({ x, y: h, z, s: 0.8 + rng() * 0.7 });
    if (LOOK.contact) addBlob(x + ORIGIN.x, h, z + ORIGIN.z, 2.4, 2.4);
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
  // Their trunks are solid, all in one body. The crowns are over your head.
  addStatics(
    spots.map((t) => ({
      kind: 'cylinder' as const,
      rTop: 0.36 * t.s,
      rBottom: 0.36 * t.s,
      h: 3 * t.s,
      segments: 6,
      offset: { x: t.x, y: t.y + 1.5 * t.s, z: t.z },
    })),
    { x: ORIGIN.x, y: 0, z: ORIGIN.z },
  );
}

// ---------------------------------------------------------------- what stands across the sea
// Too far to reach: a dark island with a broken ring on it and a bright shard in the ring's middle, hazy over a kilometre.
function buildFar() {
  const X = FAR.x + ORIGIN.x,
    Z = FAR.z + ORIGIN.z;
  const LAND = '#4a4d5c',
    LAND2 = '#3b3e4c';
  const hills: [dx: number, dz: number, r: number, h: number, color: string][] = [
    [0, 0, 340, 70, LAND],
    [-170, 60, 170, 120, LAND2],
    [190, 30, 190, 95, LAND2],
    [40, -90, 130, 150, LAND],
  ];
  for (const [dx, dz, r, h, color] of hills) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), FLAT(color));
    m.position.set(X + dx, h / 2 - 4, Z + dz);
    m.rotation.y = dx;
    scene.add(m);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(120, 13, 6, 22, Math.PI * 1.45), FLAT('#2c2e3a'));
  ring.position.set(X + 10, 120, Z);
  ring.rotation.set(0, -0.3, 0.45);
  scene.add(ring);
  const shard = new THREE.Mesh(
    new THREE.OctahedronGeometry(38, 0),
    new THREE.MeshStandardNodeMaterial({ color: '#7fd0ff', emissive: '#58c8ff', emissiveIntensity: 1.6 }),
  );
  shard.scale.set(0.55, 1.5, 0.55);
  shard.position.set(X + 10, 140, Z);
  scene.add(shard);
}

export function buildLand() {
  buildMesh();
  buildSpire();
  buildBridges();
  buildTrees();
  buildFar();
}
