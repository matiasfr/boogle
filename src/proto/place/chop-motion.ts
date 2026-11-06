// Local curve and existing-rig arm posing. Play and the stage call this adapter after the body mixer.
import * as THREE from 'three/webgpu';
import { CHOP_CONTACT, CHOP_DURATION } from './chop-timing.ts';
export { CHOP_CONTACT, CHOP_DURATION } from './chop-timing.ts';
export const CHOP_TRUNK = { distance: 1.35, radius: 0.4, height: 2.3 };
export const CHOP_SIDE = 0.18;
/** Local Dev trial; never saved or sent. The floating tool remains the default. */
export const chopPresentation = { twoHanded: false };
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
export type ChopPoseOptions = { reducedMotion?: boolean; target?: THREE.Vector3; frame?: THREE.Object3D };
/** Floating summon in the avatar frame (-Z forward, +X right). Local presentation only: contact stays at CHOP_CONTACT. */
type FloatPose = { x: number; y: number; z: number; rx: number; ry: number; rz: number };
// Rest floats beside the right hip with the head at shoulder height; the strike keeps the old contact height.
const FLOAT_REST: FloatPose = { x: 0.5, y: 0.34, z: -0.1, rx: 0.2, ry: 0, rz: -0.18 };
const FLOAT_COCK: FloatPose = { x: 0.46, y: 0.64, z: -0.14, rx: 0.5, ry: 0, rz: -0.08 };
const FLOAT_HIT: FloatPose = { x: 0.4, y: 0.72, z: -0.32, rx: -1.35, ry: 0, rz: 0 };
const FLOAT_KICK: FloatPose = { x: 0.46, y: 0.68, z: -0.2, rx: 0.55, ry: 0, rz: -0.4 };
const FLOAT_FULL: FloatPose = { x: 0.5, y: 0.64, z: -0.14, rx: 0.6, ry: 0, rz: -0.9 };
/** Beats in seconds since the press; storyboard: appear, strike, bite, return, hover, disappear. */
export const FLOAT_BEATS = { appear: 0.06, cock: 0.05, bite: CHOP_CONTACT + 0.035, home: 0.4, fade: 0.72 };
const ease = {
  out: (u: number) => 1 - (1 - u) ** 2,
  in: (u: number) => u * u,
  inOut: (u: number) => u * u * (3 - 2 * u),
  back: (u: number) => 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2,
};
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
function blend(a: FloatPose, b: FloatPose, u: number, out: FloatPose) {
  out.x = mix(a.x, b.x, u);
  out.y = mix(a.y, b.y, u);
  out.z = mix(a.z, b.z, u);
  out.rx = mix(a.rx, b.rx, u);
  out.ry = mix(a.ry, b.ry, u);
  out.rz = mix(a.rz, b.rz, u);
  return out;
}
const span = (time: number, from: number, to: number) => clamp01((time - from) / (to - from));
/** Pure sampler for stage curves. `from` is where a repeat press finds the axe; `appearAt`/`fromScale` start the pop. */
export function sampleFloatingChop(
  time: number,
  response: ChopResponse,
  from: FloatPose = FLOAT_REST,
  appearAt = 0,
  fromScale = 0.15,
) {
  const out: FloatPose & { scale: number; visible: boolean } = { ...FLOAT_REST, scale: 1, visible: false };
  const b = FLOAT_BEATS,
    c = CHOP_CONTACT;
  if (time < b.cock) blend(from, FLOAT_COCK, ease.out(span(time, 0, b.cock)), out);
  // One arc, accelerating into the bark so it lands on the contact beat.
  else if (time < c) blend(FLOAT_COCK, FLOAT_HIT, ease.in(span(time, b.cock, c)), out);
  else if (response === 'rebound') {
    if (time < 0.22) blend(FLOAT_HIT, FLOAT_KICK, ease.out(span(time, c, 0.22)), out);
    else blend(FLOAT_KICK, FLOAT_REST, ease.inOut(span(time, 0.22, b.home)), out);
  } else if (response === 'full') {
    if (time < 0.28) blend(FLOAT_HIT, FLOAT_FULL, ease.out(span(time, c, 0.28)), out);
    else blend(FLOAT_FULL, FLOAT_REST, ease.inOut(span(time, 0.42, 0.62)), out);
  } else if (time < b.bite) blend(FLOAT_HIT, FLOAT_HIT, 0, out);
  else blend(FLOAT_HIT, FLOAT_REST, ease.inOut(span(time, b.bite, b.home)), out);
  // A gentle float once it is home; zero velocity at the join.
  if (time > b.home) out.y += 0.008 * (1 - Math.cos(((time - b.home) / 0.32) * Math.PI * 2));
  const appear = mix(fromScale, 1, ease.back(span(time, appearAt, appearAt + b.appear)));
  const v = span(time, b.fade, CHOP_DURATION);
  const vanish = v < 0.3 ? 1 + 0.12 * ease.out(v / 0.3) : 1.12 * (1 - ease.in((v - 0.3) / 0.7) ** 1.5);
  out.ry += Math.PI * v * v;
  out.y += 0.06 * v;
  out.scale = Math.max(0.001, appear * vanish);
  out.visible = time < CHOP_DURATION;
  return out;
}
type FloatMemory = {
  last: number;
  shown: boolean;
  appearAt: number;
  fromScale: number;
  from: FloatPose;
  pose: FloatPose & { scale: number };
};
const floating = new WeakMap<THREE.Object3D, FloatMemory>();
/** Appear beside you, strike once on the contact beat, return, then pop out. Production railway, legacy Place and the stage share it. */
export function applyFloatingChopPose(
  figure: THREE.Object3D,
  axe: THREE.Object3D,
  time: number,
  response: ChopResponse,
  frame = figure,
) {
  if (axe.parent !== frame) frame.add(axe);
  let m = floating.get(axe);
  if (!m) {
    m = {
      last: Infinity,
      shown: false,
      appearAt: 0,
      fromScale: 0.15,
      from: { ...FLOAT_REST },
      pose: { ...FLOAT_REST, scale: 0 },
    };
    floating.set(axe, m);
  }
  if (time < CHOP_DURATION && (time < m.last || !m.shown)) {
    if (m.shown && time < m.last) {
      // A repeat press while it is out: no second summon, the strike starts from where the axe is.
      Object.assign(m.from, m.pose);
      m.fromScale = m.pose.scale;
    } else {
      Object.assign(m.from, FLOAT_REST);
      m.fromScale = 0.15;
    }
    m.appearAt = time;
  }
  const pose = sampleFloatingChop(time, response, m.from, m.appearAt, m.fromScale);
  m.last = time;
  m.shown = pose.visible;
  Object.assign(m.pose, pose);
  axe.visible = pose.visible;
  axe.position.set(pose.x, pose.y, pose.z);
  axe.rotation.set(pose.rx, pose.ry, pose.rz);
  axe.scale.setScalar(pose.scale);
}

export function applyChopPose(
  figure: THREE.Object3D,
  axe: THREE.Object3D,
  time: number,
  response: ChopResponse,
  options: ChopPoseOptions = {},
) {
  if (!chopPresentation.twoHanded) {
    applyFloatingChopPose(figure, axe, time, response, options.frame);
    return;
  }
  const pose = sampleChop(time, response);
  axe.visible = pose.visible;
  axe.scale.setScalar(1);
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
