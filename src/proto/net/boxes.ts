// Greybox boxes for ?proto=net: the shape of src/proto/era/blocks.ts drawn in one instanced mesh per set, each box grown
// from the ground by a fraction. (The builder is the era swap's; src/proto/era/index.ts runs that whole prototype on
// import, so it isn't shared.)
import * as THREE from 'three/webgpu';
import { scene } from '../../render/scene.ts';
import { groundHeight } from '../../island/terrain.ts';
import type { Block } from '../era/blocks.ts';

export type Smoke = { x: number; y: number; z: number };
/** One box: where it stands, and `local`, the unit box placed relative to that point. `pop`: s to rise. */
export type Box = {
  x: number;
  y: number;
  z: number;
  local: THREE.Matrix4;
  color: THREE.Color;
  tall: boolean;
  pop: number;
};

const Y = new THREE.Vector3(0, 1, 0);
const tq = new THREE.Quaternion(),
  tp = new THREE.Vector3(),
  ts = new THREE.Vector3(),
  tm = new THREE.Matrix4();
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
export const box = (x: number, z: number, local: THREE.Matrix4, color: string, tall = false, pop = 0.7): Box => ({
  x,
  y: groundHeight(x, z),
  z,
  local,
  color: new THREE.Color(color),
  tall,
  pop,
});

export function blockBoxes(b: Block, smokes: Smoke[]): Box[] {
  const yaw = b.yaw ?? 0,
    y0 = b.y ?? 0;
  const pop = b.kind.startsWith('landmark') ? 1.8 : 0.7;
  const out = [box(b.x, b.z, place(0, y0, 0, b.w, b.h, b.d, yaw), b.color, y0 + b.h > 3, pop)];
  if (b.top) {
    const o = b.top.over ?? 0;
    out.push(box(b.x, b.z, place(0, y0 + b.h, 0, b.w + o, b.top.h, b.d + o, yaw), b.top.color, false, pop));
  }
  if (b.pitch) {
    const o = b.pitch.over ?? 0,
      eave = (b.d + o) / 2,
      { rise } = b.pitch;
    const tilt = Math.atan2(rise, eave),
      slope = Math.hypot(rise, eave);
    for (const side of [-1, 1]) {
      const m = place(
        0,
        y0 + b.h + rise / 2 - 0.1,
        (side * eave) / 2,
        b.w + o,
        0.16,
        slope,
        yaw,
        new THREE.Euler(side * tilt, 0, 0),
      );
      out.push(box(b.x, b.z, m, b.pitch.color, false, pop));
    }
    out.push(box(b.x, b.z, place(0, y0 + b.h, 0, b.w * 0.92, rise * 0.55, b.d * 0.5, yaw), b.color, false, pop));
  }
  if (b.chimney) {
    const { h, dx = 0, dz = 0 } = b.chimney;
    if (h > 0) out.push(box(b.x, b.z, place(dx, y0 + b.h, dz, 0.7, h, 0.7, yaw), '#9a4a3a', false, pop));
    tp.set(dx, 0, dz).applyAxisAngle(Y, yaw);
    smokes.push({ x: b.x + tp.x, y: groundHeight(b.x, b.z) + y0 + b.h + h, z: b.z + tp.z });
  }
  return out;
}

const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0); // a unit box standing on its base
const mat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, flatShading: true });
export type BoxSet = { boxes: Box[]; mesh: THREE.InstancedMesh };
export function makeSet(boxes: Box[]): BoxSet {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, boxes.length));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  boxes.forEach((b, k) => mesh.setColorAt(k, b.color));
  scene.add(mesh);
  const set = { boxes, mesh };
  draw(set, () => 0);
  return set;
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
/** Draws a set with each box grown to f(k) of its height, from the ground up (0 hides it). */
export function draw(set: BoxSet, f: (k: number) => number): void {
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
