// A shared white-noise buffer for sound effects: one per context and length, made on first use. Sources only read it, so
// everyone can play the same one. Takes any context, so offline renders (dev/audio/) work too. Local and cosmetic.
const made = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();

export function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  let byLength = made.get(ctx);
  if (!byLength) made.set(ctx, (byLength = new Map()));
  let b = byLength.get(seconds);
  if (!b) {
    b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    byLength.set(seconds, b);
  }
  return b;
}
