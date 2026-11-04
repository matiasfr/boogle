// What the Buddy does on top of its clips, all from what's happening and no new presence. It blinks; in the air it tucks a
// knee and reaches up while rising, and spreads its arms while falling (the library's jump is a stiff held pose). Carrying
// or holding something, its arms take a pose of their own, so the legs keep the clip's walk. Runs after the mixer, which
// rewrites these bones each frame. Offsets are about the figure's own axes as seen from the parent bone at rest: it faces
// +z, left is +x; +x swings a limb back and -x forward, +z swings the left arm out, +y opens the left elbow (a forearm's
// parent is the arm's T-pose). Sockets are where the game hangs what the figure carries.
import * as THREE from 'three/webgpu';
import { clamp } from '../../math.ts';

type Offset = [bone: string, axis: 'x' | 'y' | 'z', degrees: number];
const RISE: Offset[] = [
  ['thigh_l', 'x', -45],
  ['calf_l', 'x', 42],
  ['thigh_r', 'x', 12],
  ['calf_r', 'x', 22],
  ['upperarm_r', 'x', -30],
  ['upperarm_r', 'z', -35],
  ['lowerarm_r', 'y', -60], // the clip's elbows are bent: opened, or the mitts come up by the face
  ['upperarm_l', 'x', 12],
  ['upperarm_l', 'z', 22],
  ['lowerarm_l', 'y', 55],
  ['spine_02', 'x', -5],
];
const FALL: Offset[] = [
  ['thigh_l', 'x', -22],
  ['calf_l', 'x', 28],
  ['thigh_r', 'x', -8],
  ['calf_r', 'x', 14],
  ['upperarm_l', 'z', 38],
  ['upperarm_r', 'z', -38],
  ['spine_02', 'x', 4],
];
const SPRAWL: Offset[] = [
  ['thigh_l', 'z', 20],
  ['thigh_r', 'z', -20],
  ['calf_l', 'x', 12],
  ['calf_r', 'x', 18],
];
const RISE_AT = 4, // m/s where the rising pose is full
  FALL_AT = 6;
const FADE = { in: 0.07, out: 0.09, arm: 0.1, load: 0.2 }; // s
const BLINK = { closed: 0.1, every: 2, more: 3.5 }; // s; `every` + up to `more` between blinks
const HELD_SCALE = 0.82; // things in hand, made for the capsule's bulk
const HANG_HOLD = 0.8;
const RELEASE_MS = 240;
const LOAD_LEAN = { base: 5, full: 11, at: 16 }; // degrees forward with any load, and at this many logs

// Arm poses for the figure's left arm, mirrored for the right: where the upper arm and the forearm point, in its frame.
type V3 = [number, number, number];
const ARMS = {
  strap: { upper: [0.42, -0.9, -0.05], lower: [-0.45, 0.42, 0.8] }, // gripping the bundle's ropes at the chest
  hold: { upper: [0.18, -0.9, 0.34], lower: [-0.05, 0.08, 1] }, // something small held out in front
  hang: { upper: [0.38, -0.9, -0.05], lower: [0.12, -0.55, 0.82] }, // something with a handle, carried at the hip
  rest: { upper: [0.4, -0.9, 0.12], lower: [0.22, -0.95, 0.2] }, // seated, hands down at its sides
  windup: { upper: [0.75, 0.35, -0.55], lower: [0.1, 0.95, 0.2] }, // about to throw, the hand up behind its shoulder
  release: { upper: [0.35, 0.35, 0.87], lower: [0.1, -0.1, 1] }, // and after it, the arm flung forward
  reach: { upper: [0.45, -0.25, 0.85], lower: [0.1, 0.05, 1] }, // the beach ball, out at arm's length
  sprawl: { upper: [0.82, 0.25, -0.5], lower: [0.9, 0.42, -0.1] }, // flat on its back
  aloft: { upper: [0.18, 1, 0.08], lower: [-0.06, 1, 0.04] }, // both hands up, holding something over its head
} satisfies Record<string, { upper: V3; lower: V3 }>;
type ArmPose = keyof typeof ARMS;

const mirror = (name: string) => name.replace(/_l$/, '\0').replace(/_r$/, '_l').replace('\0', '_r');
const rot = (from: THREE.Vector3, to: V3) =>
  new THREE.Quaternion().setFromUnitVectors(from, new THREE.Vector3(...to).normalize());

export type LifeState = {
  vy: number;
  airborne: boolean;
  load: number; // pieces on its back
  hold: 'item' | 'hang' | 'ball' | null;
  seated: boolean;
  down: number; // 0..1: how far flopped over (src/features/impact.ts)
  charging?: boolean; // winding up a throw (your own only: no presence says so)
  aloft?: boolean; // holding something up over its head
};

export type LifeClock = { now: () => number; random: () => number };
export function makeLife(
  root: THREE.Object3D,
  rest: THREE.Object3D,
  clock: LifeClock = { now: () => performance.now(), random: Math.random },
) {
  const eyes = ['eye_l', 'eye_r'].map((n) => root.getObjectByName(n)).filter(Boolean) as THREE.Object3D[];
  rest.updateMatrixWorld(true);
  const named = (n: string) => root.getObjectByName(n)!,
    still = (n: string) => rest.getObjectByName(n)!;
  const restQ = (o: THREE.Object3D) => o.getWorldQuaternion(new THREE.Quaternion());
  const axes = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const bake = (offsets: Offset[], flip: boolean) =>
    offsets.map(([bone, axis, deg]) => {
      const name = flip ? mirror(bone) : bone;
      const local = axes[axis].clone().applyQuaternion(restQ(still(name).parent!).invert());
      // A mirrored swing out reverses; a swing back and forth doesn't.
      const rad = (((flip && axis !== 'x' ? -1 : 1) * deg) / 180) * Math.PI;
      return { live: named(name), q: new THREE.Quaternion().setFromAxisAngle(local, rad) };
    });
  const poses = [false, true].map((flip) => ({ rise: bake(RISE, flip), fall: bake(FALL, flip) }));
  const sprawl = bake(SPRAWL, false);
  const lean = {
    spine: named('spine_01'),
    head: named('Head'),
    fwd: axes.x.clone().applyQuaternion(restQ(still('spine_01').parent!).invert()),
    back: axes.x.clone().applyQuaternion(restQ(still('Head').parent!).invert()),
  };

  // An arm pose as local rotations: each bone's world rest rotation, turned so it points the pose's way.
  const armPose = (side: 'l' | 'r', pose: ArmPose) => {
    const m = side === 'l' ? 1 : -1;
    const [ux, uy, uz] = ARMS[pose].upper,
      [lx, ly, lz] = ARMS[pose].lower;
    const along = new THREE.Vector3(m, 0, 0); // the arm's T-pose
    const turnU = rot(along, [m * ux, uy, uz]),
      turnL = rot(along, [m * lx, ly, lz]);
    const u = still('upperarm_' + side),
      l = still('lowerarm_' + side),
      h = still('hand_' + side);
    const worldU = turnU.clone().multiply(restQ(u)),
      worldL = turnL.clone().multiply(restQ(l)),
      worldH = turnL.clone().multiply(restQ(h));
    return {
      upper: restQ(u.parent!).invert().multiply(worldU),
      lower: worldU.clone().invert().multiply(worldL),
      hand: worldL.clone().invert().multiply(worldH),
      worldH,
    };
  };
  const NAMES = Object.keys(ARMS) as ArmPose[];
  const arms = (['l', 'r'] as const).map((side) => ({
    upper: named('upperarm_' + side),
    lower: named('lowerarm_' + side),
    hand: named('hand_' + side),
    pose: Object.fromEntries(NAMES.map((n) => [n, armPose(side, n)])) as Record<ArmPose, ReturnType<typeof armPose>>,
    w: Object.fromEntries(NAMES.map((n) => [n, 0])) as Record<ArmPose, number>,
  }));
  const id = new THREE.Quaternion(),
    q = new THREE.Quaternion();
  // A frame allocates nothing here: plain loops, no closures or iterators (npm run hitches).
  const premultiplyAll = (bones: ReturnType<typeof bake>, t: number) => {
    for (let k = 0; k < bones.length; k++) {
      const o = bones[k]!;
      o.live.quaternion.premultiply(q.slerpQuaternions(id, o.q, t));
    }
  };
  let socket: { hand: THREE.Object3D; hold: THREE.Quaternion; hang: THREE.Quaternion } | null = null;

  let wasCharging = false,
    releasedAt = -1e9;
  let air = 0,
    wasAir = false,
    side = 0,
    nextBlink = BLINK.every + clock.random() * BLINK.more,
    blinkT = 1,
    leanNow = 0;
  return {
    blink() {
      blinkT = 0;
    },
    /** Sockets, in the avatar's inner group: `toInner` is the rest figure's placement there. */
    sockets(toInner: THREE.Matrix4) {
      const back = new THREE.Object3D(); // reads as the inner group at rest, but rides the back
      const spine = still('spine_02');
      new THREE.Matrix4()
        .multiplyMatrices(toInner, spine.matrixWorld)
        .invert()
        .decompose(back.position, back.quaternion, back.scale);
      named('spine_02').add(back);
      const hand = new THREE.Object3D(); // the mitt's middle, keeping what it holds upright in the arm's pose
      const upright = new THREE.Quaternion().setFromRotationMatrix(toInner);
      const uprightIn = (pose: ArmPose) => arms[1]!.pose[pose].worldH.clone().invert().multiply(upright);
      hand.position.set(0, 0.09, 0);
      hand.scale.setScalar(HELD_SCALE);
      socket = { hand, hold: uprightIn('hold'), hang: uprightIn('hang') };
      hand.quaternion.copy(socket.hold);
      named('hand_r').add(hand);
      return { back, hand };
    },
    update(dt: number, s: LifeState) {
      if (s.airborne && !wasAir) side = 1 - side; // the other knee on the next jump
      wasAir = s.airborne;
      air += ((s.airborne ? 1 : 0) - air) * (1 - Math.exp(-dt / (s.airborne ? FADE.in : FADE.out)));
      if (air > 0.01) {
        const pose = poses[side]!;
        const rise = air * clamp(s.vy / RISE_AT, 0, 1),
          fall = air * clamp(-s.vy / FALL_AT, 0, 1);
        premultiplyAll(pose.rise, rise);
        premultiplyAll(pose.fall, fall);
      }

      // Bent under a load, the head staying level.
      const wantLean = s.load
        ? LOAD_LEAN.base + (LOAD_LEAN.full - LOAD_LEAN.base) * Math.min(1, s.load / LOAD_LEAN.at)
        : 0;
      leanNow += (wantLean - leanNow) * (1 - Math.exp(-dt / FADE.load));
      if (leanNow > 0.05) {
        const rad = (leanNow * Math.PI) / 180;
        lean.spine.quaternion.premultiply(q.setFromAxisAngle(lean.fwd, rad));
        lean.head.quaternion.premultiply(q.setFromAxisAngle(lean.back, -rad));
      }

      if (s.down > 0.01) premultiplyAll(sprawl, s.down);

      // Arms: each takes one pose at a time, faded in over the clip.
      const now = clock.now();
      if (wasCharging && !s.charging) releasedAt = now;
      wasCharging = !!s.charging;
      const releasing = now - releasedAt < RELEASE_MS;
      const k = 1 - Math.exp(-dt / FADE.arm);
      for (let i = 0; i < arms.length; i++) {
        const arm = arms[i]!;
        const right = i === 1;
        const want: ArmPose | null =
          s.down > 0.3
            ? 'sprawl'
            : s.aloft
              ? 'aloft'
              : s.seated
                ? 'rest'
                : s.charging && right
                  ? 'windup'
                  : releasing && right
                    ? 'release'
                    : s.hold === 'ball'
                      ? 'reach'
                      : s.hold === 'item' && right
                        ? 'hold'
                        : s.hold === 'hang' && right
                          ? 'hang'
                          : s.load
                            ? 'strap'
                            : null;
        for (let j = 0; j < NAMES.length; j++) {
          const n = NAMES[j]!;
          arm.w[n] += ((n === want ? 1 : 0) - arm.w[n]) * k;
          const w = arm.w[n] * (n === 'hang' ? HANG_HOLD : 1); // a little of the walk's swing stays in a hanging arm
          if (w < 0.005) continue;
          const p = arm.pose[n];
          arm.upper.quaternion.slerp(p.upper, w);
          arm.lower.quaternion.slerp(p.lower, w);
          arm.hand.quaternion.slerp(p.hand, w);
        }
      }

      if (socket) socket.hand.quaternion.slerpQuaternions(socket.hold, socket.hang, arms[1]!.w.hang);

      nextBlink -= dt;
      if (nextBlink <= 0) {
        nextBlink = BLINK.every + clock.random() * BLINK.more;
        blinkT = 0;
      }
      blinkT += dt;
      const shut = blinkT < BLINK.closed ? 1 - Math.abs((blinkT / BLINK.closed) * 2 - 1) : 0;
      for (let k = 0; k < eyes.length; k++) eyes[k]!.scale.y = 1 - 0.88 * shut;
    },
  };
}
