// The hero's follow camera (&cam=old for today's). Closer than the default, and across the ground it stays locked to
// the body: a trailing camera read as inertia in play. In the air it follows height softly, so a jump rises in the
// frame instead of the world sinking. Sprinting widens the view a touch. Local, render only; other cameras (the caves)
// win. &camd= and &camw= set the distance (m) and sprint widening (degrees); &camtest adds buttons, and the , and . keys,
// to compare them live (docs/research/third-person-camera.md, recommendations 1 and 3).
import './camera.css';
import { camera } from '../../render/scene.ts';
import { reducedMotion } from '../../constants.ts';
import { cam, camConstraints, me } from '../../player/player.ts';
import { carry } from '../../physics/platforms.ts';

const q = new URLSearchParams(location.search);
const CAM = {
  dist: Number(q.get('camd')) || 5.2, // m (the default is 6.5)
  lagHeight: 0.1, // s it trails height on the ground
  lagAir: 0.2, // s it trails height in the air
  maxY: 1.4, // m
  sprintFov: q.has('camw') ? Number(q.get('camw')) : 5, // degrees wider at a sprint
};
const DISTANCES = [5.2, 5.8, 6.5],
  WIDENINGS = [0, 3, 5];

export function startHeroCamera() {
  if (q.get('cam') === 'old') return;
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
  if (q.has('camtest')) testPanel();
}

function testPanel() {
  const panel = document.createElement('div');
  panel.className = 'cam-test';
  const row = (
    label: string,
    key: string,
    values: number[],
    unit: string,
    set: (v: number) => void,
    now: () => number,
  ) => {
    const el = document.createElement('div');
    el.append(`${label} [${key}]`);
    const buttons = values.map((v) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = v + unit;
      b.onclick = () => pick(v);
      el.append(b);
      return b;
    });
    const mark = () => buttons.forEach((b, i) => b.classList.toggle('on', values[i] === now()));
    const pick = (v: number) => {
      set(v);
      mark();
    };
    mark();
    panel.append(el);
    return { mark, next: () => pick(values[(values.indexOf(now()) + 1) % values.length]!) };
  };
  const dist = row(
    'Distance',
    ',',
    DISTANCES,
    ' m',
    (v) => (cam.dist = v),
    () => cam.dist,
  );
  const widen = row(
    'Sprint widen',
    '.',
    WIDENINGS,
    '°',
    (v) => (CAM.sprintFov = v),
    () => CAM.sprintFov,
  );
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Comma') dist.next();
    if (e.code === 'Period') widen.next();
  });
  setInterval(dist.mark, 500); // the zoom control changes the distance too
  document.body.append(panel);
}
