// One cosmetic particle pool for dust, sand and spray. Local only: never networked and never read by the simulation,
// so floats and Math.random are fine. One look, 'soft': round soft dots (an instanced Sprite), used by splash foam
// (src/render/splash.js), the ball's sand puff (features/impact.js) and skid and splat dust (features/feel.js).
//
//   emit('soft', p)   one particle. p: { x, y, z, vx, vy, vz (m/s), life (s), size (m), color (THREE.Color),
//                    alpha (default 1), gravity (m/s², default 0), drag (1/s, default 0),
//                    floor: a height it dies falling through (water level),
//                    grow: [start, end] size multipliers over its life (default [1, 1]),
//                    shrink: the last fraction of its life it shrinks to nothing over (default 0, none),
//                    fade: the last fraction of its life its alpha fades out over (default 0, none) }
// A full pool recycles a random live slot. Updated once a frame, after the features that emit.
import * as THREE from 'three/webgpu';
import { Fn, Discard, length, uv, vec4, instancedDynamicBufferAttribute } from 'three/tsl';
import { scene } from './scene.js';
import { onFrame } from '../loop.js';

const FLOOR_NONE = 0,
  FLOOR_LEVEL = 1;

function createPool(max) {
  return {
    max,
    n: 0,
    pos: new Float32Array(max * 3),
    vel: new Float32Array(max * 3),
    color: new Float32Array(max * 3),
    life: new Float32Array(max),
    maxLife: new Float32Array(max),
    size: new Float32Array(max),
    grow0: new Float32Array(max),
    grow1: new Float32Array(max),
    shrink: new Float32Array(max),
    fade: new Float32Array(max),
    alpha: new Float32Array(max),
    gravity: new Float32Array(max),
    drag: new Float32Array(max),
    floor: new Uint8Array(max),
    floorY: new Float32Array(max),
  };
}
const VEC3 = ['pos', 'vel', 'color'];
const SCALAR = ['life', 'maxLife', 'size', 'grow0', 'grow1', 'shrink', 'fade', 'alpha', 'gravity', 'drag', 'floor'];

// ---------------------------------------------------------------- soft dots
// One instanced Sprite: per-instance centre, world diameter, linear colour and alpha come from dynamic buffers that
// wrap the pool arrays; sprite.count is the live number.
const soft = createPool(720);
const softSize = new Float32Array(soft.max);
const softAlpha = new Float32Array(soft.max);
const dyn = (array, n) => new THREE.InstancedBufferAttribute(array, n).setUsage(THREE.DynamicDrawUsage);
const posAttr = dyn(soft.pos, 3),
  colAttr = dyn(soft.color, 3),
  sizeAttr = dyn(softSize, 1),
  alphaAttr = dyn(softAlpha, 1);
const softMat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, fog: false });
softMat.positionNode = instancedDynamicBufferAttribute(posAttr);
softMat.scaleNode = instancedDynamicBufferAttribute(sizeAttr);
softMat.colorNode = Fn(() => {
  const d = length(uv().sub(0.5)).mul(2);
  Discard(d.greaterThan(1));
  return vec4(
    instancedDynamicBufferAttribute(colAttr),
    instancedDynamicBufferAttribute(alphaAttr).mul(d.mul(d).oneMinus()),
  );
})();
const softPoints = new THREE.Sprite(softMat);
softPoints.count = 0;
softPoints.frustumCulled = false;
softPoints.renderOrder = 5;
softPoints.visible = false;
scene.add(softPoints);

// ---------------------------------------------------------------- emit
const pools = { soft };
const rgb = { r: 0, g: 0, b: 0 };

export function emit(style, p) {
  const P = pools[style];
  let k = P.n;
  if (k >= P.max) k = Math.floor(Math.random() * P.max);
  else P.n++;
  P.pos[k * 3] = p.x;
  P.pos[k * 3 + 1] = p.y;
  P.pos[k * 3 + 2] = p.z;
  P.vel[k * 3] = p.vx ?? 0;
  P.vel[k * 3 + 1] = p.vy ?? 0;
  P.vel[k * 3 + 2] = p.vz ?? 0;
  p.color.getRGB(rgb); // linear: the output pass tone maps and encodes
  P.color[k * 3] = rgb.r;
  P.color[k * 3 + 1] = rgb.g;
  P.color[k * 3 + 2] = rgb.b;
  P.life[k] = P.maxLife[k] = p.life;
  P.size[k] = p.size;
  P.grow0[k] = p.grow?.[0] ?? 1;
  P.grow1[k] = p.grow?.[1] ?? 1;
  P.shrink[k] = p.shrink ?? 0;
  P.fade[k] = p.fade ?? 0;
  P.alpha[k] = p.alpha ?? 1;
  P.gravity[k] = p.gravity ?? 0;
  P.drag[k] = p.drag ?? 0;
  P.floor[k] = typeof p.floor === 'number' ? FLOOR_LEVEL : FLOOR_NONE;
  P.floorY[k] = typeof p.floor === 'number' ? p.floor : 0;
}

// ---------------------------------------------------------------- update
// Moves every live particle, drops the dead ones (the last live one is swapped into the hole) and returns how many
// are left. The live ones stay packed at the front, so each draw covers exactly them.
function step(P, dt) {
  let n = P.n;
  for (let k = 0; k < n;) {
    P.life[k] -= dt;
    const o = k * 3;
    if (P.drag[k]) {
      const d = Math.exp(-dt * P.drag[k]);
      P.vel[o] *= d;
      P.vel[o + 1] *= d;
      P.vel[o + 2] *= d;
    }
    P.vel[o + 1] -= P.gravity[k] * dt;
    P.pos[o] += P.vel[o] * dt;
    P.pos[o + 1] += P.vel[o + 1] * dt;
    P.pos[o + 2] += P.vel[o + 2] * dt;
    const down = P.floor[k] === FLOOR_LEVEL && P.vel[o + 1] < 0 && P.pos[o + 1] < P.floorY[k];
    if (P.life[k] <= 0 || down) {
      n--;
      if (k !== n) {
        for (const a of VEC3) P[a].copyWithin(o, n * 3, n * 3 + 3);
        for (const a of SCALAR) P[a][k] = P[a][n];
        P.floorY[k] = P.floorY[n];
      }
      continue;
    }
    k++;
  }
  return (P.n = n);
}

// Size multiplier from grow and shrink, at f = the fraction of its life left.
function scaleOf(P, k, f) {
  const s = P.size[k] * (P.grow0[k] + (P.grow1[k] - P.grow0[k]) * (1 - f));
  return P.shrink[k] ? s * Math.min(1, f / P.shrink[k]) : s;
}

let softHad = false;

onFrame(
  ({ dt }) => {
    const ns = step(soft, dt);
    for (let k = 0; k < ns; k++) {
      const f = soft.life[k] / soft.maxLife[k];
      softSize[k] = scaleOf(soft, k, f);
      softAlpha[k] = soft.fade[k] ? soft.alpha[k] * Math.min(1, f / soft.fade[k]) : soft.alpha[k];
    }
    softPoints.visible = ns > 0;
    if (ns > 0 || softHad) {
      softPoints.count = ns;
      for (const a of [posAttr, colAttr, sizeAttr, alphaAttr]) a.needsUpdate = true;
    }
    softHad = ns > 0;
  },
  { phase: 'late', order: -20 },
);

// Live counts, for scenarios and dev tooling.
export const particleCounts = () => ({ soft: soft.n });
