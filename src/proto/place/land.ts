// The land of ?proto=place, drawn: the heights of ./terrain.ts as one faceted mesh, collided as one heightfield, with the
// spire, the footbridges and what stands across the sea. chop.ts owns every tree. Local.
import * as THREE from 'three/webgpu';
import { flat } from '../flat.ts';
import { LOOK, groundMaterial, spireRock } from './look.ts';
import { scene } from '../../render/scene.ts';
import { registerWaterReceiver } from '../../render/water/receivers.ts';
import { shoreApronHeight } from '../../render/water/shore-providers.ts';
import { SEA } from '../../constants.ts';
import { addBody, createBody, type Shape } from '../../physics/engine.ts';
import { GROUP, groundMat } from '../../physics/physics.ts';
import { smoothstep } from '../../math.ts';
import { FAR, GRID, ORIGIN, PATHS, SPIRE } from './layout.ts';
import { CELL, H, NX, NZ, PATH_SAMPLES, at, cellX, cellZ, gorgeD, heights, insidePlace, pathMask } from './terrain.ts';
import { SHORE_COAST, SHORE_HOP, SHORE_LANDING } from './shore-layout.ts';

export { H, PATH_SAMPLES, insidePlace };

// ---------------------------------------------------------------- the mesh and the heightfield
const FLAT = (color: string) => flat(color);

function buildMesh() {
  // Continue the visible bed into the atlas's offshore apron. Ending the opaque mesh at the shallow
  // grid edge made refraction switch straight from sand to sky, even though bathymetry was continuous.
  // Six rings follow bathymetry; four more sink below optical visibility (blue transmission < 0.05%).
  // All share the terrain's draw/material; the authored grid and its collider stay untouched.
  const rings = 10,
    perimeter = 2 * (NX + NZ - 2);
  const pos = new Float32Array((NX * NZ + rings * perimeter) * 3),
    col = new Float32Array(pos.length);
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
      idx.push(a, c0, b, b, c0, d);
    }
  const edge: number[] = [];
  for (let i = 0; i < NX - 1; i++) edge.push(at(i, 0));
  for (let j = 0; j < NZ - 1; j++) edge.push(at(NX - 1, j));
  for (let i = NX - 1; i > 0; i--) edge.push(at(i, NZ - 1));
  for (let j = NZ - 1; j > 0; j--) edge.push(at(0, j));
  for (let ring = 0; ring < rings; ring++) {
    const reach = ring < 6 ? ((ring + 1) / 6) * 160 : 160 + (ring - 5) * 40;
    for (let n = 0; n < perimeter; n++) {
      const source = edge[n]!,
        i = source % NX,
        j = Math.floor(source / NX);
      const dx = i === 0 ? -reach : i === NX - 1 ? reach : 0;
      const dz = j === 0 ? -reach : j === NZ - 1 ? reach : 0;
      const k = NX * NZ + ring * perimeter + n;
      pos.set(
        [
          cellX(i) + ORIGIN.x + dx,
          SEA + shoreApronHeight(heights[source]! - SEA, Math.hypot(dx, dz), 1024) - 180 * smoothstep(160, 320, reach),
          cellZ(j) + ORIGIN.z + dz,
        ],
        k * 3,
      );
      col.set(col.subarray(source * 3, source * 3 + 3), k * 3);
      const next = (n + 1) % perimeter;
      const a = ring === 0 ? source : k - perimeter;
      const b = ring === 0 ? edge[next]! : NX * NZ + (ring - 1) * perimeter + next;
      const d = NX * NZ + ring * perimeter + next;
      idx.push(a, b, k, b, d, k);
    }
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
    void import('../shore/terrain-demo.ts').then((m) => m.applyTerrainDemo(mesh.material, ORIGIN.x));
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
  if (SHORE_COAST) {
    // A simple solid timber landing over the existing cove. Its inland end rests on the
    // unchanged dry pad, so arrival and saved-position ground checks still use the terrain.
    const dx = SHORE_LANDING.x + ORIGIN.x,
      dz = SHORE_LANDING.z;
    for (let i = 0; i < 12; i++) plank(dx - 19 + i * 2, dz, dx - 17.02 + i * 2, dz, 3.08, 3.08, 7, '#8a6238');
    for (const x of [dx - 18, dx - 12])
      for (const z of [dz - 3.2, dz + 3.2]) {
        const base = H(x, z),
          height = 4 - base;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, height, 0.4), FLAT('#7f5630'));
        post.position.set(x, base + height / 2, z);
        post.castShadow = post.receiveShadow = true;
        scene.add(post);
        addStatic({ kind: 'box', hx: 0.2, hy: height / 2, hz: 0.2 }, post.position);
      }
    // Keep the existing low rock as a shoulder detail, clear of the ordinary walk into town.
    const { x, height, top, bottom } = SHORE_HOP;
    const z = SHORE_HOP.z + 7,
      y = H(x + ORIGIN.x, z);
    const rock = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, 7), FLAT(spireRock('#8c8478')));
    rock.position.set(x + ORIGIN.x, y + height / 2, z + ORIGIN.z);
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
    addStatic({ kind: 'cylinder', rTop: top, rBottom: bottom, h: height, segments: 7 }, rock.position);
  }
  buildSpire();
  buildBridges();
  buildFar();
}
