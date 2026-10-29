// Backing track for `npm run reel` (dev/video/reel.mjs): a synthesized loop, no samples or dependencies.
// A sunny little loop: C G Am F, pad + pluck arpeggio (with a soft echo) + bass + drums, as 16-bit stereo WAV. Drums
// drop out for the first two bars, the last bar and the `quiet` [from, to] stretches (snapped to bars); the ending fades.
export function music(seconds, bpm, quiet = []) {
  const SR = 44100,
    n = Math.ceil(seconds * SR),
    beat = 60 / bpm,
    bar = beat * 4,
    snap = (x) => Math.round(x / bar) * bar,
    rests = quiet.map(([a, b]) => [snap(a), snap(b)]),
    echo = Math.round(beat * 0.75 * SR),
    arps = new Float32Array(n);
  const hz = (m) => 440 * 2 ** ((m - 69) / 12);
  const chords = [
    [60, 64, 67],
    [55, 59, 62],
    [57, 60, 64],
    [53, 57, 60],
  ];
  let seed = 7;
  const noise = () => (seed = (seed * 16807) % 2147483647) / 1073741823.5 - 1;
  const buf = Buffer.alloc(44 + n * 4);
  let lp = 0,
    hp = 0,
    prevN = 0;
  for (let s = 0; s < n; s++) {
    const t = s / SR,
      b = Math.floor(t / bar),
      ch = chords[b % 4],
      inBar = t - b * bar,
      inBeat = t % beat,
      eighth = Math.floor(t / (beat / 2)),
      inEighth = t % (beat / 2),
      drums = t >= bar * 2 && t < seconds - bar && !rests.some(([a, b]) => t >= a && t < b);
    let pad = 0;
    for (const m of ch) pad += Math.sin(2 * Math.PI * hz(m) * t) + 0.4 * Math.sin(2 * Math.PI * hz(m) * 1.003 * t);
    lp += 0.08 * (pad - lp);
    const padV = lp * 0.045 * Math.min(1, inBar / 0.25);
    const arpM = ch[[0, 1, 2, 1, 2, 0, 1, 2][eighth % 8]] + 12;
    const ph = (hz(arpM) * t) % 1;
    arps[s] = (4 * Math.abs(ph - 0.5) - 1) * Math.exp(-9 * inEighth) * 0.07;
    const arp = arps[s] + (s >= echo ? arps[s - echo] * 0.3 : 0);
    const bassOn = inBeat < beat * 0.9 && Math.floor(inBar / beat) % 2 === 0;
    const bass = bassOn
      ? Math.tanh(1.6 * Math.sin(2 * Math.PI * hz(ch[0] - 24) * t)) * Math.exp(-2 * inBeat) * 0.16
      : 0;
    let dr = 0;
    if (drums) {
      dr += Math.sin(2 * Math.PI * (48 + 110 * Math.exp(-28 * inBeat)) * inBeat) * Math.exp(-9 * inBeat) * 0.3;
      const w = noise();
      hp = 0.6 * (hp + w - prevN);
      prevN = w;
      const beatNo = Math.floor(t / beat) % 4;
      if (beatNo === 1 || beatNo === 3) dr += w * Math.exp(-22 * inBeat) * 0.12;
      if (inEighth < 0.05 && eighth % 2 === 1) dr += hp * Math.exp(-60 * inEighth) * 0.07;
    }
    const env = Math.min(1, t / 1.2) * Math.min(1, (seconds - t) / 2);
    const v = Math.max(-1, Math.min(1, (padV + arp + bass + dr) * env));
    buf.writeInt16LE(Math.round(v * 30000), 44 + s * 4);
    buf.writeInt16LE(Math.round(v * 30000), 46 + s * 4);
  }
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  return buf;
}
