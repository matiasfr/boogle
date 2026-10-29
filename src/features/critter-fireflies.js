// Fireflies (prototype flag `fireflies`), cosmetic tier: at night a few dozen soft blinking lights drift around the
// mushroom garden and over the grass. One additive point cloud; positions and blinks are local floats.
// Serves DESIGN.md 9 (the garden is a place worth visiting at night). Local only.
import * as THREE from 'three';
import { onFrame, onStart } from '../loop.js';
import { scene } from '../scene.js';
import { CELL, HALF } from '../constants.js';
import { groundHeight } from '../terrain.js';
import { skyDebug } from '../sky.js';
import { PATCH } from '../sim/mushrooms.js';
import { proto } from '../proto-flags.js';

const FLIES = { count: 60, nearGarden: 0.6, night: 0.35, size: 0.45 };
const pos = new Float32Array(FLIES.count * 3),
  col = new Float32Array(FLIES.count * 3);
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
const glow = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
const flies = new THREE.Points(
  geo,
  new THREE.PointsMaterial({
    size: FLIES.size,
    map: glow,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
flies.frustumCulled = false;
flies.visible = false;
scene.add(flies);

const F = [];
onStart(() => {
  const gx = (PATCH.i0 + PATCH.w / 2) * CELL - HALF,
    gz = HALF - (PATCH.j0 + PATCH.h / 2) * CELL;
  for (let k = 0; k < FLIES.count; k++) {
    let x = gx,
      z = gz;
    if (Math.random() < FLIES.nearGarden) {
      x += (Math.random() - 0.5) * PATCH.w * CELL * 1.6;
      z += (Math.random() - 0.5) * PATCH.h * CELL * 1.6;
    } else
      for (let t = 0; t < 30; t++) {
        const a = Math.random() * Math.PI * 2,
          r = Math.random() * 40;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        const g = groundHeight(x, z);
        if (g > 1.6 && g < 6) break; // over the grass
      }
    F.push({ x, z, h: 0.4 + Math.random() * 1.6, ph: Math.random() * 100, sp: 0.4 + Math.random() * 0.6 });
  }
});

let shown = 0;
onFrame(
  ({ dt, elapsed }) => {
    const want = proto.on('fireflies') && skyDebug.state.day < FLIES.night ? 1 : 0;
    shown += (want - shown) * Math.min(1, dt * 0.5);
    flies.visible = shown > 0.01 && F.length > 0;
    if (!flies.visible) return;
    for (let k = 0; k < F.length; k++) {
      const f = F[k];
      const t = elapsed * f.sp + f.ph;
      const x = f.x + Math.sin(t * 0.7) * 1.2 + Math.sin(t * 1.9) * 0.3,
        z = f.z + Math.cos(t * 0.6) * 1.2 + Math.cos(t * 2.3) * 0.3;
      pos[k * 3] = x;
      pos[k * 3 + 1] = groundHeight(x, z) + f.h + Math.sin(t * 1.3) * 0.25;
      pos[k * 3 + 2] = z;
      const blink = Math.max(0, Math.sin(t * 2.2)) ** 3 * shown;
      col[k * 3] = 0.85 * blink;
      col[k * 3 + 1] = 1.0 * blink;
      col[k * 3 + 2] = 0.35 * blink;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  },
  { phase: 'update' },
);
