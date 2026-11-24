// The canyon kit on the canyon climb (docs/plans/terrain-clean.md, Part 3, step 2; Chunky Sunshine blocks): sandstone
// faces on the east wall, boulders at its foot, caps on the plateau's lip and low rock at the waterline. Every piece is a
// record (content/prefabs/terrain.ts) standing where content/levels/canyon-kit.ts puts it, one instance batch per piece.
// Local scenery: no state, no sync. Its solids are client walk colliders. A solid never appears around a player: a piece
// whose solids Buddy stands in when the kit arrives waits, neither drawn nor solid, until Buddy is clear of it (the clearance rule of
// sites.ts, by waiting rather than moving: a view moves no bodies outside the prefab door).
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import url from '../../../assets/built/terrain-kit.glb?url';
import { registerAsset } from '../../render/asset-manifest.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { me } from '../../player/player.ts';
import { HEAD_OFFSET, PLAYER_R } from '../../constants.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { setTerrainKit } from '../../prefab/builders/terrain-kit.ts';
import type { PrefabKey } from '../../prefab/types.ts';
import level from '../../../content/built/levels/canyon-kit.json' with { type: 'json' };

registerAsset({ id: 'terrain-kit', url, kind: 'model', priority: 'soon' });

/** A piece's geometry in metres, as floats: meshopt quantizes positions and puts the scale on the node. COLOR_0's red
 * is the block's shade. */
function bake(mesh: THREE.Mesh) {
  const src = mesh.geometry;
  const g = new THREE.BufferGeometry();
  const floats = (name: string) => {
    const a = src.getAttribute(name);
    const f = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) f.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
    return new THREE.BufferAttribute(f, 3);
  };
  g.setAttribute('position', floats('position'));
  g.setAttribute('normal', floats('normal'));
  g.setAttribute('color', floats('color'));
  g.setIndex(src.index);
  g.applyMatrix4(mesh.matrixWorld);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

type Solid = ReturnType<typeof instantiate>['solids'][number];
/** How far a point is from a placed box solid (0 inside it); other shapes count as far. */
function outside(shape: Solid, p: THREE.Vector3) {
  if (shape.kind !== 'box' || !shape.offset) return Infinity;
  const local = p.clone().sub(new THREE.Vector3(shape.offset.x, shape.offset.y, shape.offset.z));
  if (shape.rotation) {
    const q = shape.rotation;
    local.applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w).invert());
  }
  const dx = Math.max(0, Math.abs(local.x) - shape.hx),
    dy = Math.max(0, Math.abs(local.y) - shape.hy),
    dz = Math.max(0, Math.abs(local.z) - shape.hz);
  return Math.hypot(dx, dy, dz);
}

export type TerrainKitView = Awaited<ReturnType<typeof createTerrainKitView>>;

export async function createTerrainKitView() {
  const owner = createOwnedView();
  owner.root.name = 'terrain-kit';
  const [gltf, { ORIGIN }] = await Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url),
    import('../../place/layout.ts'),
  ]);
  gltf.scene.updateMatrixWorld(true);
  const pieces = new Map<string, THREE.BufferGeometry>();
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) pieces.set(o.parent?.name && !o.name ? o.parent.name : o.name, bake(o));
  });
  setTerrainKit(pieces);
  owner.cleanup(() => {
    for (const g of pieces.values()) g.dispose();
  });

  const placements = loadLevelArtifact(level, definitions).placements;
  const counts = new Map<PrefabKey, number>();
  for (const p of placements) counts.set(p.prefab, (counts.get(p.prefab) ?? 0) + 1);
  const batches = new Map([...counts].map(([key, n]) => [key, createPrefabBatch(key, n, owner)]));
  const used = new Map<PrefabKey, number>();
  const things = placements.map((p) => {
    const index = used.get(p.prefab) ?? 0;
    used.set(p.prefab, index + 1);
    return instantiate(
      p.prefab,
      { ...p, pos: [p.pos[0] + ORIGIN.x, p.pos[1], p.pos[2] + ORIGIN.z] },
      { owner, batch: { target: batches.get(p.prefab)!, index }, still: true },
    );
  });

  // Clearance: a piece whose solids hold Buddy's foot or head sphere waits until Buddy has stepped clear (an instance batch draws a piece only while it is enabled).
  const waiting = new Set(things);
  const clear = () => {
    const body = me.body;
    for (const thing of waiting) {
      const inside =
        body &&
        [0, HEAD_OFFSET].some((up) => {
          const p = new THREE.Vector3(body.position.x, body.position.y + up, body.position.z);
          return thing.solids.some((s) => outside(s, p) < PLAYER_R);
        });
      if (inside) continue;
      thing.setEnabled(true);
      waiting.delete(thing);
    }
  };
  clear();

  return {
    root: owner.root,
    /** Each frame until every piece is solid. */
    update: () => {
      if (waiting.size) clear();
    },
    inspect: () => ({ pieces: things.length, batches: batches.size, waiting: waiting.size }),
    dispose: () => owner.dispose(),
  };
}
