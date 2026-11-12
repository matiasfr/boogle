// The coarser far ground, Dev Graphics → farGround. Pattern: Chunked LOD (see far-ground-index.ts), the terrain practice of
// Unity Terrain patches and Unreal Landscape components. On by default since the 11 November perf pass (Windows D3D12:
// the one 241,836-triangle ground draw was 34% of a frame even a kilometre away; matched stills in docs/research/performance.md
// section 10 show no visible change); `?dev=1&graphics=farGround:false` brings back the one full-density mesh land.ts builds.
// Why that mesh is never culled: land.ts sets frustumCulled = false on it (a prototype default, no vertex displacement),
// and one mesh over the whole island could not be culled anyway, since the camera stands inside its bounds. On, that mesh hides and its main
// grid draws as tiles with bounds, so the frustum drops what is out of view, and tiles far from the camera use coarser
// cells. The cove's fine patch and the offshore rings stay one always-drawn mesh, unchanged.
//
// No cracks: every tile keeps full resolution along its own border, so neighbours of any level meet on the same vertices.
// Inside a coarse tile a block of S x S cells is two triangles when all four neighbours are blocks, otherwise a fan from
// its centre vertex that keeps every vertex on the sides that face full-resolution cells. Vertices, normals and the
// cove shader's attributes are the full mesh's own, so near tiles are exactly the old ground. Local rendering only.
import * as THREE from 'three/webgpu';
import { camera, scene } from '../render/scene.ts';
import { registerGraphics, graphicsInitial } from '../graphics-settings.ts';
import { setViewGeometry, type OwnedView } from '../render/owned-view.ts';
import { tileIndex } from './far-ground-index.ts';

const TILE = 96; // cells per tile side (192 m)
// [step in cells, from this distance (m) between the camera and the tile's bounds]. Step 1 is the full grid.
const LEVELS: readonly [step: number, from: number][] = [
  [1, 0],
  [2, 180],
  [4, 420],
];

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
      let level = 0;
      while (level + 1 < LEVELS.length && d >= LEVELS[level + 1]![1]) level++;
      if (level === tile.level) continue;
      tile.level = level;
      setViewGeometry(tile.mesh, tile.levels[level]!);
    }
}

/**
 * Tiles for the main grid of `full` (cells nx-1 by nz-1, vertex `i + j * nx`); `skip` names cells the full mesh leaves
 * out (the cove's fine patch). `mainEnd` is where the main grid's quads end in its index; what follows draws as is.
 */
export function addFarGround(
  full: THREE.Mesh,
  nx: number,
  nz: number,
  mainEnd: number,
  skip: (i: number, j: number) => boolean,
  owner?: OwnedView,
) {
  const made: THREE.BufferGeometry[] = [];
  const view: View = { full, build: () => build(full, nx, nz, mainEnd, skip, made, owner), built: null };
  owner?.cleanup(() => {
    views.delete(view);
    for (const geo of made) geo.dispose();
  });
  views.add(view);
  show(view);
}

function build(
  full: THREE.Mesh,
  nx: number,
  nz: number,
  mainEnd: number,
  skip: (i: number, j: number) => boolean,
  made: THREE.BufferGeometry[],
  owner?: OwnedView,
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
      const levels = LEVELS.map(([s]) => compact(tileIndex(nx, [i0, j0, i1, j1], s, skip)));
      const mesh = new THREE.Mesh(levels[0]!, full.material);
      mesh.receiveShadow = full.receiveShadow;
      mesh.castShadow = full.castShadow;
      tiles.push({ mesh, levels, box: levels[0]!.boundingBox!.clone(), level: 0 });
      group.add(mesh);
    }
  // The cove's fine patch and the offshore rings: everything after the main grid, drawn as before.
  const rest = compact(Array.from(index.subarray(mainEnd)));
  const restMesh = new THREE.Mesh(rest, full.material);
  restMesh.receiveShadow = full.receiveShadow;
  restMesh.frustumCulled = false;
  group.add(restMesh);

  // An owner takes its own copies of the geometries it sees (setViewGeometry copies the other levels once); `made` stays ours.
  if (owner) owner.add(group);
  else full.parent?.add(group);
  return { group, tiles };
}
