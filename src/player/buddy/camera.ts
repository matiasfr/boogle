// The follow camera (&cam=old for the older one). Closer than that one was, and across the ground it stays locked to
// the body: a trailing camera read as inertia in play. In the air it follows height softly, so a jump rises in the
// frame instead of the world sinking. Sprinting widens the view a touch. Distance and widening are the owner's pick from
// comparing 5.2, 5.8 and 6.5 m and 0, 3 and 5 degrees (docs/research/third-person-camera.md). Local, render only; other
// cameras (the caves) win.
import { camera } from '../../render/scene.ts';
import { reducedMotion } from '../../constants.ts';
import { clamp } from '../../math.ts';
import { cam, camConstraints, me } from '../../player/player.ts';
import { carry } from '../../physics/platforms.ts';

const CAM = {
  dist: 5.2, // m (it was 6.5)
  lagHeight: 0.1, // s it trails height on the ground
  lagAir: 0.2, // s it trails height in the air
  maxY: 1.4, // m
  sprintFov: 5, // degrees wider at a sprint
};

export function startFollowCamera() {
  if (new URLSearchParams(location.search).get('cam') === 'old') return;
  cam.dist = CAM.dist;
  let y = NaN,
    last = 0,
    widened = 0; // degrees of the lens that are this camera's: other modes (a vehicle) set theirs too
  camConstraints.push((look, pos) => {
    const b = me.body;
    if (!b || reducedMotion) return false;
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const ip = b.interpolatedPosition;
    if (y !== y || Math.abs(ip.y - y) > 6) y = ip.y; // the first frame, or a teleport: no swoop
    y += (ip.y - y) * (1 - Math.exp(-dt / (me.coyote > 0 ? CAM.lagHeight : CAM.lagAir)));
    const dy = clamp(y - ip.y, -CAM.maxY, CAM.maxY);
    look.y += dy;
    pos.y += dy;
    // Speed over what you stand on: a train's speed isn't you sprinting.
    const v = Math.hypot(b.velocity.x - carry.x, b.velocity.z - carry.z);
    const want = CAM.sprintFov * clamp((v - 6.5) / 3, 0, 1);
    if (Math.abs(widened - want) > 0.02) {
      const step = (want - widened) * (1 - Math.exp(-dt * 5));
      widened += step;
      camera.fov += step;
      camera.updateProjectionMatrix();
    }
    return false;
  });
}
