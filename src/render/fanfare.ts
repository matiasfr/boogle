// Shared bits of the mini-game toys: a personal best per toy in localStorage, synthesized sounds, confetti. All Local:
// cosmetic, Math.random is fine.
import * as THREE from 'three/webgpu';
import { emit } from './particles.ts';
import { CONFETTI } from './reward-particles.ts';
import { readableIntensity } from './readable-unlit.ts';
import { dbToGain, getAudio } from './audio.ts';
import { audioSettings } from './audio-tuning.ts';
import { noiseBuffer } from './noise.ts';
import { camera } from './scene.ts';

// ---------------------------------------------------------------- personal bests (this browser only)
export function best(key: string): number | null {
  try {
    const v = localStorage.getItem('boogle.minis.' + key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- sounds
function noise(ctx: AudioContext) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx, 0.5);
  return s;
}
// Quieter the further the camera is from (x, z).
export const near = (x: number, z: number) =>
  1 / (1 + ((camera.position.x - x) ** 2 + (camera.position.z - z) ** 2) / 400);
function tone(type: OscillatorType, f0: number, f1: number, at: number, dur: number, vol: number) {
  vol *= dbToGain(audioSettings.minisDb);
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + at;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(out);
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  o.connect(g);
  o.start(t);
  o.stop(t + dur + 0.02);
}
/** A woody knock: a band of noise and a dropping body tone, louder and lower for a harder hit (k 0..1). */
export function knock(k: number, vol = 1) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.002;
  const n = noise(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 900 - 400 * k + Math.random() * 200;
  bp.Q.value = 3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.5 * vol * (0.4 + k) * dbToGain(audioSettings.minisDb), t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09 + 0.08 * k);
  n.connect(bp).connect(g).connect(out);
  n.start(t, Math.random() * 0.3);
  n.stop(t + 0.2);
  const f = 260 - 110 * k + Math.random() * 30;
  tone('triangle', f, f * 0.55, 0.002, 0.12 + 0.1 * k, 0.35 * vol * (0.4 + k));
}
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]; // major pentatonic steps
/** A bright pop, one step up the scale per count n, for "one more fell". */
export function pop(n: number, vol = 1) {
  const f = 523 * 2 ** (SCALE[Math.min(n, SCALE.length - 1)]! / 12);
  tone('sine', f * 0.7, f * 1.25, 0, 0.14, 0.32 * vol);
  tone('triangle', f * 2, f * 2.2, 0, 0.08, 0.08 * vol);
}
/** Rising arpeggio: a hole, a finish, a new best (bigger with `big`). */
let lastFanfare = -1e9;
export function fanfare(big: boolean, vol = 1) {
  lastFanfare = performance.now();
  const notes = big ? [0, 4, 7, 12, 16, 19, 24] : [0, 4, 7, 12];
  notes.forEach((s, k) => {
    const f = 392 * 2 ** (s / 12);
    tone('triangle', f, f * 1.01, k * 0.075, 0.32, 0.22 * vol);
    tone('sine', f * 2, f * 2, k * 0.075, 0.18, 0.06 * vol);
  });
}
/** The act card's sting: two soft chords, one step up. Silent when a fanfare played in the last 10 s (the show the act
 * follows has its own), so two stingers never stack. */
export function actSting() {
  if (performance.now() - lastFanfare < 10_000) return;
  [
    [0, 7, 12],
    [5, 12, 17],
  ].forEach((chord, c) =>
    chord.forEach((s) => {
      const f = 196 * 2 ** (s / 12);
      tone('triangle', f, f * 1.005, c * 0.32, 1.1, 0.16);
      tone('sine', f * 2, f * 2, c * 0.32, 0.8, 0.04);
    }),
  );
}
/** A springy boing for a mushroom (k 0..1: how hard). */
export function boing(k: number, vol = 1) {
  const f = 170 + 90 * k + Math.random() * 20;
  tone('triangle', f * 0.7, f * 1.6, 0, 0.09, 0.3 * vol);
  tone('triangle', f * 1.6, f * 0.8, 0.09, 0.22, 0.24 * vol);
}

// ---------------------------------------------------------------- particles
export function confetti(x: number, y: number, z: number, n = 90) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      s = 1 + Math.random() * 4;
    emit({
      x,
      y,
      z,
      vx: Math.cos(a) * s,
      vy: 6 + Math.random() * 7,
      vz: Math.sin(a) * s,
      life: 1.4 + Math.random() * 1.2,
      size: 0.16 + Math.random() * 0.14,
      color: CONFETTI[k % CONFETTI.length]!,
      intensity: readableIntensity(),
      gravity: 9,
      drag: 1.6,
      shrink: 0.3,
    });
  }
}
export function puff(x: number, y: number, z: number, n: number, speed: number, color: THREE.Color, size = 0.22) {
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2,
      s = speed * (0.4 + Math.random() * 0.8);
    emit({
      x: x + Math.cos(a) * 0.3,
      y: y + 0.1,
      z: z + Math.sin(a) * 0.3,
      vx: Math.cos(a) * s,
      vy: 0.6 + Math.random() * speed * 0.6,
      vz: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.4,
      size: size * (0.7 + Math.random() * 0.6),
      color,
      gravity: 1.5,
      drag: 3,
      grow: [0.6, 1.8],
      shrink: 0.3,
    });
  }
}

export const flat = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
