// Fish, cosmetic tier: a school that lives in water deep enough to swim in (the sea or the
// cave pond: it reads the shared water surface), with simple boids and a
// steer toward deeper water; it scatters when the ball splashes in or a player swims through. One instanced mesh, the
// tail wiggle is in the material's positionNode. Local Math.random is fine: nothing here is read by the sim.
// Serves DESIGN.md 9 (the island is alive) and 2 (the ball scares fish). With 36 fish, plain pairwise boids is cheaper
// than bucketing them on the cell grid.
import * as THREE from 'three/webgpu';
import {
  positionLocal,
  positionGeometry,
  instancedDynamicBufferAttribute,
  instanceIndex,
  float,
  sin,
  max,
  time,
} from 'three/tsl';
import { onFrame, onStart } from '../loop.ts';
import { scene } from '../render/scene.js';
import { groundHeight } from '../adapters/terrain.js';
import { waterField } from '../physics/water-field.ts';
import { ball } from '../physics/ball.ts';
import { me } from '../player/player.ts';
import { remotes } from '../netplay/net.ts';
import { patchNode } from '../render/material-patch.js';
import { createPool } from '../render/instances.ts';

const FISH = {
  count: 36,
  speed: 1.8, // m/s cruising
  fleeSpeed: 6,
  minDepth: 0.4, // m of water a fish wants under it
  sep: 0.7,
  scare: 3.5, // m from a swimmer or a splashing ball
};

const PROBES = [
  [1.5, 0],
  [-1.5, 0],
  [0, 1.5],
  [0, -1.5],
];
const depthAt = (x, z) => waterField.surfaceAt(x, z) - groundHeight(x, z);
const geo = new THREE.ConeGeometry(0.11, 0.48, 5).rotateX(Math.PI / 2); // points along +z
const mat = new THREE.MeshStandardNodeMaterial({
  color: '#ff6a1a',
  emissive: '#7a2a00',
  roughness: 0.6,
  flatShading: true,
});
const pool = createPool(geo, mat, FISH.count);
const fish = pool.mesh;
// positionNode runs after the instance matrix, so the sway goes along each fish's own side axis in world space: column
// 0 of its instance matrix, read through a view on the same GPU buffer (how three reads the matrix itself).
const side = instancedDynamicBufferAttribute(new THREE.InterleavedBufferAttribute(fish.instanceMatrix, 3, 0));
patchNode(mat, 'positionNode', (prev) =>
  (prev ?? positionLocal).add(
    side.mul(
      sin(time.mul(13).add(float(instanceIndex).mul(1.7)))
        .mul(max(0, positionGeometry.z.negate()))
        .mul(0.35),
    ),
  ),
);
fish.visible = false;
scene.add(fish);

const P = Array.from({ length: FISH.count }, () => ({ x: 0, y: 0, z: 0, vx: 0, vz: 0, scare: 0 }));
let home = null;
function findHome() {
  for (let tries = 0; tries < 60; tries++) {
    const a = Math.random() * Math.PI * 2,
      r = 35 + Math.random() * 35;
    const x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const d = depthAt(x, z);
    if (d > 0.7 && d < 4) return { x, z };
  }
  return { x: 60, z: 0 };
}
function respawn(f) {
  f.x = home.x + (Math.random() - 0.5) * 4;
  f.z = home.z + (Math.random() - 0.5) * 4;
  f.vx = (Math.random() - 0.5) * FISH.speed;
  f.vz = (Math.random() - 0.5) * FISH.speed;
}
onStart(() => {
  home = findHome();
  for (const f of P) respawn(f);
});

let lastBallY = 0;
const scares = []; // reused every frame: the hot path allocates nothing (index loops, no destructuring)

onFrame(
  ({ dt }) => {
    fish.visible = !!home;
    if (!fish.visible || dt <= 0) return;
    // scares: a ball that just hit the water near the surface, players swimming
    scares.length = 0;
    const bp = ball.mesh.position;
    const bs = waterField.surfaceAt(bp.x, bp.z);
    if (bp.y < bs + 0.6 && lastBallY - bp.y > 0.02) scares.push(bp);
    lastBallY = bp.y;
    if (me.swimming && me.body) scares.push(me.body.position);
    for (const r of remotes.values()) if (r.state === 2) scares.push(r.target);
    let cx = 0,
      cz = 0;
    for (let k = 0; k < P.length; k++) {
      cx += P[k].x / FISH.count;
      cz += P[k].z / FISH.count;
    }
    for (let k = 0; k < P.length; k++) {
      const f = P[k];
      let ax = (cx - f.x) * 0.15 + (Math.random() - 0.5) * 2,
        az = (cz - f.z) * 0.15 + (Math.random() - 0.5) * 2;
      for (let m = 0; m < P.length; m++) {
        const o = P[m];
        if (o === f) continue;
        const dx = f.x - o.x,
          dz = f.z - o.z,
          d2 = dx * dx + dz * dz;
        if (d2 < FISH.sep * FISH.sep && d2 > 1e-6) {
          ax += (dx / d2) * 0.6;
          az += (dz / d2) * 0.6;
        } else if (d2 < 9) {
          ax += (o.vx - f.vx) * 0.05; // align
          az += (o.vz - f.vz) * 0.05;
        }
      }
      for (let m = 0; m < scares.length; m++) {
        const s = scares[m];
        const dx = f.x - s.x,
          dz = f.z - s.z,
          d = Math.hypot(dx, dz);
        if (d < FISH.scare) {
          f.scare = 1.2;
          ax += (dx / (d + 0.1)) * 40;
          az += (dz / (d + 0.1)) * 40;
        }
      }
      // stay in deep enough water: steer toward the deepest of four probes when the way ahead gets shallow
      const sp = Math.hypot(f.vx, f.vz) || 1;
      if (depthAt(f.x + (f.vx / sp) * 1.2, f.z + (f.vz / sp) * 1.2) < FISH.minDepth) {
        let best = -1e9,
          bx = 0,
          bz = 0;
        for (let m = 0; m < PROBES.length; m++) {
          const px = PROBES[m][0],
            pz = PROBES[m][1];
          const d = depthAt(f.x + px, f.z + pz);
          if (d > best) {
            best = d;
            bx = px;
            bz = pz;
          }
        }
        ax += bx * 8 - f.vx * 2;
        az += bz * 8 - f.vz * 2;
      }
      f.scare = Math.max(0, f.scare - dt);
      f.vx += ax * dt;
      f.vz += az * dt;
      const max = f.scare > 0 ? FISH.fleeSpeed : FISH.speed;
      const v = Math.hypot(f.vx, f.vz);
      if (v > max) {
        f.vx *= max / v;
        f.vz *= max / v;
      }
      f.x += f.vx * dt;
      f.z += f.vz * dt;
      const g = groundHeight(f.x, f.z),
        surf = waterField.surfaceAt(f.x, f.z);
      if (surf - g < 0.12 || Math.hypot(f.x - home.x, f.z - home.z) > 80) respawn(f); // stranded or lost
      f.y = Math.max(g + 0.12, surf - 0.3 - 0.15 * Math.sin(f.x * 0.7 + f.z));
    }
    pool.begin();
    for (let k = 0; k < FISH.count; k++) {
      const f = P[k],
        h = Math.atan2(f.vx, f.vz) / 2;
      pool.push(f.x, f.y, f.z, 0, Math.sin(h), 0, Math.cos(h), 1, 1, 1);
    }
    pool.end();
  },
  { phase: 'update' },
);

window.__fish = {
  P,
  get home() {
    return home;
  },
};
