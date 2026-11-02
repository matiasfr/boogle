// Clips from one humanoid skeleton onto another. Each bone keeps its offset from its own rest pose in world space, so an
// A-posed figure can play clips made on a T-posed one: target world rotation = source world rotation × source rest⁻¹ ×
// target rest. The hips also move, scaled by hip height. Sampled once at load, then played like any other clip.
import * as THREE from 'three/webgpu';

export const UAL_TO_MESHY: Record<string, string> = {
  pelvis: 'Hips',
  spine_01: 'Spine02',
  spine_02: 'Spine01',
  spine_03: 'Spine',
  neck_01: 'neck',
  Head: 'Head',
  clavicle_l: 'LeftShoulder',
  upperarm_l: 'LeftArm',
  lowerarm_l: 'LeftForeArm',
  hand_l: 'LeftHand',
  thigh_l: 'LeftUpLeg',
  calf_l: 'LeftLeg',
  foot_l: 'LeftFoot',
  ball_l: 'LeftToeBase',
  clavicle_r: 'RightShoulder',
  upperarm_r: 'RightArm',
  lowerarm_r: 'RightForeArm',
  hand_r: 'RightHand',
  thigh_r: 'RightUpLeg',
  calf_r: 'RightLeg',
  foot_r: 'RightFoot',
  ball_r: 'RightToeBase',
};
/** For a figure with the library's own bone names, in other proportions (assets/src/buddy.py). */
export const UAL_TO_SELF: Record<string, string> = Object.fromEntries(Object.keys(UAL_TO_MESHY).map((k) => [k, k]));
const FPS = 30;

/** Both roots at the origin in their rest poses. Returns the clip on the target's bones, and the hips' height ratio. */
export function retargetClip(
  clip: THREE.AnimationClip,
  src: THREE.Object3D,
  tgt: THREE.Object3D,
  { map = UAL_TO_MESHY, armOut = 0 }: { map?: Record<string, string>; armOut?: number } = {},
) {
  src.updateMatrixWorld(true);
  tgt.updateMatrixWorld(true);
  const q = () => new THREE.Quaternion();
  const worldQ = (o: THREE.Object3D) => o.getWorldQuaternion(q());
  const pairs = Object.entries(map).map(([s, t]) => {
    const a = src.getObjectByName(s),
      b = tgt.getObjectByName(t);
    if (!a || !b) throw new Error(`retarget: no bone ${a ? t : s}`);
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
  const Z = new THREE.Vector3(0, 0, 1);
  for (let f = 0; f < frames; f++) {
    const t = Math.min(clip.duration, f / FPS);
    times.push(t);
    act.time = t;
    mixer.update(0);
    src.updateMatrixWorld(true);
    world.clear();
    for (const pair of pairs) {
      const want = worldQ(pair.a).multiply(pair.restA).multiply(pair.restB);
      // A wider body than the source's: swing the upper arms out so the hands clear it (the figure faces +z, left is +x).
      if (armOut && pair.b.name === 'LeftArm') want.premultiply(out.setFromAxisAngle(Z, armOut));
      if (armOut && pair.b.name === 'RightArm') want.premultiply(out.setFromAxisAngle(Z, -armOut));
      world.set(pair.b, want);
    }
    // Local = parent's world⁻¹ × this bone's world.
    for (const pair of pairs) {
      const local = parentWorld(pair.b.parent!).clone().invert().multiply(world.get(pair.b)!);
      pair.track.push(local.x, local.y, local.z, local.w);
    }
    p.copy(hips.a.getWorldPosition(p)).sub(headA).multiplyScalar(ratio).add(headB);
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
