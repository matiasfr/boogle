// Pure box records and transforms. No scene, terrain or game lifecycle.
import * as THREE from 'three/webgpu';
import { guardInstances } from '../../render/draw-count.ts';
/** One box: where it stands, and `local`, the unit box placed relative to that point. `pop`: s to rise. */
export type Box = {
  x: number;
  y: number;
  z: number;
  local: THREE.Matrix4;
  color: THREE.Color;
  tall: boolean;
  pop: number;
  /** Local geometry only: fraction of the top depth removed, leaving the base unchanged. */
  taper?: number;
};

/** A base-standing box, optionally tapered to a ridge along x. Shared by the world and asset stage. */
export function partGeometry(taper = 0) {
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const p = geo.attributes.position!;
  for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setZ(i, p.getZ(i) * (1 - taper));
  geo.computeVertexNormals();
  return geo;
}

const unitBox = partGeometry();
const taperedGeometry = new Map<number, THREE.BufferGeometry>();
/** Keep piece indices stable, routing tapered pieces to child instances like the track's part batches. */
export function partMesh(boxes: Box[], material: THREE.Material) {
  const mesh = new THREE.InstancedMesh(unitBox, material, Math.max(1, boxes.length));
  boxes.forEach((b, k) => mesh.setColorAt(k, b.color));
  const shapes = new Map<number, number[]>();
  boxes.forEach((b, k) => {
    if (b.taper) {
      const slots = shapes.get(b.taper) ?? [];
      slots.push(k);
      shapes.set(b.taper, slots);
    }
  });
  if (!shapes.size) return guardInstances(mesh, 'box plan');
  const routes = new Map<number, { mesh: THREE.InstancedMesh; at: number }>();
  const batches: { mesh: THREE.InstancedMesh; slots: number[] }[] = [];
  for (const [taper, slots] of shapes) {
    let geo = taperedGeometry.get(taper);
    if (!geo) taperedGeometry.set(taper, (geo = partGeometry(taper)));
    const child = new THREE.InstancedMesh(geo, material, slots.length);
    child.castShadow = child.receiveShadow = true;
    child.frustumCulled = false;
    slots.forEach((k, at) => {
      child.setColorAt(at, boxes[k]!.color);
      routes.set(k, { mesh: child, at });
    });
    mesh.add(child);
    batches.push({ mesh: child, slots });
  }
  // count remains a prefix of the original piece list, including pieces routed to children.
  let count = mesh.count;
  Object.defineProperty(mesh, 'count', {
    configurable: true,
    get: () => count,
    set: (next: number) => {
      count = next;
      for (const batch of batches) {
        const end = batch.slots.findIndex((k) => k >= next);
        batch.mesh.count = end < 0 ? batch.slots.length : end;
      }
    },
  });
  // Callers install their board material after construction; every shape uses that same material.
  Object.defineProperty(mesh, 'material', {
    get: () => material,
    set: (next: THREE.Material) => {
      material = next;
      for (const batch of batches) batch.mesh.material = next;
    },
  });
  const write = mesh.setMatrixAt.bind(mesh);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  mesh.setMatrixAt = (k, matrix) => {
    const route = routes.get(k);
    write(k, route ? zero : matrix);
    if (route) {
      route.mesh.setMatrixAt(route.at, matrix);
      route.mesh.instanceMatrix.needsUpdate = true;
    }
    return mesh;
  };
  // Palette updates use the same original piece indices as transforms, including tapered gables.
  const paint = mesh.setColorAt.bind(mesh);
  mesh.setColorAt = (k, color) => {
    paint(k, color);
    const route = routes.get(k);
    if (route) {
      route.mesh.setColorAt(route.at, color);
      if (route.mesh.instanceColor) route.mesh.instanceColor.needsUpdate = true;
    }
    return mesh;
  };
  // InstancedMesh.dispose does not visit children. Release their instance buffers too;
  // shared geometry and caller-owned material retain the same lifetime as ordinary boxes.
  const dispose = mesh.dispose.bind(mesh);
  mesh.dispose = () => {
    for (const batch of batches) batch.mesh.dispose();
    dispose();
  };
  return guardInstances(mesh, 'box plan');
}

const tq = new THREE.Quaternion(),
  tp = new THREE.Vector3(),
  ts = new THREE.Vector3(),
  tm = new THREE.Matrix4();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
/** Draws a set with each box grown to f(k) of its height, from the ground up (0 hides it). */
export function draw(
  set: { boxes: Pick<Box, 'x' | 'y' | 'z' | 'local'>[]; mesh: THREE.InstancedMesh },
  f: (k: number) => number,
): void {
  let any = false;
  set.boxes.forEach((b, k) => {
    const g = f(k);
    if (g <= 0) return set.mesh.setMatrixAt(k, ZERO);
    any = true;
    tm.compose(tp.set(b.x, b.y, b.z), tq.identity(), ts.set(1, Math.max(1e-3, g), 1)).multiply(b.local);
    set.mesh.setMatrixAt(k, tm);
  });
  set.mesh.instanceMatrix.needsUpdate = true;
  set.mesh.visible = any;
}

/** The local matrix of a box w x h x d whose base middle is at (dx, dy, dz) in a frame turned by yaw, then tilted. */
export function place(
  dx: number,
  dy: number,
  dz: number,
  w: number,
  h: number,
  d: number,
  yaw = 0,
  tilt?: THREE.Euler,
) {
  const m = new THREE.Matrix4().makeRotationY(yaw);
  m.multiply(tm.makeTranslation(dx, dy, dz));
  if (tilt) m.multiply(tm.makeRotationFromEuler(tilt));
  return m.multiply(tm.makeScale(w, h, d));
}

export const boxAt = (
  x: number,
  y: number,
  z: number,
  local: THREE.Matrix4,
  color: string,
  tall = false,
  pop = 0.7,
): Box => ({ x, y, z, local, color: new THREE.Color(color), tall, pop });
