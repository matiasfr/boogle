// Placeholder house voices, synthesized live (no samples): a kick, hats from one noise buffer, an offbeat bass with
// harmonics that still read on an iPad speaker, and filtered chord stabs into a dotted-8th delay. Kept quiet and plain on
// purpose: the owner's stems replace all of it (stems.ts).
import { midiToHz } from './grid.ts';

let noise: AudioBuffer | null = null;
function noiseBuffer(ctx: AudioContext) {
  if (noise) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  return noise;
}

function env(ctx: AudioContext, dest: AudioNode, t: number, peak: number, attack: number, decay: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  g.connect(dest);
  return g;
}

export function kick(ctx: AudioContext, dest: AudioNode, t: number, vel = 1) {
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
  o.connect(env(ctx, dest, t, 0.9 * vel, 0.003, 0.32));
  o.start(t);
  o.stop(t + 0.4);
  // A short click so it reads on small speakers.
  const c = ctx.createOscillator();
  c.type = 'triangle';
  c.frequency.setValueAtTime(900, t);
  c.frequency.exponentialRampToValueAtTime(200, t + 0.02);
  c.connect(env(ctx, dest, t, 0.25 * vel, 0.001, 0.025));
  c.start(t);
  c.stop(t + 0.05);
}

export function hat(ctx: AudioContext, dest: AudioNode, t: number, vel: number, open: boolean) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = open ? 6500 : 8000;
  s.connect(hp).connect(env(ctx, dest, t, (open ? 0.22 : 0.16) * vel, 0.002, open ? 0.16 : 0.035));
  const off = Math.random() * 0.8; // a different slice of noise each hit
  s.start(t, off, open ? 0.2 : 0.06);
}

export function bass(ctx: AudioContext, dest: AudioNode, t: number, midi: number, dur: number) {
  const f = midiToHz(midi);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 6;
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(260, t + dur);
  const out = env(ctx, dest, t, 0.42, 0.006, dur);
  lp.connect(out);
  for (const [type, mul, g] of [
    ['sawtooth', 1, 0.5],
    ['sine', 0.5, 0.9],
  ] as [OscillatorType, number, number][]) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f * mul;
    const og = ctx.createGain();
    og.gain.value = g;
    o.connect(og).connect(lp);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

// Stabs share one delay line per destination.
const delays = new WeakMap<AudioNode, AudioNode>();
function stabBus(ctx: AudioContext, dest: AudioNode, beat: number) {
  let d = delays.get(dest);
  if (d) return d;
  const input = ctx.createGain();
  input.connect(dest);
  const delay = ctx.createDelay(2);
  delay.delayTime.value = beat * 0.75; // dotted 8th
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 1800;
  const wet = ctx.createGain();
  wet.gain.value = 0.35;
  input.connect(delay).connect(tone).connect(fb).connect(delay);
  tone.connect(wet).connect(dest);
  delays.set(dest, (d = input));
  return d;
}

export function stab(ctx: AudioContext, dest: AudioNode, t: number, notes: number[], beat: number, bright = 1) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 3;
  lp.frequency.setValueAtTime(1200 + 1600 * bright, t);
  lp.frequency.exponentialRampToValueAtTime(500, t + 0.2);
  lp.connect(env(ctx, stabBus(ctx, dest, beat), t, 0.2, 0.004, 0.22));
  const each = 1 / Math.sqrt(notes.length);
  for (const n of notes)
    for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midiToHz(n);
      o.detune.value = det;
      const og = ctx.createGain();
      og.gain.value = 0.5 * each;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + 0.3);
    }
}

// The pratfall: a slide down over one beat, like a deflating balloon.
export function slide(ctx: AudioContext, dest: AudioNode, t: number, beat: number) {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(midiToHz(81), t);
  o.frequency.exponentialRampToValueAtTime(midiToHz(57), t + beat * 0.9);
  const vib = ctx.createOscillator();
  vib.frequency.value = 7;
  const vg = ctx.createGain();
  vg.gain.value = 18;
  vib.connect(vg).connect(o.frequency);
  o.connect(env(ctx, dest, t, 0.35, 0.01, beat));
  o.start(t);
  vib.start(t);
  o.stop(t + beat + 0.05);
  vib.stop(t + beat + 0.05);
}
