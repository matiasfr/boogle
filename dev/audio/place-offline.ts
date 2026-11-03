// Broker page eval for `node dev/audio/render.ts --offline-place`. Identical recipes, raw SFX gain, no normalization.
const { placeCues, renderPlaceSound } = (await import(
  '/src/render/place-sfx.ts' as string
)) as typeof import('../../src/render/place-sfx.ts');
type Cue = keyof typeof placeCues;
const sr = 48000;
const cases: { id: string; description: string; cues: Cue[] }[] = Object.entries(placeCues).map(
  ([id, description]) => ({
    id,
    description,
    cues: [id as Cue],
  }),
);
cases.push({
  id: 'overlap-eight',
  description: 'Eight simultaneous cues at full distance gain: raw stress mix, without the live master/compressor.',
  cues: ['rockBreak', 'treeLand', 'shoulder', 'boxWonder', 'pickupJump', 'gliderOpen', 'cartPush', 'pathOpen'],
});
for (const take of cases) {
  const ctx = new OfflineAudioContext(1, sr * 2, sr);
  let scheduled = 0,
    sources = 0;
  for (const cue of take.cues) {
    const r = renderPlaceSound(ctx, ctx.destination, cue, 0.02);
    scheduled = Math.max(scheduled, r.seconds);
    sources += r.sources;
  }
  const rendered = await ctx.startRendering();
  const samples = rendered.getChannelData(0);
  let peak = 0,
    sum = 0,
    clipped = 0,
    first = samples.length,
    last = 0;
  for (let k = 0; k < samples.length; k++) {
    const v = samples[k]!;
    peak = Math.max(peak, Math.abs(v));
    sum += v * v;
    if (Math.abs(v) >= 1) clipped++;
    if (Math.abs(v) > 0.00001) {
      first = Math.min(first, k);
      last = k;
    }
  }
  const frames = Math.max(0, last - first + 1);
  const bytes = new Uint8Array(44 + frames * 2);
  const view = new DataView(bytes.buffer);
  const word = (at: number, s: string) => {
    for (let k = 0; k < s.length; k++) bytes[at + k] = s.charCodeAt(k);
  };
  word(0, 'RIFF');
  view.setUint32(4, bytes.length - 8, true);
  word(8, 'WAVE');
  word(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  word(36, 'data');
  view.setUint32(40, frames * 2, true);
  for (let k = 0; k < frames; k++)
    view.setInt16(44 + k * 2, Math.round(Math.max(-1, Math.min(1, samples[first + k]!)) * 32767), true);
  let binary = '';
  for (let k = 0; k < bytes.length; k += 8192) binary += String.fromCharCode(...bytes.subarray(k, k + 8192));
  const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : -200);
  console.log(
    'AUDIO ' +
      JSON.stringify({
        id: take.id,
        description: take.description,
        sampleRate: sr,
        seconds: frames / sr,
        scheduled,
        sources,
        peakDb: db(peak),
        rmsDb: db(Math.sqrt(sum / samples.length)),
        clipped,
        gainDb: 0,
        b64: btoa(binary),
      }),
  );
}
export {};
