// Local curve and existing-rig arm posing. Play and the stage call this adapter after the body mixer.
import * as THREE from 'three/webgpu';
import { CHOP_CONTACT, CHOP_DURATION } from './chop-timing.ts';
export { CHOP_CONTACT, CHOP_DURATION } from './chop-timing.ts';
export const CHOP_TRUNK = { distance: 1.35, radius: 0.4, height: 2.3 };
export const CHOP_SIDE = 0.18;
export type ChopResponse = 'bite' | 'rebound' | 'full' | 'gone';
type Pose = { x: number; y: number; z: number; rx: number; rz: number; lean: number; contact: number };
const REST: Pose = { x: 0.03, y: 0.3, z: -0.32, rx: -0.6, rz: -0.18, lean: 0, contact: 0 };
const WIND: Pose = { x: 0.08, y: 0.48, z: -0.3, rx: 0.15, rz: -0.5, lean: 0.06, contact: 0 };
const HIT: Pose = { x: 0, y: 0.58, z: -0.24, rx: -1.15, rz: 0, lean: -0.06, contact: 1 };
const BOUNCE: Pose = { x: 0.06, y: 0.48, z: -0.23, rx: 0.25, rz: -0.55, lean: 0.06, contact: 0 };
const FULL: Pose = { x: 0.12, y: 0.43, z: -0.24, rx: 0.15, rz: -0.9, lean: 0.1, contact: 0 };
const SETTLE: Pose = { ...REST, y: 0.35, lean: -0.015 };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Seconds since press. No clock, state, rig or game dependency. */
export function sampleChop(time: number, response: ChopResponse) {
  const keys: [number, Pose][] = [
    [0, REST],
    [0.045, WIND],
    [CHOP_CONTACT, HIT],
    ...(response === 'full'
      ? ([
          [0.14, HIT],
          [0.26, FULL],
          [0.4, FULL],
          [0.62, REST],
        ] as [number, Pose][])
      : response === 'rebound'
        ? ([
            [0.13, HIT],
            [0.22, BOUNCE],
            [0.4, REST],
          ] as [number, Pose][])
        : ([
            [CHOP_CONTACT + 0.035, HIT],
            [0.24, SETTLE],
            [0.4, REST],
          ] as [number, Pose][])),
    [CHOP_DURATION, REST],
  ];
  let from = keys[0]!,
    to = keys[keys.length - 1]!;
  for (let i = 1; i < keys.length; i++) {
    to = keys[i]!;
    if (time <= to[0]) break;
    from = to;
  }
  const u = Math.max(0, Math.min(1, (time - from[0]) / Math.max(1e-6, to[0] - from[0])));
  const eased = u * u * (3 - 2 * u);
  const a = from[1],
    b = to[1];
  return {
    x: mix(a.x, b.x, eased),
    y: mix(a.y, b.y, eased),
    z: mix(a.z, b.z, eased),
    rx: mix(a.rx, b.rx, eased),
    rz: mix(a.rz, b.rz, eased),
    lean: mix(a.lean, b.lean, eased),
    contact: mix(a.contact, b.contact, eased),
    visible: time <= CHOP_DURATION,
  };
}
const position = new THREE.Vector3(),
  target = new THREE.Vector3(),
  hit = new THREE.Vector3();
const euler = new THREE.Euler(HIT.rx, 0, HIT.rz);
const shoulder = new THREE.Vector3(),
  elbow = new THREE.Vector3(),
  wrist = new THREE.Vector3();
const direction = new THREE.Vector3(),
  pole = new THREE.Vector3(),
  nextElbow = new THREE.Vector3();
const from = new THREE.Vector3(),
  to = new THREE.Vector3();
const rotation = new THREE.Quaternion(),
  parentRotation = new THREE.Quaternion(),
  turn = new THREE.Quaternion();
type Arm = { upper: THREE.Object3D; lower: THREE.Object3D; hand: THREE.Object3D; side: number };
const arms = new WeakMap<THREE.Object3D, Arm[]>();
function aim(bone: THREE.Object3D, end: THREE.Object3D, at: THREE.Vector3) {
  bone.getWorldPosition(position);
  end.getWorldPosition(from).sub(position).normalize();
  to.copy(at).sub(position).normalize();
  turn.setFromUnitVectors(from, to);
  bone.getWorldQuaternion(rotation).premultiply(turn);
  bone.parent!.getWorldQuaternion(parentRotation).invert();
  bone.quaternion.copy(parentRotation.multiply(rotation));
  bone.updateWorldMatrix(false, true);
}
/** Analytic two-bone reach; the palm extends 75 mm beyond Buddy's wrist. No bone lengths or weights change. */
function grip(arm: Arm, at: THREE.Vector3, figure: THREE.Object3D) {
  arm.upper.getWorldPosition(shoulder);
  arm.lower.getWorldPosition(elbow);
  arm.hand.getWorldPosition(wrist);
  const upperLength = shoulder.distanceTo(elbow),
    lowerLength = elbow.distanceTo(wrist) + 0.075;
  direction.copy(at).sub(shoulder);
  const distance = Math.max(0.001, Math.min(upperLength + lowerLength - 0.001, direction.length()));
  direction.normalize();
  pole.set(arm.side, -0.55, 0.2).transformDirection(figure.matrixWorld);
  pole.addScaledVector(direction, -pole.dot(direction)).normalize();
  const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
  const across = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
  nextElbow.copy(shoulder).addScaledVector(direction, along).addScaledVector(pole, across);
  aim(arm.upper, arm.lower, nextElbow);
  aim(arm.lower, arm.hand, at);
}
export type ChopPoseOptions = { reducedMotion?: boolean; target?: THREE.Vector3 };
export function applyChopPose(
  figure: THREE.Object3D,
  axe: THREE.Object3D,
  time: number,
  response: ChopResponse,
  options: ChopPoseOptions = {},
) {
  const pose = sampleChop(time, response);
  axe.visible = pose.visible;
  if (!pose.visible) return;
  // The old tool inherited the spine/cargo socket's height and twist. Its own frame lets both arms follow it.
  if (axe.parent !== figure) figure.add(axe);
  figure.rotation.x = options.reducedMotion ? 0 : pose.lean;
  figure.updateWorldMatrix(true, true);
  if (options.target) target.copy(options.target);
  else {
    target.set(CHOP_SIDE, 0.55, -(CHOP_TRUNK.distance - Math.sqrt(CHOP_TRUNK.radius ** 2 - CHOP_SIDE ** 2)));
    figure.parent!.localToWorld(target);
  }
  figure.worldToLocal(target);
  hit.copy(axe.getObjectByName('axe-blade-contact')!.position).applyEuler(euler);
  hit.subVectors(target, hit);
  // Interaction reaches 3.2 m. Keep real arm lengths rather than stretching the rig to a distant target.
  hit.x = Math.max(-0.24, Math.min(0.24, hit.x));
  hit.y = Math.max(0.25, Math.min(0.68, hit.y));
  hit.z = Math.max(-0.5, Math.min(0.1, hit.z));
  axe.position.set(
    pose.x + (hit.x - HIT.x) * pose.contact,
    pose.y + (hit.y - HIT.y) * pose.contact,
    pose.z + (hit.z - HIT.z) * pose.contact,
  );
  axe.rotation.set(pose.rx, 0, pose.rz);
  figure.updateWorldMatrix(true, true);
  let rig = arms.get(figure);
  if (!rig) {
    rig = [];
    for (const side of ['l', 'r']) {
      const upper = figure.getObjectByName('upperarm_' + side),
        lower = figure.getObjectByName('lowerarm_' + side),
        hand = figure.getObjectByName('hand_' + side);
      if (upper && lower && hand) rig.push({ upper, lower, hand, side: side === 'l' ? -1 : 1 });
    }
    arms.set(figure, rig);
  }
  for (const arm of rig) {
    axe.getObjectByName(arm.side < 0 ? 'axe-grip-left' : 'axe-grip-right')!.getWorldPosition(target);
    grip(arm, target, figure);
  }
}
