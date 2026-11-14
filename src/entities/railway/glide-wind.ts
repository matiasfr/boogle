// The air going past while you glide: a low band of noise that follows your speed, so a glide isn't silent. Place's
// moves-view.ts had it (windAt); the port to the railway left it behind with the wingtip wisps. The numbers live here,
// plain, so a unit test can hold them (test/railway-glide-wind.test.ts); glide-view.ts owns the nodes. Local only.

/**
 * Place's numbers: a looping 2 s white noise through a band-pass (Q 0.7) at 300 Hz + 45 Hz per m/s, at a linear gain of
 * 0.12 (about -18.4 dB) times the level, on the ambience bus; the gain eases over 0.12 s and the band over 0.2 s.
 */
export const WIND = {
  seconds: 2,
  q: 0.7,
  gain: 0.12,
  hz: 300,
  hzPerSpeed: 45,
  gainTau: 0.12,
  hzTau: 0.2,
  audible: 0.01,
};

/** 0 unless the canopy has the body; then a quarter at rest, rising to full at 10 m/s. `speed`: horizontal m/s. */
export const windLevel = (holding: boolean, speed: number) => (holding ? 0.25 + 0.75 * Math.min(1, speed / 10) : 0);
/** The gain node's target for a level. */
export const windGain = (level: number) => level * WIND.gain;
/** The band-pass centre for a speed. */
export const windHz = (speed: number) => WIND.hz + speed * WIND.hzPerSpeed;
