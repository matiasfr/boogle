// Cosmetic splashes: foam droplets (the shared pool, src/render/particles.js) plus a ripple ring in the sea shader.
// Detected locally on every client from displayed positions, never networked, so floats and Math.random are fine here.
import * as THREE from 'three';
import { BALL_R, GRAVITY, reducedMotion } from '../constants.js';
import { waterMat } from './water-render.js';
import { emit } from './particles.js';
import { groundHeight } from '../adapters/terrain.js';
import { waterField } from '../physics/water-field.js';

const FEET = 0.35; // waterline offset used by the swim code in physics.js
const FOAM = new THREE.Color().setRGB(0.96, 0.99, 1.0, THREE.SRGBColorSpace);

let elapsedNow = 0;

// ripples: x, z, start time, strength (0 = unused); the sea shader's uRip sets how many
const ripples = waterMat.uniforms.uRip.value;
let rippleCursor = 0;
function addRipple(x, z, strength) {
  ripples[rippleCursor].set(x, z, elapsedNow, strength);
  rippleCursor = (rippleCursor + 1) % ripples.length;
}

// strength 0..1, level: the water surface there
export function splash(x, z, strength, level) {
  strength = Math.min(Math.max(strength, 0), 1);
  addRipple(x, z, 0.35 + strength * 0.65);
  const n = Math.round((10 + strength * 55) * (reducedMotion ? 0.3 : 1));
  const up = 2.5 + strength * 5.5;
  const spread = 0.8 + strength * 2.2;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (0.15 + strength * 0.35);
    const sp = spread * (0.3 + Math.random() * 0.7);
    emit('soft', {
      x: x + Math.cos(a) * r,
      y: level + 0.05,
      z: z + Math.sin(a) * r,
      vx: Math.cos(a) * sp,
      vy: up * (0.45 + Math.random() * 0.75),
      vz: Math.sin(a) * sp,
      life: 0.9 + Math.random() * 0.7,
      size: 0.07 + Math.random() * 0.09 + strength * 0.06,
      alpha: 0.95,
      fade: 0.5,
      color: FOAM,
      gravity: GRAVITY * 0.8,
      floor: level,
    });
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
  const level = waterField.surfaceAt(x, z); // the sea, or the cave pond where that is higher
  if (prev > level && bottom <= level && t.cool <= 0 && groundHeight(x, z) < level - 0.1) {
    const vy = vyHint !== null ? vyHint : (bottom - prev) / dt;
    const speed = -vy;
    if (speed >= minSpeed) {
      splash(x, z, ((speed - minSpeed) / 12) * scale + 0.1, level);
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
  if (remoteTracks.size > remotes.size)
    for (const k of remoteTracks.keys()) if (!remotes.has(k)) remoteTracks.delete(k);
}
