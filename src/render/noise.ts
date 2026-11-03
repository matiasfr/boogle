// Shared noise buffers for sound effects: one per context, kind and length, made on first use. Sources only read them,
// so everyone can play the same one. Takes any context, so offline renders (dev/audio/) work too. Local and cosmetic.
const made = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

function buffer(
  ctx: BaseAudioContext,
  kind: string,
  seconds: number,
  channels: number,
  fill: (d: Float32Array) => void,
): AudioBuffer {
  let mine = made.get(ctx);
  if (!mine) made.set(ctx, (mine = new Map()));
  const key = `${kind}:${seconds}`;
  let b = mine.get(key);
  if (!b) {
    b = ctx.createBuffer(channels, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    for (let c = 0; c < channels; c++) fill(b.getChannelData(c));
    mine.set(key, b);
  }
  return b;
}

export const noiseBuffer = (ctx: BaseAudioContext, seconds: number) =>
  buffer(ctx, 'white', seconds, 1, (d) => {
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  });

// Brown noise (leaky-integrated white): warm, no hiss, for surf and breeze. Its drift is taken out so it loops without a
// click at the seam.
export const brownNoiseBuffer = (ctx: BaseAudioContext, seconds: number) =>
  buffer(ctx, 'brown', seconds, 1, (d) => {
    for (let i = 0, v = 0; i < d.length; i++) d[i] = (v = (v + 0.02 * (Math.random() * 2 - 1)) / 1.02) * 3.5;
    const drift = (d[d.length - 1]! - d[0]!) / (d.length - 1);
    for (let i = 0; i < d.length; i++) d[i] = d[i]! - drift * i;
  });

// A dark stereo reverb tail for a ConvolverNode: decaying noise, low-passed as it fades (air soaks up the highs first).
export const darkReverbBuffer = (ctx: BaseAudioContext, seconds: number) =>
  buffer(ctx, 'reverb', seconds, 2, (d) => {
    const onset = ctx.sampleRate * 0.012;
    for (let k = 0, lp = 0; k < d.length; k++) {
      const u = k / d.length,
        damp = 0.5 - 0.42 * u; // the one-pole's coefficient: brighter early, darker late
      lp += damp * (Math.random() * 2 - 1 - lp);
      d[k] = lp * (1 - u) ** 2.2 * (k < onset ? k / onset : 1);
    }
  });
