// Fish (prototype flag `fish`), cosmetic tier: a school that lives in water deep enough to swim in (the sea, the
// flooded beach, a channel or pool players dug: it reads the shared water surface), with simple boids and a
// steer toward deeper water; it scatters when the ball splashes in or a player swims through. One instanced mesh, the
// tail wiggle is in the vertex shader. Local Math.random is fine: nothing here is read by the sim.
// Serves DESIGN.md 9 (the island is alive) and 2 (the ball scares fish). With 36 fish, plain pairwise boids is cheaper
// than bucketing them on the cell grid.
import * as THREE from 'three';
import { onFrame, onStart } from '../loop.js';
import { scene } from '../render/scene.js';
import { groundHeight } from '../adapters/terrain.js';
import { waterField } from '../physics/water-field.js';
import { ball } from '../physics/ball.js';
import { me } from '../player/player.js';
import { remotes } from '../netplay/net.js';
import { waterMat } from '../render/water-render.js';
import { patchMaterial } from '../render/material-patch.js';
import { proto } from '../adapters/proto-flags.js';

const FISH = {
  count: 36,
  speed: 1.8, // m/s cruising
  fleeSpeed: 6,
  minDepth: 0.4, // m of water a fish wants under it
  sep: 0.7,
  scare: 3.5, // m from a swimmer or a splashing ball
};

const depthAt = (x, z) => waterField.surfaceAt(x, z) - groundHeight(x, z);
const geo = new THREE.ConeGeometry(0.11, 0.48, 5).rotateX(Math.PI / 2); // points along +z
const mat = new THREE.MeshStandardMaterial({
  color: '#ff6a1a',
  emissive: '#7a2a00',
  roughness: 0.6,
  flatShading: true,
});
patchMaterial(mat, 'fishwiggle', (sh) => {
  sh.uniforms.uT = waterMat.uniforms.uTime;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uT;')
    .replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\ntransformed.x += sin(uT * 13.0 + float(gl_InstanceID) * 1.7) * max(0.0, -position.z) * 0.35;',
    );
});
const fish = new THREE.InstancedMesh(geo, mat, FISH.count);
fish.frustumCulled = false;
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

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  one = new THREE.Vector3(1, 1, 1),
  pos = new THREE.Vector3();
let lastBallY = 0;

onFrame(
  ({ dt }) => {
    fish.visible = proto.on('fish') && !!home;
    if (!fish.visible || dt <= 0) return;
    // scares: a ball that just hit the water near the surface, players swimming
    const scares = [];
    const bp = ball.mesh.position;
    const bs = waterField.surfaceAt(bp.x, bp.z);
    if (bp.y < bs + 0.6 && lastBallY - bp.y > 0.02) scares.push(bp);
    lastBallY = bp.y;
    if (me.swimming && me.body) scares.push(me.body.position);
    for (const r of remotes.values()) if (r.state === 2) scares.push(r.target);
    let cx = 0,
      cz = 0;
    for (const f of P) {
      cx += f.x / FISH.count;
      cz += f.z / FISH.count;
    }
    for (const f of P) {
      let ax = (cx - f.x) * 0.15 + (Math.random() - 0.5) * 2,
        az = (cz - f.z) * 0.15 + (Math.random() - 0.5) * 2;
      for (const o of P) {
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
      for (const s of scares) {
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
        for (const [px, pz] of [
          [1.5, 0],
          [-1.5, 0],
          [0, 1.5],
          [0, -1.5],
        ]) {
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
    for (let k = 0; k < FISH.count; k++) {
      const f = P[k];
      q.setFromEuler(e.set(0, Math.atan2(f.vx, f.vz), 0));
      fish.setMatrixAt(k, m4.compose(pos.set(f.x, f.y, f.z), q, one));
    }
    fish.instanceMatrix.needsUpdate = true;
  },
  { phase: 'update' },
);

window.__fish = {
  P,
  get home() {
    return home;
  },
};
