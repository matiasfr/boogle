// Clips from one humanoid skeleton onto another. Each bone keeps its offset from its own rest pose in world space, so an
// A-posed figure can play clips made on a T-posed one: target world rotation = source world rotation × source rest⁻¹ ×
// target rest. The hips also move, scaled by hip height. Sampled once at load, then played like any other clip.
import * as THREE from 'three/webgpu';

// The clips' bones, which a target names the same; the hips first. Other bones (a Buddy's eyes) keep still.
const BONES = [
  'pelvis',
  'spine_01',
  'spine_02',
  'spine_03',
  'neck_01',
  'Head',
  'clavicle_l',
  'upperarm_l',
  'lowerarm_l',
  'hand_l',
  'thigh_l',
  'calf_l',
  'foot_l',
  'ball_l',
  'clavicle_r',
  'upperarm_r',
  'lowerarm_r',
  'hand_r',
  'thigh_r',
  'calf_r',
  'foot_r',
  'ball_r',
];
const FPS = 30;
const HIP_CALM = 0.5;

/** Both roots at the origin in their rest poses. Returns the clip on the target's bones, and the hips' height ratio. */
export function retargetClip(
  clip: THREE.AnimationClip,
  src: THREE.Object3D,
  tgt: THREE.Object3D,
  { armOut = 0 }: { armOut?: number } = {},
) {
  src.updateMatrixWorld(true);
  tgt.updateMatrixWorld(true);
  const q = () => new THREE.Quaternion();
  const worldQ = (o: THREE.Object3D) => o.getWorldQuaternion(q());
  const pairs = BONES.map((name) => {
    const a = src.getObjectByName(name),
      b = tgt.getObjectByName(name);
    if (!a || !b) throw new Error(`retarget: no bone ${name}`);
    return { a, b, restA: worldQ(a).invert(), restB: worldQ(b), track: [] as number[] };
  });
  const hips = pairs[0]!;
  const headA = hips.a.getWorldPosition(new THREE.Vector3()),
    headB = hips.b.getWorldPosition(new THREE.Vector3());
  const ratio = headB.y / headA.y;
  const hipParent = hips.b.parent!;
  const hipTrack: number[] = [],
    times: number[] = [];

  const mixer = new THREE.AnimationMixer(src);
  const act = mixer.clipAction(clip).play();
  const frames = Math.max(2, Math.round(clip.duration * FPS) + 1);
  const world = new Map<THREE.Object3D, THREE.Quaternion>();
  const parentWorld = (o: THREE.Object3D): THREE.Quaternion => {
    const known = world.get(o);
    if (known) return known;
    return worldQ(o); // above the skeleton's mapped bones: never animated
  };
  const p = new THREE.Vector3(),
    out = new THREE.Quaternion();
  const Z = new THREE.Vector3(0, 0, 1),
    X = new THREE.Vector3(1, 0, 0);
  const sample = (t: number) => {
    act.time = t;
    mixer.update(0);
    src.updateMatrixWorld(true);
  };
  // The library's head looks down (about 13 degrees in its idle). Ours looks ahead: each clip's average pitch comes off
  // the head, and its bob stays.
  const headPair = pairs.find((x) => x.a.name === 'Head')!;
  let pitch = 0;
  for (let f = 0; f < frames; f++) {
    sample(Math.min(clip.duration, f / FPS));
    pitch += Math.asin(p.copy(Z).applyQuaternion(worldQ(headPair.a).multiply(headPair.restA)).y) / frames;
  }
  const level = new THREE.Quaternion().setFromAxisAngle(X, pitch);
  // The library's hips roll and twist to carry a lean body; on a round one that reads as its mass shifting. Half of it
  // comes off, and half of their sideways sway.
  const hipMean = new THREE.Quaternion(0, 0, 0, 0);
  for (let f = 0; f < frames; f++) {
    sample(Math.min(clip.duration, f / FPS));
    const h = worldQ(hips.a).multiply(hips.restA).multiply(hips.restB);
    const sign = h.dot(hipMean) < 0 ? -1 : 1;
    hipMean.set(hipMean.x + sign * h.x, hipMean.y + sign * h.y, hipMean.z + sign * h.z, hipMean.w + sign * h.w);
  }
  hipMean.normalize();
  for (let f = 0; f < frames; f++) {
    const t = Math.min(clip.duration, f / FPS);
    times.push(t);
    sample(t);
    world.clear();
    for (const pair of pairs) {
      const want = worldQ(pair.a).multiply(pair.restA).multiply(pair.restB);
      // A wider body than the source's: swing the upper arms out so the hands clear it (the figure faces +z, left is +x).
      if (armOut && pair.a.name === 'upperarm_l') want.premultiply(out.setFromAxisAngle(Z, armOut));
      if (armOut && pair.a.name === 'upperarm_r') want.premultiply(out.setFromAxisAngle(Z, -armOut));
      if (pair === headPair) want.premultiply(level);
      if (pair === hips) want.slerp(hipMean, HIP_CALM);
      world.set(pair.b, want);
    }
    // Local = parent's world⁻¹ × this bone's world.
    for (const pair of pairs) {
      const local = parentWorld(pair.b.parent!).clone().invert().multiply(world.get(pair.b)!);
      pair.track.push(local.x, local.y, local.z, local.w);
    }
    p.copy(hips.a.getWorldPosition(p)).sub(headA).multiplyScalar(ratio);
    p.x *= 1 - HIP_CALM;
    p.add(headB);
    hipParent.worldToLocal(p);
    hipTrack.push(p.x, p.y, p.z);
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(src);
  const tracks: THREE.KeyframeTrack[] = pairs.map(
    (x) => new THREE.QuaternionKeyframeTrack(`${x.b.name}.quaternion`, times, x.track),
  );
  tracks.push(new THREE.VectorKeyframeTrack(`${hips.b.name}.position`, times, hipTrack));
  return { clip: new THREE.AnimationClip(clip.name, clip.duration, tracks), ratio };
}
