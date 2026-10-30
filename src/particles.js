// One cosmetic particle pool for dust, sand and spray. Local only: never networked and never read by the simulation,
// so floats and Math.random are fine. Two looks share one integrator, one draw each:
//   'soft'   round soft dots (THREE.Points): splash foam (src/splash.js), the ball's sand puff (features/impact.js),
//            skid and splat dust (features/feel.js)
//   'clump'  lit faceted sand clumps (an InstancedMesh): the dig spray and pile dust (features/sand-fx.js)
//
//   emit(style, p)   one particle. p: { x, y, z, vx, vy, vz (m/s), life (s), size (m), color (THREE.Color),
//                    alpha (soft only, default 1), gravity (m/s², default 0), drag (1/s, default 0),
//                    floor: a height it dies falling through (water level) or 'ground' (dies landing on the terrain),
//                    grow: [start, end] size multipliers over its life (default [1, 1]),
//                    shrink: the last fraction of its life it shrinks to nothing over (default 0, none),
//                    fade: the last fraction of its life its alpha fades out over (default 0, none) }
// A full pool recycles a random live slot. Updated once a frame, after the features that emit.
import * as THREE from 'three';
import { scene, camera, renderer } from './scene.js';
import { groundHeight } from './terrain.js';
import { onFrame } from './loop.js';

const FLOOR_NONE = 0,
  FLOOR_LEVEL = 1,
  FLOOR_GROUND = 2;

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
const soft = createPool(720);
const softSize = new Float32Array(soft.max);
const softAlpha = new Float32Array(soft.max);
const softGeo = new THREE.BufferGeometry();
softGeo.setAttribute('position', new THREE.BufferAttribute(soft.pos, 3).setUsage(THREE.DynamicDrawUsage));
softGeo.setAttribute('aColor', new THREE.BufferAttribute(soft.color, 3).setUsage(THREE.DynamicDrawUsage));
softGeo.setAttribute('aSize', new THREE.BufferAttribute(softSize, 1).setUsage(THREE.DynamicDrawUsage));
softGeo.setAttribute('aAlpha', new THREE.BufferAttribute(softAlpha, 1).setUsage(THREE.DynamicDrawUsage));
softGeo.setDrawRange(0, 0);
// aSize is a world diameter; uScale turns it into pixels at depth 1. Colours are written as sRGB, untouched.
const softMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uScale: { value: 500 } },
  vertexShader: `
    attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float uScale;
    varying float vA; varying vec3 vC;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vA = aAlpha;
      vC = aColor;
      gl_PointSize = max(aSize * uScale / max(-mv.z, 0.1), 1.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vA; varying vec3 vC;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      gl_FragColor = vec4(vC, vA * (1.0 - d * d));
    }`,
});
const softPoints = new THREE.Points(softGeo, softMat);
softPoints.frustumCulled = false;
softPoints.renderOrder = 5;
softPoints.visible = false;
scene.add(softPoints);

// ---------------------------------------------------------------- sand clumps
const clump = createPool(220);
const clumps = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(0.5, 0),
  new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
  clump.max,
);
clumps.frustumCulled = false;
clumps.count = 0;
clumps.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
clumps.instanceColor = new THREE.InstancedBufferAttribute(clump.color, 3).setUsage(THREE.DynamicDrawUsage);
clumps.castShadow = false;
scene.add(clumps);

// ---------------------------------------------------------------- emit
const pools = { soft, clump };
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
  // the soft shader draws sRGB as is; the lit clumps take the working (linear) colour like any material
  if (style === 'soft') p.color.getRGB(rgb, THREE.SRGBColorSpace);
  else p.color.getRGB(rgb);
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
  P.floor[k] = p.floor === undefined ? FLOOR_NONE : p.floor === 'ground' ? FLOOR_GROUND : FLOOR_LEVEL;
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
    const falling = P.vel[o + 1] < 0;
    const f = P.floor[k];
    const down =
      (f === FLOOR_LEVEL && falling && P.pos[o + 1] < P.floorY[k]) ||
      (f === FLOOR_GROUND && falling && P.pos[o + 1] <= groundHeight(P.pos[o], P.pos[o + 2]) + 0.04);
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

const m4 = new THREE.Matrix4(),
  qI = new THREE.Quaternion(),
  vS = new THREE.Vector3(),
  vP = new THREE.Vector3();
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
      softGeo.setDrawRange(0, ns);
      for (const a of Object.values(softGeo.attributes)) a.needsUpdate = true;
      softMat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    }
    softHad = ns > 0;

    const nc = step(clump, dt);
    clumps.count = nc;
    for (let k = 0; k < nc; k++) {
      const s = scaleOf(clump, k, clump.life[k] / clump.maxLife[k]);
      m4.compose(vP.fromArray(clump.pos, k * 3), qI, vS.set(s, s, s));
      clumps.setMatrixAt(k, m4);
    }
    if (nc > 0) {
      clumps.instanceMatrix.needsUpdate = true;
      clumps.instanceColor.needsUpdate = true;
    }
  },
  { phase: 'late', order: -20 },
);

// Live counts, for scenarios and dev tooling.
export const particleCounts = () => ({ soft: soft.n, clump: clump.n });
