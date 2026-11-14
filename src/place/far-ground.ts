// The coarser far ground, Dev Graphics → farGround. Pattern: Chunked LOD (see far-ground-index.ts), the terrain practice of
// Unity Terrain patches and Unreal Landscape components. On by default since the 11 November perf pass (Windows D3D12:
// the one 241,836-triangle ground draw was 34% of a frame even a kilometre away; matched stills in docs/research/performance.md
// section 10 show no visible change); `?dev=1&graphics=farGround:false` brings back the one full-density mesh land.ts builds.
// Why that mesh is never culled: land.ts sets frustumCulled = false on it (a prototype default, no vertex displacement),
// and one mesh over the whole island could not be culled anyway, since the camera stands inside its bounds. On, that mesh hides and its main
// grid draws as tiles with bounds, so the frustum drops what is out of view, and tiles far from the camera use coarser
// cells. The cove's fine patch and the offshore rings are drawn at full density, split three by three so each part is culled. Ring Island's ground
// (entities/ring-island/view.ts) uses the same tiles with no extra part; its view is at the world origin, so a mesh's
// local frame is the world's.
//
// No cracks: every tile keeps full resolution along its own border, so neighbours of any level meet on the same vertices.
// Inside a coarse tile a block of S x S cells is two triangles when all four neighbours are blocks, otherwise a fan from
// its centre vertex that keeps every vertex on the sides that face full-resolution cells. Vertices, normals and the
// cove shader's attributes are the full mesh's own, so near tiles are exactly the old ground. Local rendering only.
import * as THREE from 'three/webgpu';
import { camera, scene } from '../render/scene.ts';
import { registerGraphics, graphicsInitial } from '../graphics-settings.ts';
import { setViewGeometry, type OwnedView } from '../render/owned-view.ts';
import { lodLevel } from '../render/lod-level.ts';
import { tileIndex, type TileCells } from './far-ground-index.ts';

/** Cells per tile side (192 m). */
export const GROUND_TILE = 96;
const TILE = GROUND_TILE;
/** Cells the nearest level draws finer than the grid (the terrain pass's 1 m rock): `skip` names them, `triangles`
 * gives a tile's own, and the full mesh's index holds them from `restEnd` on. Coarser levels draw those cells plainly. */
export type NearGround = {
  skip: (i: number, j: number) => boolean;
  triangles: (cells: TileCells) => number[];
  restEnd: number;
};
// [step in cells, from this distance (m) between the camera and the tile's bounds]. Step 1 is the full grid.
const LEVELS: readonly [step: number, from: number][] = [
  [1, 0],
  [2, 180],
  [4, 420],
];

const LEVEL_FROM = LEVELS.map(([, from]) => from);

type Tile = { mesh: THREE.Mesh; levels: THREE.BufferGeometry[]; box: THREE.Box3; level: number };
type Built = { group: THREE.Group; tiles: Tile[] };
// Tiles are built the first time the setting is on, so the default ground costs nothing extra at load.
type View = { full: THREE.Mesh; build: () => Built; built: Built | null };
const views = new Set<View>();
const CHOICES = [false, true] as const;
let enabled = graphicsInitial('farGround', CHOICES, true) === true;

registerGraphics({
  id: 'farGround',
  label: 'Coarser far ground',
  choices: CHOICES,
  default: true,
  applyMode: 'live',
  cost: 'ground triangles and one draw per visible tile',
  skips:
    'Culls ground tiles out of view and draws far tiles with 4 m and 8 m cells; near tiles and the cove are unchanged.',
  read: () => enabled,
  apply: (value) => {
    enabled = value === true;
    for (const view of views) show(view);
  },
});

function show(view: View) {
  if (enabled && !view.built) view.built = view.build();
  view.full.visible = !enabled;
  if (view.built) view.built.group.visible = enabled;
}

const p = new THREE.Vector3();
const NONE: Tile[] = [];
// Levels follow the camera the scene is drawn with, chosen before the renderer culls: frozen captures that move the
// camera and call renderFrame() without a game frame see the right tiles too. Shadow and probe cameras are ignored.
const previous = scene.onBeforeRender;
scene.onBeforeRender = function (renderer, drawn, cam, geometry, material, group) {
  previous.call(this, renderer, drawn, cam, geometry, material, group);
  if (cam === camera) pick();
};
function pick() {
  if (!enabled || !views.size) return;
  p.copy(camera.position);
  for (const view of views)
    for (const tile of view.built?.tiles ?? NONE) {
      const d = Math.hypot(
        Math.max(tile.box.min.x - p.x, 0, p.x - tile.box.max.x),
        Math.max(tile.box.min.z - p.z, 0, p.z - tile.box.max.z),
      );
      const level = lodLevel(LEVEL_FROM, d);
      if (level === tile.level) continue;
      tile.level = level;
      setViewGeometry(tile.mesh, tile.levels[level]!);
    }
}

/**
 * Tiles for the main grid of `full` (cells nx-1 by nz-1, vertex `i + j * nx`); `skip` names cells the full mesh leaves
 * out (the cove's fine patch). `mainEnd` is where the main grid's quads end in its index; what follows draws as is.
 * The mesh must sit untransformed in the world. Returns what to call when the view goes away (without an `owner`).
 */
export function addFarGround(
  full: THREE.Mesh,
  nx: number,
  nz: number,
  mainEnd: number,
  skip: (i: number, j: number) => boolean,
  owner?: OwnedView,
  near?: NearGround,
) {
  const made: THREE.BufferGeometry[] = [];
  const view: View = { full, build: () => build(full, nx, nz, mainEnd, skip, made, owner, near), built: null };
  const dispose = () => {
    views.delete(view);
    for (const geo of made) geo.dispose();
  };
  owner?.cleanup(dispose);
  views.add(view);
  show(view);
  return dispose;
}

function build(
  full: THREE.Mesh,
  nx: number,
  nz: number,
  mainEnd: number,
  skip: (i: number, j: number) => boolean,
  made: THREE.BufferGeometry[],
  owner?: OwnedView,
  near?: NearGround,
): Built {
  const source = full.geometry;
  const index = source.getIndex()!.array;
  const group = new THREE.Group();
  group.name = 'far ground tiles';
  const tiles: Tile[] = [];

  // A geometry over a subset of the full mesh's vertices, compacted so a tile carries only its own.
  const compact = (triangles: number[]) => {
    const remap = new Map<number, number>();
    const local = new Uint32Array(triangles.length);
    triangles.forEach((v, k) => {
      let n = remap.get(v);
      if (n === undefined) remap.set(v, (n = remap.size));
      local[k] = n;
    });
    const geo = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(source.attributes)) {
      const size = attribute.itemSize;
      const out = new Float32Array(remap.size * size);
      const src = attribute.array as Float32Array;
      for (const [v, n] of remap) for (let c = 0; c < size; c++) out[n * size + c] = src[v * size + c]!;
      geo.setAttribute(name, new THREE.BufferAttribute(out, size));
    }
    geo.setIndex(new THREE.BufferAttribute(local, 1));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    made.push(geo);
    return geo;
  };

  for (let j0 = 0; j0 < nz - 1; j0 += TILE)
    for (let i0 = 0; i0 < nx - 1; i0 += TILE) {
      const i1 = Math.min(i0 + TILE, nx - 1),
        j1 = Math.min(j0 + TILE, nz - 1);
      const cells: TileCells = [i0, j0, i1, j1];
      const levels = LEVELS.map(([s], level) =>
        compact(
          level === 0 && near
            ? [...tileIndex(nx, cells, s, (i, j) => skip(i, j) || near.skip(i, j)), ...near.triangles(cells)]
            : tileIndex(nx, cells, s, skip),
        ),
      );
      const mesh = new THREE.Mesh(levels[0]!, full.material);
      mesh.receiveShadow = full.receiveShadow;
      mesh.castShadow = full.castShadow;
      tiles.push({ mesh, levels, box: levels[0]!.boundingBox!.clone(), level: 0 });
      group.add(mesh);
    }
  // The cove's fine patch and the offshore rings: everything after the main grid. One mesh over the whole island could
  // never be culled, so the triangles go into a 3 x 3 split by where each lies (centroid) over the rest's own extent: the
  // four sides, the four corners and the middle (the cove). Each has its own bounds, so a side behind the camera is dropped.
  if (mainEnd < index.length) {
    const position = source.getAttribute('position') as THREE.BufferAttribute;
    const triangles = Array.from(index.subarray(mainEnd, near?.restEnd ?? index.length));
    const centre = (t: number, axis: 'getX' | 'getZ') =>
      (position[axis](triangles[t]!) + position[axis](triangles[t + 1]!) + position[axis](triangles[t + 2]!)) / 3;
    const lo = [Infinity, Infinity],
      hi = [-Infinity, -Infinity];
    for (let t = 0; t < triangles.length; t += 3)
      ['getX', 'getZ'].forEach((axis, k) => {
        const c = centre(t, axis as 'getX' | 'getZ');
        lo[k] = Math.min(lo[k]!, c);
        hi[k] = Math.max(hi[k]!, c);
      });
    const split = new Map<number, number[]>();
    const third = (c: number, k: number) => Math.min(2, Math.floor((3 * (c - lo[k]!)) / (hi[k]! - lo[k]! || 1)));
    for (let t = 0; t < triangles.length; t += 3) {
      const cell = third(centre(t, 'getX'), 0) + 3 * third(centre(t, 'getZ'), 1);
      const list = split.get(cell) ?? [];
      list.push(triangles[t]!, triangles[t + 1]!, triangles[t + 2]!);
      split.set(cell, list);
    }
    for (const list of split.values()) {
      const part = new THREE.Mesh(compact(list), full.material);
      part.name = 'far ground rest';
      part.receiveShadow = full.receiveShadow;
      group.add(part);
    }
  }

  // An owner takes its own copies of the geometries it sees (setViewGeometry copies the other levels once); `made` stays ours.
  if (owner) owner.add(group);
  else full.parent?.add(group);
  return { group, tiles };
}
