// Pure Local swing curve and its rig adapter, shared by play and the asset stage.
import type * as THREE from 'three/webgpu';
export const CHOP_DURATION = 0.9;
export const CHOP_CONTACT = 0.06;
export const CHOP_TRUNK = { distance: 1.35, radius: 0.4, height: 2.3 };
export type ChopResponse = 'bite' | 'rebound' | 'full' | 'gone';
export function sampleChop(time: number, response: ChopResponse) {
  const c = CHOP_CONTACT,
    raised = 1.5,
    struck = -1.35;
  let rx = 0.2,
    rz = 0,
    lean = 0;
  if (time < c) rx = raised + (struck - raised) * (time / c);
  else if (response === 'full' && time < 0.55) {
    const u = Math.sin(Math.min(1, (time - c) / 0.49) * Math.PI);
    rx = 0.2 + u * 2.2;
    rz = -u * 0.9;
    lean = u * 0.16;
  } else if (response === 'rebound' && time < 0.32) {
    const u = Math.min(1, (time - c) / 0.09);
    rx = struck + (raised - struck) * Math.sin(u * Math.PI * 0.5);
    rz = -0.45 * Math.sin(u * Math.PI);
  } else if (response === 'bite' && time < c + 0.035) rx = struck;
  else if (time < 0.3) rx = struck + (0.2 - struck) * ((time - c - 0.035) / (0.3 - c - 0.035));
  return { x: 0.42, y: 0.72, z: -0.2, rx, rz, lean, visible: time < CHOP_DURATION };
}
export function applyChopPose(figure: THREE.Object3D, axe: THREE.Object3D, time: number, response: ChopResponse) {
  const pose = sampleChop(time, response);
  axe.visible = pose.visible;
  axe.position.set(pose.x, pose.y, pose.z);
  axe.rotation.set(pose.rx, 0, pose.rz);
  if (response === 'full' && time >= CHOP_CONTACT && time < 0.55) figure.rotation.x = pose.lean;
}
