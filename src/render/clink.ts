// A struck small object, synthesized: the shared voice of the pickup sounds (the pickup thock, the magnet's arrival
// ticks, the haul count; recipe in docs/research/collect-sounds.md). Three layers, the way a coin or bolt collect is
// built:
//   1. strike: 2-6 ms of band-passed noise (bright and short for metal, lower and longer for wood's "tok")
//   2. body: the modes of a struck bar. Metal is a free bar, 1 : 2.756 : 5.404 : 8.933 (inharmonic, so it rings like a
//      bolt, not a bell); wood an undercut marimba bar, 1 : 3.93 : 9.2 (round and short). `metal` blends the two.
//      Higher modes die faster, and the pitch drops 2 % into place over the first 12 ms (the snap of a hard hit).
//   3. sparkle: the bounce, a quieter second strike 25-45 ms later ("ting-ting"), an octave up unless asked otherwise.
// Each hit varies a little: fundamental ±6 cents (it stays in tune), the inharmonic modes ±1.5 %, level ±1.5 dB, the
// bounce's delay. Local and cosmetic.

const ROOT = 523.25; // C5
const PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3];
/** C major pentatonic, step n above (or below) C5. */
export const pentatonic = (n: number): number => ROOT * 2 ** Math.floor(n / 5) * PENTA[((n % 5) + 5) % 5];

export type Clink = {
  at: number; // AudioContext time
  freq: number; // the fundamental, Hz
  level: number; // peak gain of the fundamental
  metal?: number; // 0 wood .. 1 metal (default 1)
  ring?: number; // s for the fundamental to die away (default 0.09 for wood up to 0.26 for metal)
  bounce?: number; // the bounce's level against the strike, 0 for none (default 0.35)
  bounceFreq?: number; // default an octave up
  strike?: number; // the noise strike's level against the body (default 0.7)
};

const METAL = { ratio: [1, 2.756, 5.404, 8.933], gain: [1, 0.5, 0.3, 0.16], ring: [1, 0.5, 0.28, 0.16] };
const WOOD = { ratio: [1, 3.93, 9.2], gain: [1, 0.28, 0.1], ring: [1, 0.35, 0.15] };

let noise: AudioBuffer | null = null;
const rnd = (a: number) => (Math.random() * 2 - 1) * a;

function mode(ctx: BaseAudioContext, dest: AudioNode, at: number, f: number, peak: number, ring: number): void {
  if (peak < 1e-4 || f > 18000) return;
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(f * 1.02, at);
  o.frequency.exponentialRampToValueAtTime(f, at + 0.012);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(peak, at + 0.0015);
  g.gain.setTargetAtTime(0, at + 0.0015, ring / 6.9); // ring = time to fall 60 dB
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + ring * 1.1 + 0.02);
}

function strike(ctx: BaseAudioContext, dest: AudioNode, at: number, peak: number, metal: number): void {
  if (!noise || noise.sampleRate !== ctx.sampleRate) {
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.03), ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
  }
  const n = ctx.createBufferSource();
  n.buffer = noise;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = (1800 + 5200 * metal) * (1 + rnd(0.1));
  bp.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, at);
  g.gain.setTargetAtTime(0, at, 0.0012 + 0.0025 * (1 - metal));
  n.connect(bp).connect(g).connect(dest);
  n.start(at);
  n.stop(at + 0.03);
}

function hit(
  ctx: BaseAudioContext,
  dest: AudioNode,
  at: number,
  f: number,
  level: number,
  metal: number,
  ring: number,
) {
  for (const [set, w] of [
    [METAL, metal],
    [WOOD, 1 - metal],
  ] as const) {
    if (w < 0.03) continue;
    for (let k = 0; k < set.ratio.length; k++) {
      const r = k ? set.ratio[k] * (1 + rnd(0.015)) : 1;
      mode(ctx, dest, at, f * r, level * w * set.gain[k], ring * set.ring[k]);
    }
  }
}

/** One clink into `dest` (a bus input or a panner). */
export function clink(ctx: BaseAudioContext, dest: AudioNode, c: Clink): void {
  const metal = c.metal ?? 1;
  const ring = c.ring ?? 0.09 + 0.17 * metal;
  const level = c.level * 10 ** (rnd(1.5) / 20);
  const f = c.freq * 2 ** (rnd(6) / 1200);
  strike(ctx, dest, c.at, level * (c.strike ?? 0.7), metal);
  hit(ctx, dest, c.at, f, level, metal, ring);
  const b = c.bounce ?? 0.35;
  if (b > 0) hit(ctx, dest, c.at + 0.025 + Math.random() * 0.02, c.bounceFreq ?? f * 2, level * b, metal, ring * 0.7);
}
