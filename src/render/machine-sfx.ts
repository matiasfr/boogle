// The track machine's sounds (src/entities/railway/track-machine.ts): a steam chuff, a sleeper's thump, a rail's clank and the
// end-of-run whistle, synthesized on the shared audio context (./audio.ts), quieter with distance from the camera.
// Local and cosmetic: never read by the simulation, so Math.random is fine.
import { dbToGain, getAudio } from './audio.ts';
import { audioSettings } from './audio-tuning.ts';
import { noiseBuffer } from './noise.ts';
import { camera } from './scene.ts';
import { hearGain, MACHINE_HEAR as HEAR } from './hearing.ts';

function at(x: number, z: number, gain: number, hear = HEAR) {
  const a = getAudio('work');
  if (!a) return null;
  const d = Math.hypot(camera.position.x - x, camera.position.z - z);
  const g = gain * hearGain(d, hear);
  if (g < 0.003) return null;
  return { ...a, g, t: a.ctx.currentTime + 0.005 };
}
function burst(ctx: AudioContext, out: AudioNode, t: number, len: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, 1);
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
  const a = at(x, z, 0.75 * dbToGain(audioSettings.machineThumpDb));
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
  ] as const) {
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

// A train's stop bell (a passenger's request accepted): one struck note, its partials ringing out over a second.
export function bell(x: number, z: number): void {
  const a = at(x, z, 0.16);
  if (!a) return;
  const { ctx, out, g, t } = a;
  for (const [mul, k, decay] of [
    [1, 1, 1.4],
    [2, 0.45, 0.9],
    [2.76, 0.3, 0.6],
    [5.4, 0.12, 0.3],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = 1320 * mul;
    o.connect(env(ctx, out, t, g * k, 0.003, decay));
    o.start(t);
    o.stop(t + decay + 0.1);
  }
}

// A bell cord's pull on your own press: a soft creak and tick, before the server has answered.
export function cordPull(x: number, z: number): void {
  const a = at(x, z, 0.1);
  if (!a) return;
  const { ctx, out, g, t } = a;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1800, t);
  bp.frequency.exponentialRampToValueAtTime(900, t + 0.12);
  bp.Q.value = 3;
  bp.connect(env(ctx, out, t, g, 0.004, 0.12));
  burst(ctx, bp, t, 0.15);
}

// The whistle at the end of a run: a two-note steam chord with a little wobble. `hear` widens its range for a call
// meant to carry across the island (the forge's call, docs/reviews/home-flow.md findings 2 and 3).
export function whistle(x: number, z: number, hear = HEAR): void {
  const a = at(x, z, 0.18 * dbToGain(audioSettings.machineWhistleDb), hear);
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
