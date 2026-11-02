// The rails for ?proto=net. src/features/track-machine.ts draws each section's rail as one straight box, level at the
// ground under its middle: fine over 18 m, floating or buried over 85 m of real ground. Here they are short pieces that
// follow the ground, as far as the machine has laid (track-machine.ts leaves its own out of the scene on this page).
import * as THREE from 'three/webgpu';
import { rules } from '../../world/game-world.ts';
import { scene } from '../../render/scene.ts';
import { groundHeight } from '../../island/terrain.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { ROUTE } from '../../sim/route.ts';
import { MACHINE_RUN } from '../../sim/scripted-run.ts';

const { sites } = rules.sites;
const PIECE = 2.5; // m
const OFF = [-0.45, 0.45];
const LINES = ROUTE.map((r) => {
  const dx = r.to[0]! - r.x,
    dz = r.to[1]! - r.z;
  const len = Math.hypot(dx, dz);
  return { x: r.x, z: r.z, ux: dx / len, uz: dz / len, len, n: Math.ceil(len / PIECE) };
});
const mesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.08, 0.08, 1),
  new THREE.MeshStandardNodeMaterial({ color: '#5c5f66', roughness: 0.45, metalness: 0.7 }),
  LINES.reduce((t, l) => t + l.n * 2, 0),
);
mesh.count = 0;
mesh.frustumCulled = false;
mesh.castShadow = true;
scene.add(mesh);

// How far section s is laid (as track-machine.ts reads it).
function laidAt(s: number, tick: number): number {
  const x = sites.list[s];
  const { len } = LINES[s]!;
  if (rules.sites.isDone(s)) return len;
  if (!x || x.t0 < 0) return 0;
  const warm = MACHINE_RUN[0]!.len,
    lay = MACHINE_RUN[1]!.len;
  return len * Math.min(1, Math.max(0, (tick - x.t0 - warm) / lay));
}

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  p = new THREE.Vector3(),
  s3 = new THREE.Vector3(1, 1, 1);
let drawn = -1;

/** Called every frame. */
export function drawRails(): void {
  const tick = sharedSeconds() * 10;
  const laid = LINES.map((_, s) => laidAt(s, tick));
  const total = laid.reduce((a, b) => a + b, 0);
  if (total === drawn) return;
  drawn = total;
  let c = 0;
  LINES.forEach((l, s) => {
    const upTo = laid[s]!;
    const piece = l.len / l.n;
    for (let k = 0; k < l.n && k * piece < upTo; k++) {
      const d0 = k * piece,
        d1 = Math.min(upTo, d0 + piece);
      for (const o of OFF) {
        const ax = l.x + l.ux * d0 + l.uz * o,
          az = l.z + l.uz * d0 - l.ux * o,
          bx = l.x + l.ux * d1 + l.uz * o,
          bz = l.z + l.uz * d1 - l.ux * o;
        const ya = groundHeight(ax, az) + 0.16,
          yb = groundHeight(bx, bz) + 0.16;
        const run = Math.hypot(d1 - d0, yb - ya);
        p.set((ax + bx) / 2, (ya + yb) / 2, (az + bz) / 2);
        q.setFromEuler(e.set(-Math.atan2(yb - ya, d1 - d0), Math.atan2(l.ux, l.uz), 0, 'YXZ'));
        s3.set(1, 1, run + 0.04);
        mesh.setMatrixAt(c++, m4.compose(p, q, s3));
      }
    }
  });
  mesh.count = c;
  mesh.instanceMatrix.needsUpdate = true;
}
