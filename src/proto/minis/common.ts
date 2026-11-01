// Shared bits of the mini-game toys (?proto=minis): world labels readable from 20 m, a personal best per toy in
// localStorage, synthesized sounds, confetti and your own ball shots. All Local: cosmetic, Math.random is fine.
import * as THREE from 'three/webgpu';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { camera } from '../../render/scene.ts';
import { ball } from '../../physics/ball.ts';
import { me } from '../../player/player.ts';
import { onFrame } from '../../loop.ts';

// ---------------------------------------------------------------- a big label that faces the camera
export type Label = {
  sprite: THREE.Sprite;
  set: (big: string, small?: string, color?: string) => void;
  punch: () => void;
};
const labels: { sprite: THREE.Sprite; w: number; h: number; punchAt: number }[] = [];
export function label(w: number, h: number): Label {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(w, h, 1);
  sprite.renderOrder = 10;
  const entry = { sprite, w, h, punchAt: -1e9 };
  labels.push(entry);
  let last = '';
  return {
    sprite,
    set(big, small = '', color = '#fff7e8') {
      const key = big + '|' + small + '|' + color;
      if (key === last) return;
      last = key;
      g.clearRect(0, 0, 512, 256);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      const line = (t: string, y: number, px: number, fill: string) => {
        g.font = `900 ${px}px Figtree, system-ui, sans-serif`;
        g.lineWidth = px * 0.16;
        g.strokeStyle = 'rgba(40, 24, 10, 0.85)';
        g.strokeText(t, 256, y, 496);
        g.fillStyle = fill;
        g.fillText(t, 256, y, 496);
      };
      if (small) {
        line(big, 100, 150, color);
        line(small, 214, 52, '#fff7e8');
      } else line(big, 128, 170, color);
      tex.needsUpdate = true;
    },
    punch: () => (entry.punchAt = performance.now()),
  };
}
// A punch pops a label up to 1.4x and springs it back over 0.35 s.
onFrame(
  () => {
    const now = performance.now();
    for (const l of labels) {
      const t = (now - l.punchAt) / 350;
      const k = t >= 1 ? 1 : 1 + 0.4 * Math.sin(t * Math.PI) * (1 - t);
      l.sprite.scale.set(l.w * k, l.h * k, 1);
    }
  },
  { phase: 'late', order: 40 },
);

// ---------------------------------------------------------------- personal bests (this browser only)
export function best(key: string): number | null {
  try {
    const v = localStorage.getItem('boogle.minis.' + key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
export function saveBest(key: string, v: number) {
  try {
    localStorage.setItem('boogle.minis.' + key, String(v));
  } catch {
    /* private window: the best lasts this visit only */
  }
}

// ---------------------------------------------------------------- sounds
let noiseBuf: AudioBuffer | null = null;
function noise(ctx: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}
// Quieter the further the camera is from (x, z).
export const near = (x: number, z: number) =>
  1 / (1 + ((camera.position.x - x) ** 2 + (camera.position.z - z) ** 2) / 400);
function tone(type: OscillatorType, f0: number, f1: number, at: number, dur: number, vol: number) {
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
  g.gain.linearRampToValueAtTime(0.5 * vol * (0.4 + k), t + 0.003);
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
  const f = 523 * 2 ** (SCALE[Math.min(n, SCALE.length - 1)] / 12);
  tone('sine', f * 0.7, f * 1.25, 0, 0.14, 0.32 * vol);
  tone('triangle', f * 2, f * 2.2, 0, 0.08, 0.08 * vol);
}
/** Rising arpeggio: a hole, a finish, a new best (bigger with `big`). */
export function fanfare(big: boolean, vol = 1) {
  const notes = big ? [0, 4, 7, 12, 16, 19, 24] : [0, 4, 7, 12];
  notes.forEach((s, k) => {
    const f = 392 * 2 ** (s / 12);
    tone('triangle', f, f * 1.01, k * 0.075, 0.32, 0.22 * vol);
    tone('sine', f * 2, f * 2, k * 0.075, 0.18, 0.06 * vol);
  });
}
/** A sad trombone: the funny failure. */
export function womp(vol = 1) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const notes = [233, 220, 208, 196];
  notes.forEach((f, k) => {
    const t = ctx.currentTime + k * 0.32;
    const last = k === notes.length - 1;
    const dur = last ? 0.9 : 0.3;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(1400, t + 0.08);
    lp.frequency.exponentialRampToValueAtTime(400, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22 * vol, t + 0.03);
    g.gain.setValueAtTime(0.22 * vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    if (last) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      const lg = ctx.createGain();
      lg.gain.value = 7;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur);
      o.frequency.linearRampToValueAtTime(f * 0.94, t + dur);
    }
    o.connect(lp).connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  });
}
/** A springy boing for a mushroom (k 0..1: how hard). */
export function boing(k: number, vol = 1) {
  const f = 170 + 90 * k + Math.random() * 20;
  tone('triangle', f * 0.7, f * 1.6, 0, 0.09, 0.3 * vol);
  tone('triangle', f * 1.6, f * 0.8, 0.09, 0.22, 0.24 * vol);
}

// ---------------------------------------------------------------- particles
const CONFETTI = ['#ff4f4f', '#ffcf33', '#2f8cff', '#4fdc7a', '#ff7ad9', '#ffffff'].map((c) => new THREE.Color(c));
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
      color: CONFETTI[k % CONFETTI.length],
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

// ---------------------------------------------------------------- your own shots at the ball
// A throw (the ball leaves your hands) or a bump (bump.ts stamps me.bumpAt). Listeners get the kind.
type Shot = 'throw' | 'bump';
const shotFns: ((s: Shot) => void)[] = [];
export const onShot = (fn: (s: Shot) => void) => shotFns.push(fn);
let wasHeld = false,
  lastBump = me.bumpAt;
onFrame(
  () => {
    const held = ball.mine && ball.held;
    if (wasHeld && !held && ball.mine) for (const fn of shotFns) fn('throw');
    wasHeld = held;
    if (me.bumpAt !== lastBump) {
      lastBump = me.bumpAt;
      for (const fn of shotFns) fn('bump');
    }
  },
  { phase: 'late', order: 41 },
);

export const flat = (ax: number, az: number, bx: number, bz: number) => Math.hypot(ax - bx, az - bz);
