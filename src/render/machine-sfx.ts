// The track machine's sounds (src/features/track-machine.ts): a steam chuff, a sleeper's thump, a rail's clank and the
// end-of-run whistle, synthesized on the shared audio context (./audio.ts), quieter with distance from the camera.
// Local and cosmetic: never read by the simulation, so Math.random is fine.
import { getAudio } from './audio.ts';
import { camera } from './scene.ts';

const HEAR = 45; // metres: silent beyond
let noise: AudioBuffer | null = null;

function at(x: number, z: number, gain: number) {
  const a = getAudio();
  if (!a) return null;
  const d = Math.hypot(camera.position.x - x, camera.position.z - z);
  const g = gain * Math.max(0, 1 - d / HEAR) ** 2;
  if (g < 0.003) return null;
  if (!noise || noise.sampleRate !== a.ctx.sampleRate) {
    noise = a.ctx.createBuffer(1, a.ctx.sampleRate, a.ctx.sampleRate);
    const ch = noise.getChannelData(0);
    for (let k = 0; k < ch.length; k++) ch[k] = Math.random() * 2 - 1;
  }
  return { ...a, g, t: a.ctx.currentTime + 0.005 };
}
function burst(ctx: AudioContext, out: AudioNode, t: number, len: number) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.connect(out);
  src.start(t, Math.random() * 0.5, len + 0.05);
  return src;
}
function env(ctx: AudioContext, out: AudioNode, t: number, peak: number, attack: number, decay: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(out);
  return g;
}

// A puff of steam: band-passed noise, lower and longer when `heavy` (warming up, a hard push).
export function chuff(x: number, z: number, heavy = 0): void {
  const a = at(x, z, 0.28 + heavy * 0.15);
  if (!a) return;
  const { ctx, out, g, t } = a;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(900 - heavy * 300 + Math.random() * 200, t);
  bp.frequency.exponentialRampToValueAtTime(300, t + 0.18);
  bp.Q.value = 1.2;
  bp.connect(env(ctx, out, t, g, 0.008, 0.16 + heavy * 0.1));
  burst(ctx, bp, t, 0.3);
}

// A sleeper landing: a low pitch-dropping thud plus a short dull knock.
export function thump(x: number, z: number): void {
  const a = at(x, z, 0.75);
  if (!a) return;
  const { ctx, out, g, t } = a;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(95 + Math.random() * 20, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.16);
  o.connect(env(ctx, out, t, g, 0.004, 0.2));
  o.start(t);
  o.stop(t + 0.3);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 700;
  lp.connect(env(ctx, out, t, g * 0.6, 0.002, 0.07));
  burst(ctx, lp, t, 0.1);
}

// A rail dropped on the sleepers: two inharmonic metal partials ringing out.
export function clank(x: number, z: number): void {
  const a = at(x, z, 0.12);
  if (!a) return;
  const { ctx, out, g, t } = a;
  const f = 1100 + Math.random() * 250;
  for (const [mul, k] of [
    [1, 1],
    [2.76, 0.6],
    [5.4, 0.3],
  ]) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f * mul;
    o.connect(env(ctx, out, t, g * k, 0.002, 0.35 / mul + 0.08));
    o.start(t);
    o.stop(t + 0.5);
  }
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2500;
  hp.connect(env(ctx, out, t, g * 0.8, 0.001, 0.04));
  burst(ctx, hp, t, 0.06);
}

// The whistle at the end of a run: a two-note steam chord with a little wobble.
export function whistle(x: number, z: number): void {
  const a = at(x, z, 0.18);
  if (!a) return;
  const { ctx, out, g, t } = a;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, t);
  amp.gain.exponentialRampToValueAtTime(g, t + 0.06);
  amp.gain.setValueAtTime(g, t + 1.0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  amp.connect(out);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 6;
  const depth = ctx.createGain();
  depth.gain.value = 9;
  lfo.connect(depth);
  lfo.start(t);
  lfo.stop(t + 1.6);
  for (const f of [587, 740, 880]) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(f * 0.94, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    depth.connect(o.frequency);
    o.connect(amp);
    o.start(t);
    o.stop(t + 1.6);
  }
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200;
  bp.connect(env(ctx, out, t, g * 0.5, 0.05, 1.3));
  burst(ctx, bp, t, 1.4);
}
