// Browser-side raw evidence transport shared by the locomotion listening fixtures.
export function emitOfflineWav(buffer: AudioBuffer, metadata: Record<string, unknown>) {
  const frames = buffer.length,
    channels = buffer.numberOfChannels,
    sr = buffer.sampleRate;
  const bytes = new Uint8Array(44 + frames * channels * 4),
    v = new DataView(bytes.buffer);
  const word = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i);
  };
  word(0, 'RIFF');
  v.setUint32(4, bytes.length - 8, true);
  word(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 3, true);
  v.setUint16(22, channels, true);
  v.setUint32(24, sr, true);
  v.setUint32(28, sr * channels * 4, true);
  v.setUint16(32, channels * 4, true);
  v.setUint16(34, 32, true);
  word(36, 'data');
  v.setUint32(40, frames * channels * 4, true);
  let peak = 0,
    sum = 0,
    clipped = 0,
    nonfinite = 0,
    first = frames,
    last = -1;
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let f = 0; f < frames; f++) {
      const x = data[f]!;
      v.setFloat32(44 + (f * channels + c) * 4, x, true);
      if (!Number.isFinite(x)) {
        nonfinite++;
        continue;
      }
      peak = Math.max(peak, Math.abs(x));
      sum += x * x;
      if (Math.abs(x) > 1) clipped++;
      if (Math.abs(x) > 1e-5) {
        first = Math.min(first, f);
        last = Math.max(last, f);
      }
    }
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -200);
  console.log(
    'AUDIO ' +
      JSON.stringify({
        ...metadata,
        sampleRate: sr,
        seconds: frames / sr,
        activeSeconds: Math.max(0, last - first + 1) / sr,
        peakDb: db(peak),
        rmsDb: db(Math.sqrt(sum / (frames * channels))),
        clipped,
        nonfinite,
        gainDb: 0,
        b64: btoa(binary),
      }),
  );
}
