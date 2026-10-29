// Cosmetic splashes: foam droplets plus a ripple ring in the sea shader.
// Detected locally on every client from displayed positions, never networked, so floats and Math.random are fine here.
import * as THREE from 'three';
import { SEA, BALL_R, GRAVITY, reducedMotion } from './constants.js';
import { scene, camera, renderer } from './scene.js';
import { waterMat } from './water-render.js';
import { groundHeight } from './terrain.js';

const MAX = reducedMotion ? 120 : 480;
const MAX_RIPPLES = 8;
const FEET = 0.35; // waterline offset used by the swim code in physics.js

const pos = new Float32Array(MAX * 3);
const vel = new Float32Array(MAX * 3);
const life = new Float32Array(MAX); // seconds left, <= 0 = free
const size = new Float32Array(MAX);
const alpha = new Float32Array(MAX);
const maxLife = new Float32Array(MAX);
for (let i = 0; i < MAX; i++) pos[i * 3 + 1] = -1000;

const geo = new THREE.BufferGeometry();
const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
const sizeAttr = new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage);
const alphaAttr = new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage);
geo.setAttribute('position', posAttr);
geo.setAttribute('aSize', sizeAttr);
geo.setAttribute('aAlpha', alphaAttr);

const mat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uScale: { value: 500 } },
  vertexShader: `
    attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vA;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vA = aAlpha;
      gl_PointSize = max(aSize * uScale / max(-mv.z, 0.1), 1.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      if (d > 1.0) discard;
      gl_FragColor = vec4(0.96, 0.99, 1.0, vA * (1.0 - d * d));
    }`,
});
const points = new THREE.Points(geo, mat);
points.frustumCulled = false;
points.renderOrder = 5;
scene.add(points);

let cursor = 0;
let active = 0;
let elapsedNow = 0;

// ripples: x, z, start time, strength (0 = unused)
const ripples = waterMat.uniforms.uRip.value;
let rippleCursor = 0;
function addRipple(x, z, strength) {
  ripples[rippleCursor].set(x, z, elapsedNow, strength);
  rippleCursor = (rippleCursor + 1) % MAX_RIPPLES;
}

// strength 0..1
function splash(x, z, strength) {
  strength = Math.min(Math.max(strength, 0), 1);
  addRipple(x, z, 0.35 + strength * 0.65);
  const n = Math.round((10 + strength * 55) * (reducedMotion ? 0.3 : 1));
  const up = 2.5 + strength * 5.5;
  const spread = 0.8 + strength * 2.2;
  for (let k = 0; k < n; k++) {
    const i = cursor;
    cursor = (cursor + 1) % MAX;
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (0.15 + strength * 0.35);
    const sp = spread * (0.3 + Math.random() * 0.7);
    pos[i * 3] = x + Math.cos(a) * r;
    pos[i * 3 + 1] = SEA + 0.05;
    pos[i * 3 + 2] = z + Math.sin(a) * r;
    vel[i * 3] = Math.cos(a) * sp;
    vel[i * 3 + 1] = up * (0.45 + Math.random() * 0.75);
    vel[i * 3 + 2] = Math.sin(a) * sp;
    maxLife[i] = life[i] = 0.9 + Math.random() * 0.7;
    size[i] = 0.07 + Math.random() * 0.09 + strength * 0.06;
    alpha[i] = 0.95;
  }
}

// Tracks the vertical motion of one thing (ball or avatar) and reports a water entry.
function makeTracker(bottomOffset) {
  return { y: NaN, x: 0, z: 0, cool: 0, bottomOffset };
}
const ballTrack = makeTracker(-BALL_R);
const meTrack = makeTracker(-FEET);
const remoteTracks = new Map();

function track(t, x, y, z, vyHint, dt, minSpeed, scale) {
  const bottom = y + t.bottomOffset;
  const prev = t.y;
  const moved = Math.abs(x - t.x) + Math.abs(z - t.z) + Math.abs(bottom - prev);
  t.y = bottom;
  t.x = x;
  t.z = z;
  t.cool -= dt;
  if (Number.isNaN(prev) || moved > 4 || dt <= 0) return; // teleport or first sample
  if (prev > SEA && bottom <= SEA && t.cool <= 0 && groundHeight(x, z) < SEA - 0.1) {
    const vy = vyHint !== null ? vyHint : (bottom - prev) / dt;
    const speed = -vy;
    if (speed >= minSpeed) {
      splash(x, z, ((speed - minSpeed) / 12) * scale + 0.1);
      t.cool = 0.2;
    }
  }
}

export function updateSplash(dt, elapsed, ball, me, remotes) {
  elapsedNow = elapsed;
  const bp = ball.mesh.position;
  track(ballTrack, bp.x, bp.y, bp.z, ball.held ? 0 : ball.disp.v.y, dt, 2.2, 1);

  if (me.entered && me.body) {
    const p = me.body.position;
    track(meTrack, p.x, p.y, p.z, me.body.velocity.y, dt, 3.5, 0.5);
  }
  for (const [peer, r] of remotes) {
    if (!r.avatar || !r.visible) continue;
    let t = remoteTracks.get(peer);
    if (!t) remoteTracks.set(peer, (t = makeTracker(-FEET)));
    const p = r.target;
    track(t, p.x, p.y, p.z, null, dt, 3.5, 0.5);
  }
  if (remoteTracks.size > remotes.size) for (const k of remoteTracks.keys()) if (!remotes.has(k)) remoteTracks.delete(k);

  let n = 0;
  for (let i = 0; i < MAX; i++) {
    if (life[i] <= 0) continue;
    life[i] -= dt;
    const i3 = i * 3;
    vel[i3 + 1] -= GRAVITY * 0.8 * dt;
    pos[i3] += vel[i3] * dt;
    pos[i3 + 1] += vel[i3 + 1] * dt;
    pos[i3 + 2] += vel[i3 + 2] * dt;
    if (life[i] <= 0 || (pos[i3 + 1] < SEA && vel[i3 + 1] < 0)) {
      life[i] = 0;
      pos[i3 + 1] = -1000;
      alpha[i] = 0;
      size[i] = 0;
      continue;
    }
    alpha[i] = Math.min(1, (life[i] / maxLife[i]) * 2) * 0.95;
    n++;
  }
  const had = active > 0;
  active = n;
  if (n > 0 || had) {
    posAttr.needsUpdate = sizeAttr.needsUpdate = alphaAttr.needsUpdate = true;
  }
  points.visible = n > 0;
  mat.uniforms.uScale.value = renderer.domElement.height / (2 * Math.tan((camera.fov * Math.PI) / 360));
}
