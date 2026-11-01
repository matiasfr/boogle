// The soapbox course: from the rocky massif's summit in the north-west, east along its ridge, a right-hander down the
// south face's east edge, then a slalom west and back through the lowland onto the sand by the bay. Marked with cones on
// both sides and flat start and finish strips, nothing tall the chase camera could clip. World metres (x, z).
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
  [-69, -43], // left
  [-62, -37],
  [-56.5, -32],
  [-54, -25], // onto the sand by the bay
  [-54, -17], // along its west shore
  [-55.5, -10.5], // between the palms and the water
  [-60.5, -8], // finish, on the sand short of the sea
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

// A flat painted board across the line with two knee-high flags at its ends.
function strip(x: number, z: number, h: number, color: string) {
  const w = CONE_OFF * 2 + 1;
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.7), new THREE.MeshStandardMaterial({ color }));
  board.position.set(x, groundHeight(x, z) + 0.04, z);
  board.rotation.y = h;
  board.receiveShadow = true;
  scene.add(board);
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
