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
};

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
