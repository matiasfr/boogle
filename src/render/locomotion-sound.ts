// Procedural sole/body recipes, context-injected for the listening pack. No samples or second audio context.
import type { StepSurface } from './locomotion-surfaces.ts';

export type LocomotionKind = 'walk' | 'run' | 'jump' | 'land';
export type LocomotionSound = {
  surface: StepSurface;
  kind: LocomotionKind;
  take: number;
  style?: number;
  pitch?: number;
  gain?: number;
  at?: number;
  onEnded?: () => void;
};
const buffers = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();
const MATERIAL = {
  grass: { body: 125, decay: 48, grain: 0.18, band: 650, width: 400, ms: 8, ring: 0, overtone: 2 },
  sand: { body: 105, decay: 55, grain: 0.26, band: 900, width: 500, ms: 10, ring: 0, overtone: 2 },
  wood: { body: 210, decay: 36, grain: 0.1, band: 700, width: 200, ms: 5, ring: 0.18, overtone: 2.08 },
  rail: { body: 165, decay: 43, grain: 0.12, band: 1300, width: 300, ms: 5, ring: 0.14, overtone: 3.47 },
  water: { body: 145, decay: 46, grain: 0.2, band: 1200, width: 600, ms: 9, ring: 0, overtone: 2 },
};
// A: soft sole, B: a drier/material-rich contact, C: a rounded toy tick.
const STYLES = [
  { pitch: 0.94, decay: 1, texture: 0.55, ring: 0.8, tick: 0 },
  { pitch: 1, decay: 1.18, texture: 1.7, ring: 1.1, tick: 0 },
  { pitch: 1.1, decay: 0.9, texture: 0.45, ring: 0.7, tick: 0.2 },
] as const;

function recipe(ctx: BaseAudioContext, surface: StepSurface, kind: LocomotionKind, take: number, style: number) {
  let cache = buffers.get(ctx);
  if (!cache) buffers.set(ctx, (cache = new Map()));
  const key = `${style}:${surface}:${kind}:${take}`;
  const known = cache.get(key);
  if (known) return known;
  const m = MATERIAL[surface],
    s = STYLES[style] ?? STYLES[0],
    duration = kind === 'land' ? 0.18 : kind === 'jump' ? 0.09 : 0.12;
  const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate),
    data = b.getChannelData(0);
  let seed = 0x5b00 + take * 173 + Object.keys(MATERIAL).indexOf(surface) * 7919;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  // Random-phase, band-limited texture: no white-noise excitation or sustained noise tail.
  // The highest mode is 1.8 kHz; a smooth 5–10 ms window keeps its energy below 4 kHz.
  const modes = Array.from({ length: 16 }, () => ({
    hz: m.band + (random() - 0.5) * m.width,
    phase: random() * Math.PI * 2,
  }));
  let peak = 0;
  const f = m.body * s.pitch * (0.94 + take * 0.024) * (kind === 'land' ? 0.9 : 1),
    bodyDecay = m.decay * s.decay * (kind === 'land' ? 0.8 : kind === 'run' ? 1.12 : 1);
  for (let i = 0; i < data.length; i++) {
    const t = i / ctx.sampleRate;
    const attack = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, t / 0.004)),
      fade = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, (duration - t) / 0.02));
    const body = Math.sin(2 * Math.PI * f * t) * Math.exp(-bodyDecay * t);
    const textureTime = (t - 0.002) / (m.ms / 1000);
    const textureWindow = textureTime > 0 && textureTime < 1 ? Math.sin(Math.PI * textureTime) ** 4 : 0;
    let grain = 0;
    if (textureWindow) for (const mode of modes) grain += Math.sin(2 * Math.PI * mode.hz * t + mode.phase) / 4;
    const ring = Math.sin(2 * Math.PI * f * m.overtone * t) * Math.exp(-60 * t);
    const tick = Math.sin(2 * Math.PI * f * 3 * t) * Math.exp(-95 * t);
    // Delayed descending bubble under the tiny splash, with its own click-free onset.
    const bt = Math.max(0, t - 0.012);
    const bubble =
      surface === 'water'
        ? Math.sin(2 * Math.PI * (330 * bt + 3 * (1 - Math.exp(-40 * bt)))) *
          (1 - Math.exp(-600 * bt)) ** 2 *
          Math.exp(-65 * bt) *
          0.28
        : 0;
    data[i] =
      attack *
      fade *
      (body + m.grain * s.texture * grain * textureWindow + m.ring * s.ring * ring + s.tick * tick + bubble);
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
  source.buffer = recipe(ctx, sound.surface, sound.kind, sound.take, sound.style ?? 0);
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
