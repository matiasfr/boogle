// The terrain pass on Home's ground (docs/plans/terrain-pass.md). Without a parameter (or `?terrain`, `?terrain=1`) the
// pass covers all of Home, in the land's own geometry and material (home.ts, island.ts; owner, 10 November). `?terrain=0`
// is the land before the pass. The other values keep the earlier rounds on one wedge south of the village, for
// comparison: the wedge's cells leave the land's index (and its far tiles) and a separate mesh draws them. The collider,
// H, the shore texture, the tree catalog and the level check never see any of it: they keep terrain.ts's grid.
//   wedge — round two on the wedge alone: today's 2 m triangles on walkable ground and 1 m strata ledges on unwalkable
//        cells only; grass down to a beach, a wet band at the sea, and the cove's textured sandstone, subtle beds, on
//        unwalkable rock only.
//   a  — a 0.5 m drawn mesh (strata ledges on rock, smooth-surface normals on grass) with colour bands from position
//        and normal, no textures.
//   b  — today's 2 m mesh with the west cove's textured layers.
//   ab — a's mesh with b's material.
// `&terrainSub=1|2|4` sets a/ab's density (vertices per 2 m cell side, default 4); `&terrainMat=base|bands|cove`
// overrides the material (base: Place's ordinary ground material), for isolating geometry from shading.
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { GRID, ORIGIN } from '../../place/layout.ts';
import { CELL, NX, NZ, at } from '../../place/terrain.ts';
import { groundMaterial } from '../../place/look.ts';
import { applyPathSurface } from '../../place/path-surface.ts';
import { bandsMaterial, coveLayersMaterial, roundTwoMaterial } from './materials.ts';
import { buildSteepSurface, buildWedgeSurface, edgeFade, wedgeCell } from './surface.ts';

const query = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const asked = query.get('terrain');
// No parameter, a bare `?terrain` or `?terrain=1`: the pass on all of Home (home.ts). `0`: the land before the pass.
const variant = asked === null || asked === '' || asked === '1' ? 'home' : asked;
/** Whether the pass is applied to all of Home's ground (the default). */
export const homePassOn = variant === 'home';
export { applyHomePass } from './home.ts';
export { roundTwoMaterial } from './materials.ts';

const wedgeOn = variant === 'wedge' || variant === 'a' || variant === 'b' || variant === 'ab';
/** Whether the wedge's own mesh draws cell (i, j), so the land (and its far tiles) must leave it out. */
export const wedgeDraws = (i: number, j: number) => wedgeOn && wedgeCell(i, j);

/** Draw the wedge in place of `mesh`'s cells, when `?terrain=` asks for it. `mesh` is Place's ground (land.ts). */
export function applyTerrainPass(mesh: THREE.Mesh, owner?: OwnedView) {
  if (!wedgeOn) return;
  const fine = variant !== 'b';
  const sub = fine ? Math.max(1, Math.min(8, Math.round(Number(query.get('terrainSub') ?? 4)))) : 1;
  const ground = mesh.geometry;
  const grid = NX * NZ;
  // 1. The main ground stops drawing the wedge's cells (the grid's own quads only; offshore rings and the cove stay).
  const source = ground.index!.array;
  const kept: number[] = [];
  for (let t = 0; t < source.length; t += 3) {
    const a = source[t]!,
      b = source[t + 1]!,
      c = source[t + 2]!;
    if (a < grid && b < grid && c < grid) {
      const i = Math.min(a % NX, b % NX, c % NX),
        j = Math.min(Math.floor(a / NX), Math.floor(b / NX), Math.floor(c / NX));
      if (wedgeCell(i, j)) continue;
    }
    kept.push(a, b, c);
  }
  ground.setIndex(kept);

  // 2. The wedge's own mesh, its border sharing the main ground's positions, colours and normals.
  const s = variant === 'wedge' ? buildSteepSurface() : buildWedgeSurface(sub, fine);
  const count = s.position.length / 3;
  const mainColour = ground.getAttribute('color'),
    mainNormal = ground.getAttribute('normal');
  const colour = new Float32Array(count * 3),
    normal = s.normal.slice();
  const lerpGrid = (
    attr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    x: number,
    z: number,
    out: number[],
  ) => {
    const fx = (x - GRID.x0) / CELL,
      fz = (z - GRID.z0) / CELL;
    const i = Math.min(Math.floor(fx), NX - 2),
      j = Math.min(Math.floor(fz), NZ - 2),
      u = fx - i,
      v = fz - j;
    const w = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
    const ids = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
    for (let axis = 0; axis < 3; axis++)
      out[axis] = ids.reduce((sum, id, n) => sum + attr.getComponent(id, axis) * w[n]!, 0);
  };
  const tmp = [0, 0, 0];
  for (let k = 0; k < count; k++) {
    const x = s.position[k * 3]! - ORIGIN.x,
      z = s.position[k * 3 + 2]! - ORIGIN.z;
    lerpGrid(mainColour, x, z, tmp);
    colour.set(tmp, k * 3);
    lerpGrid(mainNormal, x, z, tmp);
    // Coarse: exactly today's normals. Fine: today's at the border, the pass's own 6 m in.
    const w = fine ? edgeFade(x, z) : 0;
    const n = new THREE.Vector3(
      tmp[0]! + (s.normal[k * 3]! - tmp[0]!) * w,
      tmp[1]! + (s.normal[k * 3 + 1]! - tmp[1]!) * w,
      tmp[2]! + (s.normal[k * 3 + 2]! - tmp[2]!) * w,
    ).normalize();
    normal.set([n.x, n.y, n.z], k * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(s.position, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colour, 3));
  geo.setAttribute('covePath', new THREE.BufferAttribute(s.path, 1));
  geo.setAttribute('coveCapJoin', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  geo.setAttribute('tpSteep', new THREE.BufferAttribute(s.steep, 1));
  geo.setAttribute('tpFoot', new THREE.BufferAttribute(s.foot, 1));
  geo.setAttribute('tpGorge', new THREE.BufferAttribute(s.gorge, 1));
  geo.setAttribute('tpSoil', new THREE.BufferAttribute(s.soil, 1));
  const layers = new Float32Array(count * 4);
  for (let k = 0; k < count; k++) layers.set([s.steep[k]!, s.foot[k]!, s.soil[k]!, s.gorge[k]!], k * 4);
  geo.setAttribute('tpLayers', new THREE.BufferAttribute(layers, 4)); // round two's inputs, packed
  geo.setIndex(new THREE.BufferAttribute(s.index, 1));
  const pick = query.get('terrainMat') ?? (variant === 'wedge' ? 'round2' : variant === 'a' ? 'bands' : 'cove');
  const material =
    pick === 'base'
      ? groundMaterial()
      : pick === 'bands'
        ? bandsMaterial()
        : pick === 'round2'
          ? roundTwoMaterial()
          : coveLayersMaterial();
  applyPathSurface(material); // Home's paths, as on the land around the wedge
  const wedge = new THREE.Mesh(geo, material);
  wedge.name = `terrain-pass-${variant}`;
  wedge.receiveShadow = true;
  owner?.cleanup(() => material.dispose());
  if (owner) owner.add(wedge);
  else scene.add(wedge);
  console.log(
    'TERRAIN_PASS ' +
      JSON.stringify({
        variant,
        material: pick,
        cell: s.step,
        vertices: count,
        triangles: s.index.length / 3,
        replacedTriangles: (source.length - kept.length) / 3,
        origin: ORIGIN,
      }),
  );
}
