// Local presentation only: authoritative legs are targets, never permission to cut the shown pose.
import { turnBooglerToward } from '../world/boogler-walk.ts';
import { booglerPose, type BooglerLeg } from '../world/boogler-shadow.ts';

export function createBooglerPresentation() {
  const pose = { x: 0, z: 0, yaw: 0, walking: false, mode: 0 };
  let last: BooglerLeg | null = null;
  let talking = false,
    held = false;
  let heldFor = 0,
    speed = 0;
  return {
    pose,
    talk(open: boolean) {
      if (open && !talking) {
        held = true;
        heldFor = 0;
        speed = 0;
        pose.walking = false;
      }
      talking = open;
      if (!open) held = false;
    },
    update(leg: BooglerLeg, tick: number, dt: number, immediate = false, face?: { x: number; z: number }, live = true) {
      if (!live) {
        pose.walking = false;
        speed = 0;
        return;
      }
      const next = booglerPose(leg, tick);
      if (held && !immediate) {
        heldFor += dt;
        // Talk is a short prediction: another actor can win, or no changed leg may arrive.
        if (leg !== last || heldFor + 1e-9 >= 0.3) held = false;
        else {
          if (face) turnBooglerToward(pose, Math.atan2(-(face.x - pose.x), -(face.z - pose.z)), dt);
          return;
        }
      }
      last = leg;
      if (immediate) {
        Object.assign(pose, next, { mode: leg.mode });
        speed = next.walking ? leg.speed : 0;
        return;
      }
      // Hidden tabs can return with seconds of elapsed time. Spend one display frame, not that whole gap.
      dt = dt > 0.25 ? 1 / 60 : Math.max(0, dt);
      const dx = next.x - pose.x,
        dz = next.z - pose.z,
        distance = Math.hypot(dx, dz);
      // Main slid to corrections. Keep that continuity, but bound the entire shown movement, including clock
      // re-anchors that precede a new leg. Calm/ridden catch-up tops out at 3 m/s; flee allows 20% headroom.
      const limit = Math.max(3, leg.speed * 1.2);
      const travel = Math.min(distance, Math.min(limit, speed + 12 * dt) * dt);
      if (distance > 0) {
        pose.x += (dx / distance) * travel;
        pose.z += (dz / distance) * travel;
      }
      if (dt > 0) speed = travel / dt;
      if (!next.walking && face) turnBooglerToward(pose, Math.atan2(-(face.x - pose.x), -(face.z - pose.z)), dt);
      else turnBooglerToward(pose, next.yaw, dt);
      // A correction toward a standing leg still moves his feet, rather than sliding an idle body.
      pose.walking = next.walking || travel > 1e-6;
      pose.mode = leg.mode;
    },
  };
}
