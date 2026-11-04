// Local draw safety. Buffers keep their allocation for the lifetime of these batches.
// A rejected visual count must never change inventory, accepted effects or simulation state.
import type * as THREE from 'three/webgpu';
import { playMark } from '../proto/mark.ts';

const reported = new WeakSet<THREE.Object3D>();
const guarded = new WeakSet<THREE.Object3D>();
let marks = 0;

export function boundedDrawCount(object: THREE.Object3D, requested: number, capacity: number): number {
  const count = Number.isFinite(requested) ? Math.max(0, Math.min(capacity, Math.floor(requested))) : 0;
  if (count !== requested && !reported.has(object) && marks < 32) {
    reported.add(object);
    marks++;
    playMark('draw count bounded', {
      draw: object.name || object.type,
      id: object.id,
      requested: Number.isFinite(requested) ? requested : String(requested),
      capacity,
      count,
    });
  }
  return count;
}

/** Protect later count assignments too. Clones need their own guard; shrinking buffers requires reassignment. */
export function guardDrawCount<T extends THREE.Object3D & { count: number }>(
  object: T,
  capacity: () => number,
  name: string,
): T {
  object.name = name;
  if (guarded.has(object)) return object;
  guarded.add(object);
  let count = object.count;
  // Preserve partMesh's prefix-to-child routing setter.
  const descriptor = Object.getOwnPropertyDescriptor(object, 'count');
  Object.defineProperty(object, 'count', {
    configurable: true,
    enumerable: true,
    get: () => count,
    set: (requested: number) => {
      count = boundedDrawCount(object, requested, capacity());
      descriptor?.set?.call(object, count);
    },
  });
  object.count = count;
  return object;
}

export const instanceCapacity = (mesh: THREE.InstancedMesh) =>
  Math.min(mesh.instanceMatrix.count, mesh.instanceColor?.count ?? Infinity);

export function guardInstances<T extends THREE.InstancedMesh>(mesh: T, name: string): T {
  mesh.instanceMatrix.name = `${name} #${mesh.id} matrices`;
  if (mesh.instanceColor) mesh.instanceColor.name = `${name} #${mesh.id} colors`;
  return guardDrawCount(mesh, () => instanceCapacity(mesh), name);
}
