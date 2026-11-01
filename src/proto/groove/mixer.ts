// A small mixer (research rec 9): four buses with gains in dB into the master compressor, and the music ducked under
// big sound effects like a sidechain: the sfx bus is metered, and while it peaks over a threshold the music dips, then
// eases back. Installed through installMixer (src/render/audio.ts), so every existing sound lands on the sfx bus.
import type { Bus } from '../../render/audio.ts';

export const MIX = {
  db: { music: -13, sfx: 0, ui: -6, voice: -3 } as Record<Bus, number>,
  duckThresholdDb: -24, // sfx peak (dBFS) that counts as a big sound
  duckDb: -9, // how far the music dips
  attackS: 0.01,
  releaseS: 0.14, // time constant: back up in about half a second
  musicMuted: false,
};

export const dbToGain = (db: number) => Math.pow(10, db / 20);

export type Mixer = {
  bus: (b: Bus) => AudioNode;
  setDb: (b: Bus, db: number) => void;
  update: () => void; // meter the sfx bus and move the duck; call every scheduler pass
  ducked: () => number; // the duck's current gain in dB, for the readout
};

export function createMixer(ctx: AudioContext, master: AudioNode): Mixer {
  const gains = {} as Record<Bus, GainNode>;
  for (const b of ['music', 'sfx', 'ui', 'voice'] as Bus[]) {
    gains[b] = ctx.createGain();
    gains[b].gain.value = b === 'music' && MIX.musicMuted ? 0 : dbToGain(MIX.db[b]);
  }
  const duck = ctx.createGain();
  gains.music.connect(duck).connect(master);
  gains.ui.connect(master);
  gains.voice.connect(master);
  gains.sfx.connect(master);
  const meter = ctx.createAnalyser();
  meter.fftSize = 512;
  gains.sfx.connect(meter);
  const buf = new Float32Array(meter.fftSize);
  const threshold = dbToGain(MIX.duckThresholdDb);
  let down = false;

  return {
    bus: (b) => gains[b],
    setDb(b, db) {
      MIX.db[b] = db;
      gains[b].gain.setTargetAtTime(b === 'music' && MIX.musicMuted ? 0 : dbToGain(db), ctx.currentTime, 0.05);
    },
    update() {
      meter.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let k = 0; k < buf.length; k++) peak = Math.max(peak, Math.abs(buf[k]));
      const hot = peak > threshold;
      if (hot === down) return;
      down = hot;
      duck.gain.cancelScheduledValues(ctx.currentTime);
      duck.gain.setTargetAtTime(hot ? dbToGain(MIX.duckDb) : 1, ctx.currentTime, hot ? MIX.attackS : MIX.releaseS);
    },
    ducked: () => 20 * Math.log10(Math.max(1e-4, duck.gain.value)),
  };
}
