// Pure box records and transforms. No scene, terrain or game lifecycle.
import * as THREE from 'three/webgpu';
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
  if (!shapes.size) return mesh;
  const routes = new Map<number, { mesh: THREE.InstancedMesh; at: number }>();
  const children: THREE.InstancedMesh[] = [];
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
    children.push(child);
  }
  // Callers install their board material after construction; every shape uses that same material.
  Object.defineProperty(mesh, 'material', {
    get: () => material,
    set: (next: THREE.Material) => {
      material = next;
      for (const child of children) child.material = next;
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
  return mesh;
}

const tm = new THREE.Matrix4();
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
