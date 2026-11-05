// Local presentation envelope, from Buddy's authored head and the widest earned brim.
import * as THREE from 'three/webgpu';

export const HAT_SEAT = 0.43;
export const HAT_RADIUS = 0.56;
export const sideCarryOffset = (radius: number) => HAT_RADIUS + radius + 0.06;
const center = new THREE.Vector3();
const bounds = new THREE.Box3();

/** The rigid head's centre, including the current clip/pose, in world space. */
export function headCenter(avatar: THREE.Object3D, out: THREE.Vector3) {
  const head = avatar.getObjectByName('Head');
  if (head) return head.localToWorld(out.set(0, 0.24, 0));
  return avatar.localToWorld(out.set(0, 0.9, 0));
}

/** Reveals clear the actual equipped hat, including very tall shop hats. */
export function headwearTop(avatar: THREE.Object3D) {
  let top = headCenter(avatar, center).y + 0.29;
  const hat = avatar.getObjectByName('wear_place_hat');
  if (hat?.visible) top = Math.max(top, bounds.setFromObject(hat).max.y);
  return top;
}
