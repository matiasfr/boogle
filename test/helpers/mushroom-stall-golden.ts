// The mushroom stall's world output (src/adapters/mushrooms.ts), headless: every mesh's world pose, geometry and
// material (its canvases' every paint call), every collider with its material, the footprint, the entity it spawns and
// the Take target the stand offers (near, far, already carrying a bag), in build order.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sourceModule } from '../../dev/level/source.ts';
import { HALF, REACH, SEA, PLAYER_R, HEAD_OFFSET } from '../../src/constants.ts';
import { worldColliders, worldMeshes } from './poi-golden.ts';
const { GROUP } = await import('../../src/physics/physics.ts');

type BodySpec = Parameters<typeof worldColliders>[0][number] & { material?: unknown };

/** A canvas that remembers every call and property set on its context, in order. */
export function canvasDocument() {
  return {
    createElement: () => {
      const calls: unknown[] = [];
      const g = new Proxy(
        {},
        {
          get:
            (_, k) =>
            (...args: unknown[]) =>
              calls.push([String(k), ...args]),
          set: (_, k, v) => (calls.push([String(k), '=', v]), true),
        },
      );
      const canvas = { calls, getContext: () => g } as Record<string, unknown>;
      return new Proxy(canvas, {
        set: (t, k, v) => (calls.push([String(k), '=', v]), (t[k as string] = v), true),
      });
    },
  };
}

/** A made-up slope, so the stall's height above the ground is read through. */
export const groundAt = (x: number, z: number) => 1.25 + 0.031 * x - 0.017 * z;

/** Bindings the stall's module reads: the item models over the same THREE, the physics and entity stubs recording. */
export function stallBindings() {
  const bodies: BodySpec[] = [],
    spawned: { kind: string; mesh?: THREE.Object3D; bodies?: unknown[] }[] = [],
    obstacles: { x: number; z: number; r: number }[] = [],
    taken: string[] = [];
  const held = { id: null as string | null };
  const me = {
    entered: true,
    body: null as null | { interpolatedPosition: THREE.Vector3; position: THREE.Vector3 },
  };
  const { itemModel } = sourceModule<typeof import('../../src/player/item-models.ts')>(
    fs.readFileSync('src/player/item-models.ts', 'utf8'),
    { THREE },
  );
  const createBody = (spec: BodySpec) => {
    bodies.push(spec);
    return spec;
  };
  return {
    bodies,
    spawned,
    obstacles,
    taken,
    held,
    me,
    createBody,
    bindings: {
      THREE,
      mergeGeometries,
      HALF,
      REACH,
      SEA,
      PLAYER_R,
      HEAD_OFFSET,
      reducedMotion: false,
      groundHeight: groundAt,
      defineKind() {},
      spawn: (e: (typeof spawned)[number]) => (spawned.push(e), e),
      despawn() {},
      obstacles,
      groundMat: 'ground',
      GROUP,
      material: (name: string) => name,
      createBody,
      forEachContact() {},
      me,
      net: {},
      onRoomReady() {},
      waterField: {},
      dropPoint() {},
      splash() {},
      itemModel,
      take: (id: string) => taken.push(id),
      heldId: () => held.id,
      createLimiter: () => ({ allow: () => true }),
      NO_TARGETS: [],
      document: canvasDocument(),
    },
  };
}

type Stall = { createStall(): void; stallTargets(): { id: string; verb: string; at: THREE.Vector3; run(): void }[] };

/** Builds the stall (`create`, the module's exports bound by the caller) and reads back everything it placed. */
export function captureStall(c: ReturnType<typeof stallBindings>, module: Stall) {
  const before = module.stallTargets().length; // nothing to take before the stall stands
  module.createStall();
  const meshes = c.spawned.flatMap((e) => (e.mesh ? worldMeshes(e.mesh) : []));
  const maps: unknown[] = [];
  for (const e of c.spawned)
    e.mesh?.traverse((o) => {
      const map = ((o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined)?.map;
      if (map) maps.push({ colorSpace: map.colorSpace, calls: (map.image as { calls: unknown[] }).calls });
    });
  // Players around the stall's pickup: beside it, just in reach, out of reach; then carrying a bag.
  const targets: unknown[] = [];
  const at = (x: number, y: number, z: number) => {
    const p = new THREE.Vector3(x, y, z);
    c.me.body = { interpolatedPosition: p, position: p };
    return module.stallTargets().map((t) => {
      t.run();
      return { id: t.id, verb: t.verb, at: [t.at.x, t.at.y, t.at.z] };
    });
  };
  const s = c.obstacles[0]!;
  for (const [dx, dz] of [
    [0.5, 0.5],
    [REACH + 0.5, 0],
    [0, -(REACH + 0.55)],
    [REACH + 0.7, 0],
    [0, REACH + 0.65],
  ])
    targets.push(at(s.x + dx!, 2, s.z + dz!));
  c.held.id = 'seeds';
  targets.push(at(s.x, 2, s.z));
  c.held.id = null;
  c.me.entered = false;
  targets.push(at(s.x, 2, s.z));
  return {
    before,
    meshes,
    maps,
    colliders: worldColliders(c.bodies).map((w, i) => ({ ...w, material: c.bodies[i]!.material })),
    obstacles: c.obstacles,
    entities: c.spawned.map((e) => e.kind), // the bodies: which entity or owner holds them is not the world
    targets,
    taken: c.taken,
  };
}

/** The unconverted stall, its module run as it is. */
export function captureStallBefore() {
  const c = stallBindings();
  const module = sourceModule<Stall>(fs.readFileSync('src/adapters/mushrooms.ts', 'utf8'), c.bindings);
  return captureStall(c, module);
}
