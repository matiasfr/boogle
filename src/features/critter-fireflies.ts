// Fireflies, cosmetic tier: at night a few dozen soft blinking lights drift around the
// mushroom garden and over the grass. One additive point cloud; positions and blinks are local floats.
// Serves DESIGN.md 9 (the garden is a place worth visiting at night). Local only.
import * as THREE from 'three/webgpu';
import { texture, vec4, instancedDynamicBufferAttribute } from 'three/tsl';
import type { Node } from 'three/webgpu';
import { onFrame, onStart } from '../loop.ts';
import { dynAttr, instancedSprite } from '../render/sprites.ts';
import { CELL, HALF } from '../constants.ts';
import { groundHeight } from '../adapters/terrain.ts';
import { skyDebug } from '../render/sky.ts';
import { PATCH } from '../sim/mushrooms.ts';

const FLIES = { count: 60, nearGarden: 0.6, night: 0.35, size: 0.45 };
const pos = new Float32Array(FLIES.count * 3),
  col = new Float32Array(FLIES.count * 3);
const posAttr = dynAttr(pos, 3);
const colAttr = dynAttr(col, 3);
const glow = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.3, 'rgba(255,255,255,0.6)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
})();
const fliesMat = new THREE.PointsNodeMaterial({
  size: FLIES.size,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
// the per-fly colour, a vec3 attribute (three's TSL types can't tell its size from the attribute)
const flyColor = instancedDynamicBufferAttribute(colAttr) as unknown as Node<'vec3'>;
fliesMat.colorNode = texture(glow).mul(vec4(flyColor, 1));
const flies = instancedSprite(fliesMat, posAttr, FLIES.count);

const F: { x: number; z: number; h: number; ph: number; sp: number }[] = [];
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
    const want = skyDebug.state.day < FLIES.night ? 1 : 0;
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
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  },
  { phase: 'update' },
);
