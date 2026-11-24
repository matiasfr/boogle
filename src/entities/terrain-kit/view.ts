// The canyon kit on the canyon climb (docs/plans/terrain-clean.md, Part 3, step 2; Chunky Sunshine blocks): sandstone
// faces on the east wall, boulders at its foot, caps on the plateau's lip and low rock at the waterline. Every piece is a
// record (content/prefabs/terrain.ts) standing where content/levels/canyon-kit.ts puts it, one instance batch per piece.
// Local scenery: no state, no sync. Its solids are client walk colliders. A solid never appears around a player: a piece
// whose solids Buddy stands in when the kit arrives waits, neither drawn nor solid, until Buddy is clear of it (the clearance rule of
// sites.ts, by waiting rather than moving: a view moves no bodies outside the prefab door).
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { registerAsset } from '../../render/asset-manifest.ts';
import url from './kit-url.ts';
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
    for (let i = 0; i < a.count; i++) {
      f[i * 3] = a.getX(i);
      f[i * 3 + 1] = a.getY(i);
      f[i * 3 + 2] = a.getZ(i);
    }
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
/** A box solid, ready to measure against: its centre and the rotation back into its own frame. */
const boxOf = (s: Solid) =>
  s.kind === 'box' && s.offset
    ? {
        centre: new THREE.Vector3(s.offset.x, s.offset.y, s.offset.z),
        back: s.rotation ? new THREE.Quaternion(s.rotation.x, s.rotation.y, s.rotation.z, s.rotation.w).invert() : null,
        half: new THREE.Vector3(s.hx, s.hy, s.hz),
      }
    : null;
const local = new THREE.Vector3();
/** How far a point is from a box solid (0 inside it). */
function outside(box: NonNullable<ReturnType<typeof boxOf>>, p: THREE.Vector3) {
  local.subVectors(p, box.centre);
  if (box.back) local.applyQuaternion(box.back);
  return Math.hypot(
    Math.max(0, Math.abs(local.x) - box.half.x),
    Math.max(0, Math.abs(local.y) - box.half.y),
    Math.max(0, Math.abs(local.z) - box.half.z),
  );
}

/** m: a move this far between two fixed steps is a relocation (a return, a respawn, a teleport), not walking or falling:
 * 5 m/s for a 60 Hz step is under 0.1 m. */
const RELOCATED = 1;

export async function createTerrainKitView() {
  const owner = createOwnedView();
  owner.root.name = 'terrain-kit';
  try {
    return await build(owner);
  } catch (error) {
    owner.dispose(); // whatever the failed build made, baked pieces included, goes with it
    throw error;
  }
}

async function build(owner: ReturnType<typeof createOwnedView>) {
  const [gltf, { ORIGIN }] = await Promise.all([
    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url),
    import('../../place/layout.ts'),
  ]);
  gltf.scene.updateMatrixWorld(true);
  const pieces = new Map<string, THREE.BufferGeometry>();
  owner.cleanup(() => {
    setTerrainKit(new Map()); // the builder keeps no disposed geometry reachable
    for (const g of pieces.values()) g.dispose();
  });
  const meshes: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => {
    if (o instanceof THREE.Mesh) meshes.push(o);
  });
  try {
    for (const o of meshes) pieces.set(o.name || o.parent!.name, bake(o));
  } finally {
    for (const o of meshes) o.geometry.dispose(); // the file's quantized copies, baked or not: only baked ones are drawn
  }
  setTerrainKit(pieces);

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

  // Clearance, each fixed step after the player's own moves: a piece never turns solid around Buddy. At mount, a piece
  // whose boxes hold either of Buddy's spheres waits until Buddy is clear. Afterwards only a relocation (Buddy more
  // than RELOCATED from the last step: a return, a respawn, a teleport) can send a solid piece back to waiting, and only
  // if Buddy landed inside it. Contact never does: a landing or a brush sinks the feet a few centimetres for a step,
  // which is the solver's to resolve. A waiting piece is not drawn either: an instance batch draws a piece only while it
  // is enabled.
  const kit = things.map((thing) => ({
    thing,
    boxes: thing.solids.map(boxOf).filter((b): b is NonNullable<typeof b> => b !== null),
    solid: false,
  }));
  const probe = new THREE.Vector3();
  /** How far Buddy's nearer sphere centre is from a piece's solids. */
  const gap = (body: NonNullable<typeof me.body>, boxes: (typeof kit)[number]['boxes']) => {
    let near = Infinity;
    for (const up of [0, HEAD_OFFSET]) {
      probe.set(body.position.x, body.position.y + up, body.position.z);
      for (const b of boxes) near = Math.min(near, outside(b, probe));
    }
    return near;
  };
  let last: { body: unknown; x: number; y: number; z: number } | null = null;
  const settle = () => {
    const body = me.body;
    const relocated =
      !!body &&
      (!last ||
        last.body !== body ||
        Math.hypot(body.position.x - last.x, body.position.y - last.y, body.position.z - last.z) > RELOCATED);
    last = body ? { body, x: body.position.x, y: body.position.y, z: body.position.z } : null;
    for (const piece of kit) {
      const near = body ? gap(body, piece.boxes) : Infinity;
      if (piece.solid && relocated && near < PLAYER_R) piece.thing.setEnabled((piece.solid = false));
      else if (!piece.solid && near >= PLAYER_R) piece.thing.setEnabled((piece.solid = true));
    }
  };
  settle();

  return {
    root: owner.root,
    /** Each fixed step, before it solves. */
    fixedPre: settle,
    inspect: () => ({ pieces: things.length, batches: batches.size, waiting: kit.filter((k) => !k.solid).length }),
    dispose: () => owner.dispose(),
  };
}
