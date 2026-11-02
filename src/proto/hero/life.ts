// What the Buddy does on top of its clips: blinks, and throws its limbs around in the air. The library's jump is a stiff
// held pose; rising it tucks a knee and reaches up with the other arm, and falling it spreads its arms, each blended from
// how fast it's moving up or down, so a remote player needs no new presence. Runs after the mixer, which rewrites these
// bones each frame. Offsets are about the figure's own axes as seen from the parent bone at rest, so they read the same
// on any skeleton: it faces +z, left is +x; +x swings a limb back and -x forward, +z swings the left arm out, +y opens
// the left elbow (a forearm's parent is the arm's T-pose).
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
const RISE_AT = 4, // m/s where the rising pose is full
  FALL_AT = 6;
const FADE = { in: 0.07, out: 0.09 }; // s
const BLINK = { closed: 0.1, every: 2, more: 3.5 }; // s; `every` + up to `more` between blinks

const mirror = (name: string) => name.replace(/_l$/, '\0').replace(/_r$/, '_l').replace('\0', '_r');

export function makeLife(root: THREE.Object3D, rest: THREE.Object3D) {
  const eyes = ['eye_l', 'eye_r'].map((n) => root.getObjectByName(n)).filter(Boolean) as THREE.Object3D[];
  rest.updateMatrixWorld(true);
  const parentRest = new Map<string, THREE.Quaternion>();
  const axes = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const bake = (offsets: Offset[], flip: boolean) =>
    offsets.flatMap(([bone, axis, deg]) => {
      const name = flip ? mirror(bone) : bone;
      const live = root.getObjectByName(name),
        still = rest.getObjectByName(name);
      if (!live || !still) return [];
      if (!parentRest.has(name))
        parentRest.set(name, still.parent!.getWorldQuaternion(new THREE.Quaternion()).invert());
      const local = axes[axis].clone().applyQuaternion(parentRest.get(name)!);
      // A mirrored swing out reverses; a swing back and forth doesn't.
      const rad = (((flip && axis !== 'x' ? -1 : 1) * deg) / 180) * Math.PI;
      return [{ live, q: new THREE.Quaternion().setFromAxisAngle(local, rad) }];
    });
  const poses = [false, true].map((flip) => ({ rise: bake(RISE, flip), fall: bake(FALL, flip) }));
  const id = new THREE.Quaternion(),
    q = new THREE.Quaternion();

  let air = 0,
    wasAir = false,
    side = 0,
    nextBlink = BLINK.every + Math.random() * BLINK.more,
    blinkT = 1;
  return {
    blink() {
      blinkT = 0;
    },
    update(dt: number, vy: number, airborne: boolean) {
      if (airborne && !wasAir) side = 1 - side; // the other knee on the next jump
      wasAir = airborne;
      air += ((airborne ? 1 : 0) - air) * (1 - Math.exp(-dt / (airborne ? FADE.in : FADE.out)));
      if (air > 0.01) {
        const pose = poses[side]!;
        const rise = air * clamp(vy / RISE_AT, 0, 1),
          fall = air * clamp(-vy / FALL_AT, 0, 1);
        for (const o of pose.rise) o.live.quaternion.premultiply(q.slerpQuaternions(id, o.q, rise));
        for (const o of pose.fall) o.live.quaternion.premultiply(q.slerpQuaternions(id, o.q, fall));
      }
      nextBlink -= dt;
      if (nextBlink <= 0) {
        nextBlink = BLINK.every + Math.random() * BLINK.more;
        blinkT = 0;
      }
      blinkT += dt;
      const shut = blinkT < BLINK.closed ? 1 - Math.abs((blinkT / BLINK.closed) * 2 - 1) : 0;
      for (const e of eyes) e.scale.y = 1 - 0.88 * shut;
    },
  };
}
