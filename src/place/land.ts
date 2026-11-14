// The land of ?proto=place, drawn from terrain.ts; the cove locally refines the shared render/collision surface, with the
// spire, the footbridges and what stands across the sea. chop.ts owns every tree. Local.
import * as THREE from 'three/webgpu';
import { flat } from '../render/flat.ts';
import { paletteMaterial } from '../render/material-palette.ts';
import { woodMaterial, type GrainAxis } from '../render/wood.ts';
import { LOOK, groundMaterial, spireRock } from './look.ts';
import { readableGlow } from '../render/readable-unlit.ts';
import { shoreApronHeight } from '../render/water/shore-providers.ts';
import { SEA } from '../constants.ts';
import { createBody, type Shape } from '../physics/engine.ts';
import { GROUP, groundMat } from '../physics/physics.ts';
import { smoothstep } from '../math.ts';
import { FAR, GRID, ORIGIN, PATHS, SPIRE } from './layout.ts';
import {
  CELL,
  H,
  NX,
  NZ,
  PATH_SAMPLES,
  at,
  cellX,
  cellZ,
  gorgeD,
  heights,
  insidePlace,
  pathMask,
  COVE_FINE,
  fineHeightAt,
  terrainCollisionTiles,
} from './terrain.ts';
import { SHORE_COAST, SHORE_HOP, SHORE_LANDING } from './shore-layout.ts';
import { boxFootprint, sampleFootprint } from './support.ts';
import type { OwnedView } from '../render/owned-view.ts';
import { tagStepSupport, segmentStepSupport, type StepSurface } from '../render/locomotion-surfaces.ts';
import { coveJoinCoverage, coveJoinNormal, coveWeight } from './cove.ts';
import { buildCove } from './cove-view.ts';
import { dressCoveGround } from './cove-ground.ts';
import { addFarGround } from './far-ground.ts';
import { setFarHills } from './far-hills.ts';
import { applyPathSurface } from './path-surface.ts';
import { applyTerrainPass } from '../proto/terrain-pass/index.ts';

export { H, PATH_SAMPLES, insidePlace };

// ---------------------------------------------------------------- the mesh and the heightfield
const FLAT = (color: string) => flat(color);
/** Timber with the look's materials on: the shared wood grain along `axis`, each piece offset from its neighbours. */
const TIMBER = (color: string, axis: GrainAxis) => (LOOK.mats ? woodMaterial(flat(color), axis) : flat(color));

/** Finished soil only: H also includes cliff-kit tops, which must not steer ground coverage. */
function soilHeight(x: number, z: number) {
  const gx = Math.max(0, Math.min(NX - 1, (x - GRID.x0) / CELL)),
    gz = Math.max(0, Math.min(NZ - 1, (z - GRID.z0) / CELL));
  const i = Math.min(Math.floor(gx), NX - 2),
    j = Math.min(Math.floor(gz), NZ - 2),
    u = gx - i,
    v = gz - j;
  const a = heights[at(i, j)]!,
    b = heights[at(i + 1, j)]!,
    c = heights[at(i, j + 1)]!,
    d = heights[at(i + 1, j + 1)]!;
  const coarse = u + v <= 1 ? a + (b - a) * u + (c - a) * v : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  return fineHeightAt(x, z, coarse);
}

/** Static coverage field: a 3 m derivative with perpendicular averaging removes grid-scale zigzags.
 * These distances are bake resolution, not look controls; lighting keeps the actual mesh normals. */
function macroSlopeY(x: number, z: number) {
  let dx = 0,
    dz = 0;
  for (const offset of [-1.5, 0, 1.5]) {
    const weight = offset === 0 ? 2 : 1;
    dx += weight * (soilHeight(x + 3, z + offset) - soilHeight(x - 3, z + offset));
    dz += weight * (soilHeight(x + offset, z + 3) - soilHeight(x + offset, z - 3));
  }
  return 1 / Math.hypot(1, dx / 24, dz / 24);
}

function buildMesh(owner: OwnedView) {
  // Continue the visible bed into the atlas's offshore apron. Ending the opaque mesh at the shallow
  // grid edge made refraction switch straight from sand to sky, even though bathymetry was continuous.
  // Six rings follow bathymetry; four more sink below optical visibility (blue transmission < 0.05%).
  // All share the terrain's draw/material; the authored grid and its collider stay untouched.
  const rings = 10,
    perimeter = 2 * (NX + NZ - 2);
  const baseCount = NX * NZ + rings * perimeter;
  const pos = new Float32Array((baseCount + COVE_FINE.nx * COVE_FINE.nz) * 3),
    col = new Float32Array(pos.length),
    paths = new Float32Array(pos.length / 3);
  const c = new THREE.Color();
  const SAND = new THREE.Color('#e8d39a'),
    GRASS = new THREE.Color(LOOK.ground ? '#6c9a42' : '#79b84a'),
    GRASS2 = new THREE.Color(LOOK.ground ? '#568740' : '#5ea241'),
    ROCK = new THREE.Color('#a08a70'),
    ROCK_LOW = new THREE.Color('#6d6f78'),
    DIRT = new THREE.Color('#e0b271'),
    WORN = new THREE.Color('#7f8448'),
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
      // With the look on, paths are drawn per pixel from their distance field (path-surface.ts), not from this 2 m blend.
      // Beside one the grass is trampled dry, which also keeps a narrow ledge beside a cut tread from turning lawn green.
      if (LOOK.ground) c.lerp(WORN, 0.75 * pathMask[k]!);
      else c.lerp(DIRT, pathMask[k]!);
      if (coveWeight(x, z) > 0 && pathMask[k]! < 0.01) {
        // Wetness stays in the production receiver; this is dry surface coverage only.
        const tint = h < 2 ? new THREE.Color(0.72, 0.57, 0.32) : new THREE.Color(0.19, 0.32, 0.04);
        c.lerp(tint, coveWeight(x, z));
      }
      col.set([c.r, c.g, c.b], k * 3);
      paths[k] = LOOK.ground ? 0 : pathMask[k]!;
    }
  const idx: number[] = [];
  for (let j = 0; j < NZ - 1; j++)
    for (let i = 0; i < NX - 1; i++) {
      if (cellX(i) >= COVE_FINE.x0 && cellX(i) < COVE_FINE.x1 && cellZ(j) >= COVE_FINE.z0 && cellZ(j) < COVE_FINE.z1)
        continue;
      const a = at(i, j),
        b = at(i + 1, j),
        c0 = at(i, j + 1),
        d = at(i + 1, j + 1);
      idx.push(a, c0, b, b, c0, d);
    }
  const mainEnd = idx.length; // the main grid's quads; far-ground.ts tiles them
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
  const f = COVE_FINE;
  const ids = new Uint32Array(f.nx * f.nz);
  for (let j = 0; j < f.nz; j++)
    for (let i = 0; i < f.nx; i++) {
      const k = j * f.nx + i,
        index = baseCount + k;
      const x = f.x0 + i * f.cell,
        z = f.z0 + j * f.cell;
      const gx = (x - GRID.x0) / CELL,
        gz = (z - GRID.z0) / CELL;
      const ci = Math.floor(gx),
        cj = Math.floor(gz),
        u = gx - ci,
        v = gz - cj;
      const samples = [at(ci, cj), at(ci + 1, cj), at(ci, cj + 1), at(ci + 1, cj + 1)];
      const weights = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
      pos.set([x + ORIGIN.x, f.heights[k]!, z + ORIGIN.z], index * 3);
      for (let channel = 0; channel < 3; channel++)
        col[index * 3 + channel] = samples.reduce((sum, id, n) => sum + col[id * 3 + channel]! * weights[n]!, 0);
      paths[index] = LOOK.ground ? 0 : samples.reduce((sum, id, n) => sum + pathMask[id]! * weights[n]!, 0);
      const boundary = i === 0 || j === 0 || i === f.nx - 1 || j === f.nz - 1;
      ids[k] = boundary && u === 0 && v === 0 ? at(ci, cj) : index;
    }
  for (let j = 0; j < f.nz - 1; j++)
    for (let i = 0; i < f.nx - 1; i++) {
      const k = j * f.nx + i,
        a = ids[k]!,
        b = ids[k + 1]!,
        c0 = ids[k + f.nx]!,
        d = ids[k + f.nx + 1]!;
      idx.push(a, c0, b, b, c0, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('covePath', new THREE.BufferAttribute(paths, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // Odd boundary vertices lie on the coarse edges. Match their interpolated normals, too.
  const normals = geo.getAttribute('normal');
  const n = new THREE.Vector3();
  for (let j = 0; j < f.nz; j++)
    for (let i = 0; i < f.nx; i++) {
      if (i !== 0 && j !== 0 && i !== f.nx - 1 && j !== f.nz - 1) continue;
      const gx = (f.x0 + i - GRID.x0) / CELL,
        gz = (f.z0 + j - GRID.z0) / CELL;
      if (Number.isInteger(gx) && Number.isInteger(gz)) continue;
      const a = at(Math.floor(gx), Math.floor(gz)),
        b = at(Math.ceil(gx), Math.ceil(gz));
      n.set(
        normals.getX(a) + normals.getX(b),
        normals.getY(a) + normals.getY(b),
        normals.getZ(a) + normals.getZ(b),
      ).normalize();
      normals.setXYZ(baseCount + j * f.nx + i, n.x, n.y, n.z);
    }
  const capJoin = new Float32Array((pos.length / 3) * 2);
  for (let k = 0; k < pos.length / 3; k++) {
    const wx = pos[k * 3]!,
      wz = pos[k * 3 + 2]!;
    const coverage = coveJoinCoverage(wx - ORIGIN.x, wz - ORIGIN.z, pos[k * 3 + 1]!);
    if (coverage) capJoin.set(coverage, k * 2);
    // Coverage keeps the original soil slope. Only lighting shares the kit's contact tangent.
    const joined = coveJoinNormal(wx - ORIGIN.x, wz - ORIGIN.z, normals.getX(k), normals.getY(k), normals.getZ(k));
    if (joined) normals.setXYZ(k, joined[0]!, joined[1]!, joined[2]!);
  }
  geo.setAttribute('coveCapJoin', new THREE.BufferAttribute(capJoin, 2));
  const mesh = new THREE.Mesh(
    geo,
    LOOK.ground
      ? groundMaterial()
      : new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
  );
  mesh.receiveShadow = true;
  mesh.material.flatShading = false;
  // The cove shader owns pigment; the old look-off fallback needs its colours only outside the mask.
  if (mesh.material.vertexColors) {
    mesh.material.vertexColors = false;
    mesh.material.colorNode = null;
  }
  dressCoveGround(mesh.material, (x, z) => macroSlopeY(x - ORIGIN.x, z - ORIGIN.z));
  if (LOOK.ground) applyPathSurface(mesh.material as THREE.MeshStandardNodeMaterial); // last: the tread wins
  owner.cleanup(() => mesh.material.dispose());
  mesh.frustumCulled = false;
  owner.add(mesh);
  const inCove = (i: number, j: number) =>
    cellX(i) >= COVE_FINE.x0 && cellX(i) < COVE_FINE.x1 && cellZ(j) >= COVE_FINE.z0 && cellZ(j) < COVE_FINE.z1;
  addFarGround(mesh, NX, NZ, mainEnd, inCove, owner);
  applyTerrainPass(mesh, owner); // ?terrain=a|b|ab look experiment; off by default (docs/plans/terrain-pass.md)

  for (const tile of terrainCollisionTiles()) {
    const groundBody = addStatic(
      { kind: 'heightfield', heights: tile.heights, cell: tile.cell },
      tile.position,
      undefined,
      GROUP.SCENERY,
      owner,
    );
    tagStepSupport(groundBody, (x, z) => {
      if (!insidePlace(x, z)) return null;
      const top = H(x, z);
      // Authored coastal ground band, independent of rendered grass colour/pigment.
      return { top, surface: top < 2.4 && gorgeD(x - ORIGIN.x, z - ORIGIN.z) >= 18 ? 'sand' : 'grass' };
    });
  }
  buildCove();
}

/** Walls and roofs of buildings you can walk into: solid to you (your mask has every bit), and the indoor camera leaves this
 * bit out of its arm, so the wall it's cut away doesn't push the lens into your back (docs/research/town-interiors.md). */
export const ROOM_GROUP = 8;
export function staticBody(
  shape: Shape,
  position: { x: number; y: number; z: number },
  rotation?: THREE.Quaternion,
  group: number = GROUP.SCENERY,
) {
  return createBody({
    material: groundMat,
    group,
    position,
    ...(rotation ? { rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w } } : {}),
    shapes: [shape],
  });
}
/** A solid thing that leaves with the view's owner. */
export const addStatic = (
  shape: Shape,
  position: { x: number; y: number; z: number },
  rotation: THREE.Quaternion | undefined,
  group: number | undefined,
  owner: OwnedView,
) => owner.addBody(staticBody(shape, position, rotation, group));

/** Many small solid things in one body: `offset`s are from `position`. */
export function addStatics(shapes: Shape[], position: { x: number; y: number; z: number }, owner: OwnedView) {
  const body = createBody({ material: groundMat, group: GROUP.SCENERY, position, shapes });
  owner.addBody(body);
  return body;
}

/** A solid slab between two world points, top at y, with nothing drawn: built track's walkable top. */
export function slab(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  topA: number,
  topB: number,
  width: number,
  owner: OwnedView,
  overlap = 0.05,
  surface: StepSurface = 'rail',
) {
  const dx = bx - ax,
    dz = bz - az,
    dy = topB - topA,
    len = Math.hypot(dx, dz),
    full = Math.hypot(len, dy),
    thick = 0.4;
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.atan2(dy, len), Math.atan2(dx, dz), 0, 'YXZ'));
  const c = { x: (ax + bx) / 2, y: (topA + topB) / 2 - thick / 2, z: (az + bz) / 2 };
  return tagStepSupport(
    addStatic({ kind: 'box', hx: width / 2, hy: thick / 2, hz: full / 2 + overlap }, c, q, GROUP.SCENERY, owner),
    segmentStepSupport(ax, az, bx, bz, topA, topB, width, surface),
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
  owner: OwnedView,
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
  tagStepSupport(
    addStatic({ kind: 'box', hx: width / 2, hy: thick / 2, hz: full / 2 }, c, q, GROUP.SCENERY, owner),
    segmentStepSupport(ax, az, bx, bz, topA, topB, width, 'wood'),
  );
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(width, thick, full),
    paletteMaterial(TIMBER(color, width > full ? 'x' : 'z'), 'timber', owner),
  );
  m.position.set(c.x, c.y, c.z);
  m.quaternion.copy(q);
  m.castShadow = m.receiveShadow = true;
  owner.add(m);
  return m;
}

// ---------------------------------------------------------------- the spire: Needle Bell, 105 m, the address of the place
function buildSpire(owner: OwnedView) {
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
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, 7, 1), paletteMaterial(FLAT(color), 'stone', owner));
    m.position.set(X + dx, y + h / 2, Z + dz);
    m.rotation.y = y * 0.7;
    m.castShadow = true;
    owner.add(m);
    // Round 4: every drum's solid, as high as it's drawn. You climb this now.
    addStatic(
      { kind: 'cylinder', rTop: r1, rBottom: r0, h, segments: 8 },
      { x: X + dx, y: y + h / 2, z: Z + dz },
      undefined,
      GROUP.SCENERY,
      owner,
    );
    y += h - 0.5;
  }
  // The lookout and the orange vane that say "that one" from every lobe.
  const top = y;
  // tech.ts owns the summit's walkable deck; the old lookout deck shared its top plane.
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), FLAT('#3a302c'));
  mast.position.set(X + 8, top + 2, Z - 1);
  const vane = new THREE.Mesh(new THREE.BoxGeometry(5, 1.6, 0.25), FLAT('#f0752c'));
  vane.position.set(X + 9.6, top + 4.4, Z - 1);
  owner.add(mast, vane);
}

// ---------------------------------------------------------------- footbridges, trees, a few places to stop at
// The path's bridge segment runs bank top to bank top; the deck only spans the water, from a short landing on the sand
// each side, with a low arch and open ends you can step off sideways. The path's points (and so the terrain) are unchanged.
const BRIDGE = { landing: 1.25, level: 0.3, width: 3.4, crown: 0.3, railIn: 1.7, railH: 1, ramp: 0.25 };
function buildBridges(owner: OwnedView) {
  const add = (...m: THREE.Object3D[]) => owner.add(...m);
  const post = TIMBER('#7f5630', 'y'),
    rail = TIMBER('#7f5630', 'z'),
    edge = TIMBER('#8d5e33', 'z');
  for (const p of PATHS) {
    const a = p.pts[p.bridgeAt]!,
      b = p.pts[p.bridgeAt + 1]!;
    const ax = a[0] + ORIGIN.x,
      az = a[1] + ORIGIN.z;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]),
      ux = (b[0] - a[0]) / len,
      uz = (b[1] - a[1]) / len;
    const X = (s: number, side = 0) => ax + ux * s - uz * side,
      Z = (s: number, side = 0) => az + uz * s + ux * side;
    // Measure the water along the segment: the deck starts and ends a landing's length past each waterline.
    let wet0 = len,
      wet1 = 0;
    for (let s = 0; s <= len; s += 0.1)
      if (H(X(s), Z(s)) < SEA) {
        wet0 = Math.min(wet0, s);
        wet1 = s;
      }
    // Each end bears on the sand under its full width: where the bank runs down across the deck at a slant, the end moves
    // back until the sand under it is level enough to sit on.
    const yaw = Math.atan2(ux, uz),
      sand = (s: number) => sampleFootprint(boxFootprint(X(s), Z(s), BRIDGE.width, 0.25, yaw));
    const settle = (s: number, step: number, stop: number) => {
      while ((stop - s) * step > 0) {
        const g = sand(s);
        if (g.high - g.low <= BRIDGE.level) break;
        s += step;
      }
      return s;
    };
    const s0 = settle(Math.max(0, wet0 - BRIDGE.landing), -0.1, 0),
      s1 = settle(Math.min(len, wet1 + BRIDGE.landing), 0.1, len),
      span = s1 - s0;
    // The ends sit on the sand; the middle rises a little over the line between the path's ends.
    const end0 = sand(s0).high + 0.03,
      end1 = sand(s1).high + 0.03;
    const top = (s: number) => {
      const t = (s - s0) / span,
        bank = a[2] + (b[2] - a[2]) * t + 0.12,
        ramp = Math.min(1, t / BRIDGE.ramp, (1 - t) / BRIDGE.ramp);
      const ends = end0 + (end1 - end0) * t;
      return ends + (bank - ends) * ramp + BRIDGE.crown * Math.sin(Math.PI * t);
    };
    const knots = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1].map((t) => s0 + span * t);
    for (let k = 0; k < knots.length - 1; k++) {
      const sa = knots[k]!,
        sb = knots[k + 1]!;
      plank(X(sa), Z(sa), X(sb), Z(sb), top(sa), top(sb), BRIDGE.width, '#c08a4c', 0.35, owner);
      // A thicker edge beam under each side of the deck, so it reads as built and not a board on the water.
      for (const side of [-1, 1])
        add(
          beam(
            X(sa, side * (BRIDGE.width / 2 - 0.05)),
            top(sa) - 0.3,
            Z(sa, side * (BRIDGE.width / 2 - 0.05)),
            X(sb, side * (BRIDGE.width / 2 - 0.05)),
            top(sb) - 0.3,
            Z(sb, side * (BRIDGE.width / 2 - 0.05)),
            0.16,
            0.42,
            edge,
          ),
        );
    }
    // Rails over the water only: they stop short of the ends, each on a stout post with a cap.
    const r0 = s0 + BRIDGE.railIn,
      r1 = s1 - BRIDGE.railIn,
      railKnots = [r0, ...knots.filter((s) => s > r0 + 0.5 && s < r1 - 0.5), r1];
    const half = BRIDGE.width / 2 - 0.1;
    for (const side of [-1, 1]) {
      for (const s of railKnots) {
        const stout = s === r0 || s === r1,
          w = stout ? 0.26 : 0.16,
          h = BRIDGE.railH + (stout ? 0.25 : 0);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), post);
        m.position.set(X(s, side * half), top(s) + h / 2, Z(s, side * half));
        m.castShadow = true;
        add(m);
        if (stout) {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.08, w + 0.08), rail);
          cap.position.set(m.position.x, top(s) + h + 0.04, m.position.z);
          add(cap);
        }
      }
      for (let k = 0; k < railKnots.length - 1; k++) {
        const sa = railKnots[k]!,
          sb = railKnots[k + 1]!;
        const m = beam(
          X(sa, side * half),
          top(sa) + BRIDGE.railH,
          Z(sa, side * half),
          X(sb, side * half),
          top(sb) + BRIDGE.railH,
          Z(sb, side * half),
          0.1,
          0.1,
          rail,
        );
        add(m);
        // The rail holds you in: what looks solid is solid, posts included.
        const full = Math.hypot(sb - sa, top(sb) - top(sa));
        addStatic(
          { kind: 'box', hx: 0.13, hy: BRIDGE.railH / 2 + 0.05, hz: full / 2 + 0.13 },
          { x: m.position.x, y: m.position.y - BRIDGE.railH / 2, z: m.position.z },
          m.quaternion,
          GROUP.SCENERY,
          owner,
        );
      }
    }
  }
}

/** A drawn timber of w × h section between two points, pitched to follow them. */
function beam(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  w: number,
  h: number,
  material: THREE.Material,
) {
  const dx = bx - ax,
    dz = bz - az,
    len = Math.hypot(dx, dz);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, Math.hypot(len, by - ay)), material);
  m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  m.quaternion.setFromEuler(new THREE.Euler(-Math.atan2(by - ay, len), Math.atan2(dx, dz), 0, 'YXZ'));
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- what stands across the sea
// Too far to reach: a dark island with a broken ring on it and a bright shard in the ring's middle, hazy over a kilometre.
function buildFar(owner: OwnedView) {
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
  const cones = hills.map(([dx, dz, r, h, color]) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), FLAT(color));
    m.position.set(X + dx, h / 2 - 4, Z + dz);
    m.rotation.y = dx;
    owner.add(m);
    return m;
  });
  // Hidden while Ring Island's near ground is up (./far-hills.ts): the cones have no cuttings and nothing solid.
  setFarHills(cones);
  owner.cleanup(() => setFarHills([]));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(120, 13, 6, 22, Math.PI * 1.45), FLAT('#2c2e3a'));
  ring.position.set(X + 10, 120, Z);
  ring.rotation.set(0, -0.3, 0.45);
  owner.add(ring);
  const shard = new THREE.Mesh(
    new THREE.OctahedronGeometry(38, 0),
    readableGlow(new THREE.MeshStandardNodeMaterial({ color: '#7fd0ff', emissive: '#58c8ff', emissiveIntensity: 1.6 })),
  );
  shard.scale.set(0.55, 1.5, 0.55);
  shard.position.set(X + 10, 140, Z);
  owner.add(shard);
  owner.cleanup(() => shard.material.dispose());
}

export function buildLand(owner: OwnedView) {
  buildMesh(owner);
  if (SHORE_COAST) {
    // A simple solid timber landing over the existing cove. Its inland end rests on the
    // unchanged dry pad, so arrival and saved-position ground checks still use the terrain.
    const dx = SHORE_LANDING.x + ORIGIN.x,
      dz = SHORE_LANDING.z;
    for (let i = 0; i < 12; i++)
      plank(dx - 19 + i * 2, dz, dx - 17.02 + i * 2, dz, 3.08, 3.08, 7, '#8a6238', 0.35, owner);
    for (const x of [dx - 18, dx - 12])
      for (const z of [dz - 3.2, dz + 3.2]) {
        const base = sampleFootprint(boxFootprint(x, z, 0.4, 0.4)).low - 0.02,
          height = 4 - base;
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, height, 0.4),
          paletteMaterial(TIMBER('#7f5630', 'y'), 'timber', owner),
        );
        post.position.set(x, base + height / 2, z);
        post.castShadow = post.receiveShadow = true;
        owner.add(post);
        addStatic({ kind: 'box', hx: 0.2, hy: height / 2, hz: 0.2 }, post.position, undefined, undefined, owner);
      }
    // Keep the existing low rock as a shoulder detail, clear of the ordinary walk into town.
    const { x, height, top, bottom } = SHORE_HOP;
    const z = SHORE_HOP.z + 7,
      y = H(x + ORIGIN.x, z);
    const rock = new THREE.Mesh(
      new THREE.CylinderGeometry(top, bottom, height, 7),
      paletteMaterial(FLAT(spireRock('#8c8478')), 'stone', owner),
    );
    rock.position.set(x + ORIGIN.x, y + height / 2, z + ORIGIN.z);
    rock.castShadow = rock.receiveShadow = true;
    owner.add(rock);
    addStatic(
      { kind: 'cylinder', rTop: top, rBottom: bottom, h: height, segments: 7 },
      rock.position,
      undefined,
      GROUP.SCENERY,
      owner,
    );
  }
  buildSpire(owner);
  buildBridges(owner);
  buildFar(owner);
}
