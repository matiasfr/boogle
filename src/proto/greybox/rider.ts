// Default greybox review: ride as Buddy would, to judge the train ride at the character's size (`&gbrider=0`: overview)
// (docs/research/train-ride-feel.md). A loco and two flatbeds at Place's real sizes run along the route with your own
// Buddy seated on the first flatbed, the camera follows at the play camera's height and distance, and the lines get
// near-track furniture: sleepers, rails and a pole every 25 m. `&gbrider=bare` keeps the train and camera but drops
// the furniture, for an A/B of what the near field adds. Cosmetic and Local: the body stays where it was.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { camera } from '../../render/scene.ts';
import { me } from '../../player/state.ts';
import { PLAYER_R } from '../../constants.ts';
import { flat } from '../../render/flat.ts';

const q = new URLSearchParams(location.search);
export const RIDER = q.get('gbrider') ?? '1';
export const RIDER_FEEL = {
  back: 5.6, // m behind Buddy, as the play camera (docs/research/world-scale.md)
  up: 2.5, // m over him
  aim: 1.1, // m over his seat the camera looks at
  turnS: 0.6, // s the camera's heading lags the train's, so a bend shows the train from the side
  fovWide: 3, // degrees wider at 20 m/s (the crossing's 5 at 50, a little more)
  sleeperEvery: 1.2, // m, as Place's track
  poleEvery: 25, // m: one a little under every 1.3 s at 20 m/s
  poleOff: 3.4, // m from the line's centre
  poleH: 5,
};
// Place's cars (src/render/wagon-look.ts): loco 1.6 × 3.0, boiler top 1.75; flatbed 2.2 × 3.2, deck 0.7; 3.7 m apart.
const CARS = [
  { off: 3.7, hx: 0.8, hz: 1.5, top: 1.75, color: '#3d4a52' },
  { off: 0, hx: 1.1, hz: 1.6, top: 0.7, color: '#b07a44' },
  { off: -3.7, hx: 1.1, hz: 1.6, top: 0.7, color: '#b07a44' },
];

export type RiderPath = (s: number, out: THREE.Vector3) => THREE.Vector3;

export function createRider(root: THREE.Group, lines: { path: THREE.Vector3[] }[]) {
  const train = new THREE.Group();
  train.visible = false;
  root.add(train);
  const cars = CARS.map((c) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(c.hx * 2, c.top - 0.3, c.hz * 2), flat(c.color, 0.8));
    body.position.y = 0.3 + (c.top - 0.3) / 2;
    g.add(body);
    for (const z of [-c.hz * 0.6, c.hz * 0.6]) {
      const axle = new THREE.Mesh(new THREE.BoxGeometry(c.hx * 2 + 0.1, 0.5, 0.5), flat('#2a2422', 0.8));
      axle.position.set(0, 0.25, z);
      g.add(axle);
    }
    if (c.top > 1) {
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.7, 8), flat('#2a2422', 0.8));
      funnel.position.set(0, c.top + 0.35, c.hz - 0.5);
      g.add(funnel);
    }
    g.traverse((o) => (o.castShadow = true));
    train.add(g);
    return { ...c, g };
  });

  if (RIDER !== 'bare') {
    // Near-track furniture on every greybox line: what flicks past at the rider's eye.
    const sleepers: THREE.Matrix4[] = [];
    const rails: THREE.BufferGeometry[] = [];
    const poles: THREE.BufferGeometry[] = [];
    const o = new THREE.Object3D();
    for (const { path } of lines) {
      let along = 0,
        nextSleeper = 0,
        nextPole = RIDER_FEEL.poleEvery / 2;
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i]!,
          b = path[i + 1]!;
        const len = a.distanceTo(b);
        if (len < 0.5) continue;
        o.position.copy(a);
        o.lookAt(b);
        for (; nextSleeper < along + len; nextSleeper += RIDER_FEEL.sleeperEvery) {
          const s = nextSleeper - along;
          o.position.copy(a).lerp(b, s / len);
          o.position.y += 0.06;
          o.updateMatrix();
          sleepers.push(o.matrix.clone());
        }
        o.position.copy(a).lerp(b, 0.5);
        o.updateMatrix();
        for (const x of [-0.5, 0.5])
          rails.push(new THREE.BoxGeometry(0.1, 0.14, len).translate(x, 0.19, 0).applyMatrix4(o.matrix));
        const side = new THREE.Vector3(b.z - a.z, 0, -(b.x - a.x)).normalize();
        for (; nextPole < along + len; nextPole += RIDER_FEEL.poleEvery) {
          const s = nextPole - along;
          const p = a
            .clone()
            .lerp(b, s / len)
            .addScaledVector(side, RIDER_FEEL.poleOff);
          poles.push(
            new THREE.BoxGeometry(0.22, RIDER_FEEL.poleH, 0.22).translate(p.x, p.y + RIDER_FEEL.poleH / 2, p.z),
          );
          poles.push(new THREE.BoxGeometry(1.4, 0.12, 0.12).translate(p.x, p.y + RIDER_FEEL.poleH - 0.4, p.z));
        }
        along += len;
      }
    }
    const sl = new THREE.InstancedMesh(new THREE.BoxGeometry(2.3, 0.12, 0.42), flat('#6e4c2a', 0.9), sleepers.length);
    sleepers.forEach((m, i) => sl.setMatrixAt(i, m));
    sl.name = 'rider-sleepers';
    root.add(sl);
    if (rails.length) root.add(new THREE.Mesh(mergeGeometries(rails), flat('#3a302c', 0.6)));
    if (poles.length) root.add(new THREE.Mesh(mergeGeometries(poles), flat('#8a6a4a', 0.9)));
  }

  const p = new THREE.Vector3(),
    ahead = new THREE.Vector3(),
    dir = new THREE.Vector3(),
    seat = new THREE.Vector3(),
    camDir = new THREE.Vector3();
  let baseFov = 0,
    on = false;
  const heading = (at: RiderPath, s: number, out: THREE.Vector3) => {
    at(s - 2, p);
    at(s + 2, ahead);
    return out.subVectors(ahead, p).setY(0).normalize();
  };
  return {
    /** Draw the train with its front car's middle at `s`, Buddy seated on the first flatbed, and the camera behind. */
    update(at: RiderPath, s: number, mps: number, dt: number) {
      if (!on) {
        on = true;
        baseFov = camera.fov;
        train.visible = true;
        heading(at, s, camDir);
      }
      for (const c of cars) {
        at(s + c.off, c.g.position);
        heading(at, s + c.off, dir);
        c.g.rotation.set(0, Math.atan2(dir.x, dir.z), 0);
      }
      heading(at, s, dir);
      at(s, seat);
      seat.y += 0.7 + PLAYER_R;
      const a = me.avatar;
      if (a) {
        a.position.copy(seat);
        a.rotation.y = Math.atan2(-dir.x, -dir.z); // avatars face -Z at zero yaw
        a.userData.seatedAt = performance.now();
        a.updateMatrixWorld();
      }
      camDir.lerp(dir, 1 - Math.exp(-dt / RIDER_FEEL.turnS)).normalize();
      camera.position.copy(seat).addScaledVector(camDir, -RIDER_FEEL.back);
      camera.position.y += RIDER_FEEL.up;
      p.copy(seat).addScaledVector(dir, 2);
      p.y += RIDER_FEEL.aim;
      camera.lookAt(p);
      const fov = baseFov + RIDER_FEEL.fovWide * Math.min(1, mps / 20);
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld();
    },
    stop() {
      if (!on) return;
      on = false;
      train.visible = false;
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
    },
  };
}
