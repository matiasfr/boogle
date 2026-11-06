// Procedural sole/body recipes, context-injected for the listening pack. No samples or second audio context.
import type { StepSurface } from './locomotion-surfaces.ts';

export type LocomotionKind = 'walk' | 'run' | 'jump' | 'land';
export type LocomotionSound = {
  surface: StepSurface;
  kind: LocomotionKind;
  take: number;
  pitch?: number;
  gain?: number;
  at?: number;
  onEnded?: () => void;
};
const buffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
const MATERIAL = {
  grass: { body: 150, tone: 0.45, grain: 0.5, filter: 0.12, ring: 0 },
  sand: { body: 130, tone: 0.32, grain: 0.6, filter: 0.09, ring: 0 },
  wood: { body: 235, tone: 0.8, grain: 0.18, filter: 0.3, ring: 0 },
  rail: { body: 190, tone: 0.6, grain: 0.16, filter: 0.38, ring: 0.13 },
  water: { body: 170, tone: 0.32, grain: 0.65, filter: 0.06, ring: 0 },
};

function recipe(ctx: BaseAudioContext, surface: StepSurface, kind: LocomotionKind, take: number) {
  let cache = buffers.get(ctx);
  if (!cache) buffers.set(ctx, (cache = new Map()));
  const key = `${surface}:${kind}:${take}`;
  const known = cache.get(key);
  if (known) return known;
  const m = MATERIAL[surface],
    duration = kind === 'land' ? 0.24 : kind === 'jump' ? 0.1 : kind === 'run' ? 0.13 : 0.17;
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate),
    data = b.getChannelData(0);
  let seed = 0x5b00 + take * 173 + Object.keys(MATERIAL).indexOf(surface) * 7919;
  let low = 0,
    peak = 0;
  const f = m.body * (0.87 + take * 0.045),
    bodyDecay = kind === 'land' ? 28 : kind === 'run' ? 50 : 38;
  for (let i = 0; i < data.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const t = i / ctx.sampleRate,
      noise = seed / 0x80000000 - 1;
    low += m.filter * (noise - low);
    const attack = Math.min(1, t / 0.003),
      fade = Math.min(1, (duration - t) / 0.015);
    const body = Math.sin(2 * Math.PI * f * t - 5 * t * t) * Math.exp(-bodyDecay * t);
    const toe = Math.max(0, t - (0.022 + take * 0.002));
    const grain = low * (Math.exp(-23 * t) + (toe > 0 ? 0.5 * Math.exp(-50 * toe) : 0));
    const ring = Math.sin(2 * Math.PI * (1100 + take * 83) * t) * Math.exp(-35 * t);
    const splash = surface === 'water' ? Math.sin(2 * Math.PI * (470 * t - 600 * t * t)) * Math.exp(-24 * t) * 0.1 : 0;
    data[i] = attack * fade * (m.tone * body + m.grain * grain + m.ring * ring + splash);
    peak = Math.max(peak, Math.abs(data[i]!));
  }
  // One measured source reference; performance strength lives in dB at the caller, never accidental waveform peaks.
  const scale = 10 ** (-12 / 20) / peak;
  for (let i = 0; i < data.length; i++) data[i]! *= scale;
  cache.set(key, b);
  return b;
}

export function renderLocomotionSound(ctx: BaseAudioContext, out: AudioNode, sound: LocomotionSound) {
  const start = sound.at ?? ctx.currentTime,
    pitch = sound.pitch ?? 1;
  const source = ctx.createBufferSource(),
    envelope = ctx.createGain();
  source.buffer = recipe(ctx, sound.surface, sound.kind, sound.take);
  source.playbackRate.value = pitch;
  envelope.gain.value = sound.gain ?? 1;
  source.connect(envelope).connect(out);
  const end = start + source.buffer.duration / pitch;
  source.onended = () => {
    source.disconnect();
    envelope.disconnect();
    sound.onEnded?.();
  };
  source.start(start);
  source.stop(end);
  return {
    end,
    stop() {
      const t = ctx.currentTime;
      envelope.gain.cancelScheduledValues(t);
      envelope.gain.setTargetAtTime(0, t, 0.002);
      source.stop(t + 0.008);
    },
  };
}
