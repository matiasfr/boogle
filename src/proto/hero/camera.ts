// The hero's follow camera (&cam=old for today's hard-locked one). Closer than the default, and it trails the body a
// little instead of being welded to it, as Ratchet's and Mario's do, so a start pulls the hero ahead of the frame, a
// stop catches up with it, and turns swing out. In the air it follows height more softly, so a jump rises in the frame
// instead of the world sinking. Sprinting widens the view a touch. Local, render only; other cameras (the caves) win.
import { camera } from '../../render/scene.ts';
import { reducedMotion } from '../../constants.ts';
import { cam, camConstraints, me } from '../../player/player.ts';

const CAM = {
  dist: 5.2, // m (the default is 6.5)
  lagGround: 0.07, // s the camera trails across the ground
  lagHeight: 0.1, // s it trails height on the ground
  lagAir: 0.3, // s it trails height in the air
  maxXZ: 1, // m
  maxY: 1.4, // m
  sprintFov: 7, // degrees wider at a sprint
};

export function startHeroCamera() {
  if (new URLSearchParams(location.search).get('cam') === 'old') return;
  cam.dist = CAM.dist;
  const baseFov = camera.fov;
  let x = NaN,
    y = 0,
    z = 0,
    last = 0;
  camConstraints.push((look, pos) => {
    const b = me.body;
    if (!b || reducedMotion) return false;
    const now = performance.now(),
      dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const ip = b.interpolatedPosition;
    if (x !== x || Math.hypot(ip.x - x, ip.y - y, ip.z - z) > 6) {
      x = ip.x; // the first frame, or a teleport: no swoop
      y = ip.y;
      z = ip.z;
    }
    const kXZ = 1 - Math.exp(-dt / CAM.lagGround),
      kY = 1 - Math.exp(-dt / (me.coyote > 0 ? CAM.lagHeight : CAM.lagAir));
    x += (ip.x - x) * kXZ;
    y += (ip.y - y) * kY;
    z += (ip.z - z) * kXZ;
    const ox = x - ip.x,
      oz = z - ip.z,
      l = Math.hypot(ox, oz),
      s = l > CAM.maxXZ ? CAM.maxXZ / l : 1;
    const dx = ox * s,
      dz = oz * s,
      dy = Math.max(-CAM.maxY, Math.min(CAM.maxY, y - ip.y));
    look.x += dx;
    look.y += dy;
    look.z += dz;
    pos.x += dx;
    pos.y += dy;
    pos.z += dz;
    const v = Math.hypot(b.velocity.x, b.velocity.z);
    const want = baseFov + CAM.sprintFov * Math.max(0, Math.min(1, (v - 7.5) / 3));
    if (Math.abs(camera.fov - want) > 0.02) {
      camera.fov += (want - camera.fov) * (1 - Math.exp(-dt * 5));
      camera.updateProjectionMatrix();
    }
    return false;
  });
}
