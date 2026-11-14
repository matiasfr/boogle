// Local presentation only: keep watched movement continuous; replace an unseen pose on returning to the tab.
import { turnBooglerToward } from '../world/boogler-walk.ts';
import { booglerPose, type BooglerLeg } from '../world/boogler-shadow.ts';

export function createBooglerPresentation() {
  const pose = { x: 0, z: 0, yaw: 0, walking: false, mode: 0 };
  let last: BooglerLeg | null = null;
  let talking = false,
    held = false;
  let heldFor = 0,
    speed = 0,
    catchUp = 0;
  let lastNow: number | undefined;
  let hiddenAt: number | null = null;
  let placeOnReturn = false;
  return {
    pose,
    visibility(hidden: boolean, now: number) {
      if (hidden) hiddenAt ??= now;
      else if (hiddenAt !== null) {
        placeOnReturn = now - hiddenAt >= 500;
        hiddenAt = null;
      }
    },
    talk(open: boolean) {
      if (open && !talking) {
        held = true;
        heldFor = 0;
        speed = 0;
        catchUp = 0;
        pose.walking = false;
      }
      talking = open;
      if (!open) held = false;
    },
    update(
      leg: BooglerLeg,
      tick: number,
      dt: number,
      immediate = false,
      face?: { x: number; z: number },
      live = true,
      now?: number,
    ) {
      // FrameCtx.dt is already capped at 50 ms. Raw time also catches visible stalls, which must not cut.
      const elapsed = now !== undefined && lastNow !== undefined ? Math.max(0, (now - lastNow) / 1000) : dt;
      lastNow = now;
      const place = placeOnReturn;
      placeOnReturn = false;
      if (!live) {
        pose.walking = false;
        speed = 0;
        catchUp = 0;
        return;
      }
      // Only the first visible frame can place. If it is offline, the subsequent visible reconnect must ease.
      if (place) {
        immediate = true;
        held = false;
      }
      const next = booglerPose(leg, tick);
      if (held && !immediate) {
        heldFor += elapsed;
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
        catchUp = 0;
        return;
      }
      // A visible stall spends one display frame, not its whole elapsed gap. Actual visibility is handled above.
      dt = elapsed > 0.25 ? 1 / 60 : Math.max(0, dt);
      const dx = next.x - pose.x,
        dz = next.z - pose.z,
        distance = Math.hypot(dx, dz);
      // Account for the target walking away. Latch a faster rate for long corrections, leaving about half a
      // second of the three-second budget for acceleration. Keep the closing rate across replans/mode changes
      // until we reach authority; restarting it for each leg would decay into an endless tail.
      const base = Math.max(3, leg.speed * 1.2);
      const targetSpeed = next.walking ? leg.speed : 0;
      if (!catchUp && distance > (base - targetSpeed) * 3) catchUp = distance / 2.5;
      const limit = Math.max(base, targetSpeed + catchUp);
      // Extreme gaps must not spend the whole budget accelerating to their raised cap.
      const acceleration = Math.max(12, limit / 0.5);
      const travel = Math.min(distance, Math.min(limit, speed + acceleration * dt) * dt);
      if (distance > 0) {
        pose.x += (dx / distance) * travel;
        pose.z += (dz / distance) * travel;
      }
      if (dt > 0) speed = travel / dt;
      if (travel === distance) catchUp = 0;
      if (!next.walking && face) turnBooglerToward(pose, Math.atan2(-(face.x - pose.x), -(face.z - pose.z)), dt);
      else turnBooglerToward(pose, next.yaw, dt);
      // A correction toward a standing leg still moves his feet, rather than sliding an idle body.
      pose.walking = next.walking || travel > 1e-6;
      pose.mode = leg.mode;
    },
  };
}
