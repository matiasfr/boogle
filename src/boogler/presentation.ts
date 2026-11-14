// Local presentation only: preserve position across changed Server legs and hold your own talk on the press.
import { angleLerp } from '../math.ts';
import { turnBooglerToward } from '../world/boogler-walk.ts';
import { booglerPose, type BooglerLeg } from '../world/boogler-shadow.ts';

export function createBooglerPresentation() {
  const pose = { x: 0, z: 0, yaw: 0, walking: false, mode: 0 };
  let last: BooglerLeg | null = null;
  let talking = false,
    held = false;
  let heldFor = 0;
  let ox = 0,
    oz = 0,
    oy = 0;
  return {
    pose,
    talk(open: boolean) {
      if (open && !talking) {
        held = true;
        heldFor = 0;
        pose.walking = false;
      }
      if (!open && talking) last = null; // release eases from the held pose
      talking = open;
      if (!open) held = false;
    },
    update(leg: BooglerLeg, tick: number, dt: number, immediate = false, face?: { x: number; z: number }) {
      const next = booglerPose(leg, tick);
      if (held && !immediate) {
        heldFor += dt;
        // Talk is a short prediction, not authority: a rider or another talker can win.
        // Unchanged legs send no packet, so a missing acknowledgement must expire too.
        if (leg !== last || heldFor + 1e-9 >= 0.3) {
          held = false;
          last = null;
        } else {
          last = leg;
          if (face) turnBooglerToward(pose, Math.atan2(-(face.x - pose.x), -(face.z - pose.z)), dt);
          return;
        }
      }
      if (leg !== last || immediate) {
        const snap = immediate || Math.hypot(pose.x - next.x, pose.z - next.z) > 6;
        ox = snap ? 0 : pose.x - next.x;
        oz = snap ? 0 : pose.z - next.z;
        oy = snap ? 0 : angleLerp(next.yaw, pose.yaw, 1) - next.yaw;
        last = leg;
      }
      const ease = Math.exp(-dt * 15);
      ox *= ease;
      oz *= ease;
      oy *= ease;
      pose.x = next.x + ox;
      pose.z = next.z + oz;
      if (!next.walking && face) turnBooglerToward(pose, Math.atan2(-(face.x - pose.x), -(face.z - pose.z)), dt);
      else pose.yaw = next.yaw + oy;
      pose.walking = next.walking;
      pose.mode = leg.mode;
    },
  };
}
