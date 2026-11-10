// Cosmetic splashes: foam droplets (the shared pool, src/render/particles.ts) plus a ripple ring in the sea shader.
// Detected locally on every client from displayed positions, never networked, so floats and Math.random are fine here.
import * as THREE from 'three';
import { BALL_R, GRAVITY, reducedMotion, SWIM_DEPTH } from '../constants.ts';
import { seaRipples } from './water-render.ts';
import { emit } from './particles.ts';
import { waterField } from '../physics/water-field.ts';
import { groundProbe } from '../physics/physics.ts';
import { readableIntensity } from './readable-unlit.ts';

// Display-range foam: the droplets are unlit, so at the fixed surface gain (0.12) intensity one drew them dark grey
// against the lit sea (owner, 10 November: "the water splash particles are extremely dark/gray"). They take the
// readable inverse gain at spawn, as the reward sparkles do, so they read as white foam like the sea's own lip.
const FOAM = new THREE.Color().setRGB(0.96, 0.99, 1.0, THREE.SRGBColorSpace);

let elapsedNow = 0;

// seaRipples: x, z, start time, strength (0 = unused); the sea shader's ripple array sets how many
let rippleCursor = 0;
function addRipple(x: number, z: number, strength: number) {
  seaRipples[rippleCursor]!.set(x, z, elapsedNow, strength);
  rippleCursor = (rippleCursor + 1) % seaRipples.length;
}

// strength 0..1, level: the water surface there
export function splash(x: number, z: number, strength: number, level: number) {
  strength = Math.min(Math.max(strength, 0), 1);
  const body = waterField.nearby({ x, y: level, z }).body;
  if (body === 'sea') addRipple(x, z, 0.35 + strength * 0.65);
  const n = Math.round((10 + strength * 55) * (reducedMotion ? 0.3 : 1));
  const up = 2.5 + strength * 5.5;
  const spread = 0.8 + strength * 2.2;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (0.15 + strength * 0.35);
    const sp = spread * (0.3 + Math.random() * 0.7);
    emit({
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
      intensity: readableIntensity(),
      gravity: GRAVITY * 0.8,
      floor: level,
    });
  }
}

// Tracks the vertical motion of one thing (ball or avatar) and reports a water entry.
type Tracker = {
  y: number;
  x: number;
  z: number;
  cool: number;
  bottomOffset: number;
  sub: number;
  body: string;
  valid: boolean;
};
function makeTracker(bottomOffset: number): Tracker {
  return { y: NaN, x: 0, z: 0, cool: 0, bottomOffset, sub: NaN, body: '', valid: false };
}
const ballTrack = makeTracker(-BALL_R);
const meTrack = makeTracker(-SWIM_DEPTH);
const remoteTracks = new Map<string, Tracker>();

function track(
  id: string,
  t: Tracker,
  x: number,
  y: number,
  z: number,
  vyHint: number | null,
  dt: number,
  minSpeed: number,
  scale: number,
) {
  const bottom = y + t.bottomOffset;
  const prev = t.y;
  const water = waterField.sampleAt(id, { x, y, z });
  const sub = bottom - water.height;
  const crossing = t.sub > 0 && sub <= 0 && t.body === water.bodyId;
  const fresh = t.valid && water.valid;
  t.sub = sub;
  t.body = water.bodyId;
  t.valid = water.valid;
  const moved = Math.abs(x - t.x) + Math.abs(z - t.z) + Math.abs(bottom - prev);
  t.y = bottom;
  t.x = x;
  t.z = z;
  t.cool -= dt;
  if (Number.isNaN(prev) || moved > 4 || dt <= 0) return; // teleport or first sample
  const level = water.height;
  const bed = waterField.moving ? water.bedHeight : groundProbe.under(x, y, z);
  if (crossing && fresh && t.cool <= 0 && bed < level - 0.1) {
    const vy = vyHint !== null ? vyHint : (bottom - prev) / dt;
    const speed = water.verticalVelocity - vy;
    if (vy < -0.1 && speed >= minSpeed) {
      splash(x, z, ((speed - minSpeed) / 12) * scale + 0.1, level);
      t.cool = 0.2;
    }
  }
}

type Vec = { x: number; y: number; z: number };
export function updateSplash(
  dt: number,
  elapsed: number,
  bp: Vec,
  ball: { held: boolean; pose: { v: Vec } },
  me: { entered: boolean; body: { position: Vec; velocity: Vec } | null },
  remotes: Map<string, { avatar: unknown; visible: boolean; target: Vec }>,
) {
  elapsedNow = elapsed;
  if (ball.held) {
    ballTrack.y = NaN;
    ballTrack.valid = false;
  } else track('ball', ballTrack, bp.x, bp.y, bp.z, ball.pose.v.y, dt, 2.2, 1);

  if (me.entered && me.body) {
    const p = me.body.position;
    track('player', meTrack, p.x, p.y, p.z, me.body.velocity.y, dt, 3.5, 0.5);
  }
  for (const [peer, r] of remotes) {
    if (!r.avatar || !r.visible) continue;
    let t = remoteTracks.get(peer);
    if (!t) remoteTracks.set(peer, (t = makeTracker(-SWIM_DEPTH)));
    const p = r.target;
    track(`splash:${peer}`, t, p.x, p.y, p.z, null, dt, 3.5, 0.5);
  }
  if (remoteTracks.size > remotes.size)
    for (const k of remoteTracks.keys())
      if (!remotes.has(k)) {
        remoteTracks.delete(k);
        waterField.forget(`splash:${k}`);
      }
}
