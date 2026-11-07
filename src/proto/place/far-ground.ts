// The coarser far ground, behind Dev Graphics → farGround (owner call, 7 November 2026: off by default, stills before it
// becomes the default). Off, the ground stays the one full-density mesh land.ts builds. On, that mesh hides and its main
// grid draws as tiles with bounds, so the frustum drops what is out of view, and tiles far from the camera use coarser
// cells. The cove's fine patch and the offshore rings stay one always-drawn mesh, unchanged.
//
// No cracks: every tile keeps full resolution along its own border, so neighbours of any level meet on the same vertices.
// Inside a coarse tile a block of S x S cells is two triangles when all four neighbours are blocks, otherwise a fan from
// its centre vertex that keeps every vertex on the sides that face full-resolution cells. Vertices, normals and the
// cove shader's attributes are the full mesh's own, so near tiles are exactly the old ground. Local rendering only.
import * as THREE from 'three/webgpu';
import { camera, scene } from '../../render/scene.ts';
import { registerGraphics, graphicsInitial } from '../../graphics-settings.ts';
import { setViewGeometry, type OwnedView } from '../../render/owned-view.ts';

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
let enabled = graphicsInitial('farGround', CHOICES, false) === true;

registerGraphics({
  id: 'farGround',
  label: 'Coarser far ground',
  choices: CHOICES,
  default: false,
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
  const at = (i: number, j: number) => i + j * nx;
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
      const quad = (out: number[], i: number, j: number) => {
        if (skip(i, j)) return;
        const a = at(i, j),
          b = at(i + 1, j),
          c = at(i, j + 1),
          d = at(i + 1, j + 1);
        out.push(a, c, b, b, c, d);
      };
      const levels = LEVELS.map(([s]) => {
        const out: number[] = [];
        const ba = Math.floor((i1 - i0) / s),
          bb = Math.floor((j1 - j0) / s);
        // A block is coarse when it lies whole inside the tile and none of its cells is skipped.
        const block = (a: number, b: number) => {
          if (s === 1 || a < 0 || b < 0 || a >= ba || b >= bb) return false;
          for (let j = j0 + b * s; j < j0 + (b + 1) * s; j++)
            for (let i = i0 + a * s; i < i0 + (a + 1) * s; i++) if (skip(i, j)) return false;
          return true;
        };
        const covered = (i: number, j: number) => {
          const a = Math.floor((i - i0) / s),
            b = Math.floor((j - j0) / s);
          return block(a, b);
        };
        for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) if (!covered(i, j)) quad(out, i, j);
        for (let b = 0; b < bb; b++)
          for (let a = 0; a < ba; a++) {
            if (!block(a, b)) continue;
            const x = i0 + a * s,
              y = j0 + b * s;
            const left = block(a - 1, b),
              top = block(a, b + 1),
              right = block(a + 1, b),
              bottom = block(a, b - 1);
            if (left && top && right && bottom) {
              const p0 = at(x, y),
                p1 = at(x + s, y),
                p2 = at(x, y + s),
                p3 = at(x + s, y + s);
              out.push(p0, p2, p1, p1, p2, p3);
              continue;
            }
            // Boundary in the winding of the full mesh's (a, c, b): up the left side, along the top, down the right,
            // back along the bottom. Sides facing a block keep only their corners.
            const ring: number[] = [];
            const side = (coarse: boolean, from: [number, number], step: [number, number]) => {
              for (let k = 0; k < s; k += coarse ? s : 1) ring.push(at(from[0] + step[0] * k, from[1] + step[1] * k));
            };
            side(left, [x, y], [0, 1]);
            side(top, [x, y + s], [1, 0]);
            side(right, [x + s, y + s], [0, -1]);
            side(bottom, [x + s, y], [-1, 0]);
            const centre = at(x + s / 2, y + s / 2);
            for (let k = 0; k < ring.length; k++) out.push(centre, ring[k]!, ring[(k + 1) % ring.length]!);
          }
        return compact(out);
      });
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
