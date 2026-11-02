// The hero's follow camera (&cam=old for today's). Closer than the default, and across the ground it stays locked to
// the body: a trailing camera read as inertia in play. In the air it follows height softly, so a jump rises in the
// frame instead of the world sinking. Sprinting widens the view a touch. Distance and widening are the owner's pick from
// comparing 5.2, 5.8 and 6.5 m and 0, 3 and 5 degrees (docs/research/third-person-camera.md). Local, render only; other
// cameras (the caves) win.
import { camera } from '../../render/scene.ts';
import { reducedMotion } from '../../constants.ts';
import { cam, camConstraints, me } from '../../player/player.ts';
import { carry } from '../../physics/platforms.ts';

const CAM = {
  dist: 5.2, // m (the default is 6.5)
  lagHeight: 0.1, // s it trails height on the ground
  lagAir: 0.2, // s it trails height in the air
  maxY: 1.4, // m
  sprintFov: 5, // degrees wider at a sprint
};

export function startHeroCamera() {
  if (new URLSearchParams(location.search).get('cam') === 'old') return;
  cam.dist = CAM.dist;
  const baseFov = camera.fov;
  let y = NaN,
    last = 0;
  camConstraints.push((look, pos) => {
    const b = me.body;
    if (!b || reducedMotion) return false;
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const ip = b.interpolatedPosition;
    if (y !== y || Math.abs(ip.y - y) > 6) y = ip.y; // the first frame, or a teleport: no swoop
    y += (ip.y - y) * (1 - Math.exp(-dt / (me.coyote > 0 ? CAM.lagHeight : CAM.lagAir)));
    const dy = Math.max(-CAM.maxY, Math.min(CAM.maxY, y - ip.y));
    look.y += dy;
    pos.y += dy;
    // Speed over what you stand on: a train's speed isn't you sprinting.
    const v = Math.hypot(b.velocity.x - carry.x, b.velocity.z - carry.z);
    const want = baseFov + CAM.sprintFov * Math.max(0, Math.min(1, (v - 6.5) / 3));
    if (Math.abs(camera.fov - want) > 0.02) {
      camera.fov += (want - camera.fov) * (1 - Math.exp(-dt * 5));
      camera.updateProjectionMatrix();
    }
    return false;
  });
}
