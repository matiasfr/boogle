// The soapbox course: from the rocky massif's summit in the north-west, east along its ridge, a right-hander down the
// south face's east edge, then a long right across the lowland, finishing while it still runs downhill (the flat
// palm slalom and bay shore after it were 8 s of kicking along). Marked with cones on both sides and start and finish
// boards that lie on the ground, nothing tall the chase camera could clip. World metres (x, z).
import * as THREE from 'three/webgpu';
import { groundHeight } from '../../adapters/terrain.ts';
import { scene } from '../../render/scene.ts';

/** The racing line, start to finish. */
export const LINE: [number, number][] = [
  [-58, -95], // start: on the summit ridge, facing east
  [-40, -95], // the ridge
  [-34.5, -94], // bend right
  [-41, -85], // down the face's east edge
  [-42, -75],
  [-41.5, -68], // the foot, past a palm on the right
  [-40, -61.5],
  [-50, -56], // a long right across the lowland
  [-60, -53],
  [-65, -47.5], // finish, as the right opens out (the ground is still falling)
];

const yawOf = (dx: number, dz: number) => Math.atan2(-dx, -dz); // forward = (-sin, -cos), as me.yaw
const [s0, s1] = LINE;
export const START = { x: s0[0], z: s0[1], h: yawOf(s1[0] - s0[0], s1[1] - s0[1]) };
export const START_GO = 3; // m rolled from the start that starts the clock
const [f0, f1] = LINE.slice(-2);
const fl = Math.hypot(f1[0] - f0[0], f1[1] - f0[1]);
export const FINISH = { x: f1[0], z: f1[1], dx: (f1[0] - f0[0]) / fl, dz: (f1[1] - f0[1]) / fl, half: 6 };

/** Crossed the finish line (perpendicular to the last leg, within its width) between two positions. */
export function crossedFinish(px: number, pz: number, x: number, z: number) {
  const along = (ax: number, az: number) => (ax - FINISH.x) * FINISH.dx + (az - FINISH.z) * FINISH.dz;
  const across = Math.abs((x - FINISH.x) * FINISH.dz - (z - FINISH.z) * FINISH.dx);
  return along(px, pz) < 0 && along(x, z) >= 0 && across < FINISH.half;
}

// ---------------------------------------------------------------- markers (one instanced mesh of cones, two strips)
const CONE_GAP = 5; // m between cones along the line
const CONE_OFF = 3.2; // m either side of it
export function buildMarkers() {
  const spots: [number, number][] = [];
  for (let k = 1; k < LINE.length - 1; k++) {
    const [ax, az] = LINE[k],
      [bx, bz] = LINE[k + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const nx = -(bz - az) / len,
      nz = (bx - ax) / len;
    for (let d = 0; d < len; d += CONE_GAP) {
      const x = ax + ((bx - ax) * d) / len,
        z = az + ((bz - az) * d) / len;
      spots.push([x + nx * CONE_OFF, z + nz * CONE_OFF], [x - nx * CONE_OFF, z - nz * CONE_OFF]);
    }
  }
  const cones = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.22, 0.6, 8),
    new THREE.MeshStandardMaterial({ color: '#ff7a1f', roughness: 0.6 }),
    spots.length,
  );
  const m = new THREE.Matrix4();
  spots.forEach(([x, z], i) => cones.setMatrixAt(i, m.makeTranslation(x, groundHeight(x, z) + 0.28, z)));
  cones.castShadow = true;
  scene.add(cones);
  strip(START.x, START.z, START.h, '#f4f1e6');
  strip(FINISH.x, FINISH.z, yawOf(FINISH.dx, FINISH.dz), '#e2483d');
}

// A painted board across the line with two knee-high flags at its ends. The board is laid in short planks, each tilted
// to the ground under it, so it lies on a slope instead of standing proud of it.
const PLANKS = 8;
const along = new THREE.Vector3(),
  across = new THREE.Vector3(),
  up = new THREE.Vector3(),
  basis = new THREE.Matrix4();
function strip(x: number, z: number, h: number, color: string) {
  const w = CONE_OFF * 2 + 1;
  const mat = new THREE.MeshStandardMaterial({ color });
  const geo = new THREE.BoxGeometry(w / PLANKS + 0.02, 0.05, 0.7);
  const cx = Math.cos(h),
    cz = -Math.sin(h); // across the line
  const at = (s: number, f: number) => {
    const px = x + cx * s - cz * f,
      pz = z + cz * s + cx * f;
    return [px, groundHeight(px, pz), pz];
  };
  for (let k = 0; k < PLANKS; k++) {
    const s0 = -w / 2 + (k * w) / PLANKS,
      s1 = s0 + w / PLANKS;
    const [ax, ay, az] = at(s0, 0),
      [bx, by, bz] = at(s1, 0);
    const [, fy0] = at((s0 + s1) / 2, -0.35),
      [, fy1] = at((s0 + s1) / 2, 0.35);
    across.set(bx - ax, by - ay, bz - az).normalize();
    along.set(-cz, (fy1 - fy0) / 0.7, cx).normalize(); // the plank's +z (backwards along the line), with the ground
    up.crossVectors(along, across).normalize();
    along.crossVectors(across, up);
    const plank = new THREE.Mesh(geo, mat);
    plank.quaternion.setFromRotationMatrix(basis.makeBasis(across, up, along));
    plank.position.set((ax + bx) / 2, (ay + by) / 2 + 0.02, (az + bz) / 2);
    plank.receiveShadow = true;
    scene.add(plank);
  }
  const flagGeo = new THREE.BoxGeometry(0.1, 1.1, 0.1);
  const flagMat = new THREE.MeshStandardMaterial({ color });
  for (const s of [-1, 1]) {
    const fx = x + Math.cos(h) * s * (w / 2),
      fz = z - Math.sin(h) * s * (w / 2);
    const f = new THREE.Mesh(flagGeo, flagMat);
    f.position.set(fx, groundHeight(fx, fz) + 0.55, fz);
    f.castShadow = true;
    scene.add(f);
  }
}
