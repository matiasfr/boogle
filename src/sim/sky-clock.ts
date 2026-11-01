// Sky clock: time of day and moon phase as a pure function of shared world time (world.tick * TICK_MS), so every player
// sees the same sky. No three.js / DOM, safe in Node tests.
//
// One day lasts DAY_MS. The sun is up for DAYLIGHT of it (a little longer than the night, so the island is mostly
// bright). The moon lags the sun by its phase: new moon rides with the sun, full moon rises as the sun sets, and the
// lag grows a little every day, so a full cycle of phases takes LUNAR_DAYS days.

export const DAY_MS = 20 * 60 * 1000;
export const LUNAR_DAYS = 8;
export const DAYLIGHT = 0.6;
const START_FRAC = 0.08; // world time 0 is early morning
const START_PHASE = 0.25; // and the first night has a half moon (waxing)

const wrap = (x: number) => x - Math.floor(x);

// Position along the daily arc: 0 = rising in the east, PI/2 = highest, PI = setting, 3PI/2 = lowest (under the island).
function arcAngle(frac: number) {
  const f = wrap(frac);
  return f < DAYLIGHT ? (Math.PI * f) / DAYLIGHT : Math.PI + (Math.PI * (f - DAYLIGHT)) / (1 - DAYLIGHT);
}

// Lit fraction of the moon's face: 0 at new, 1 at full. A smoothstep in the distance from full stands in for
// (1 - cos(2 PI phase)) / 2 (off by about 0.01 at most) using only + - * /, so this module stays lockstep-safe.
function litFraction(phase: number) {
  const d = Math.abs(2 * phase - 1);
  return 1 - d * d * (3 - 2 * d);
}

export type SkyState = { frac: number; phase: number; sunAngle: number; moonAngle: number; illum: number };
const blank = (): SkyState => ({ frac: 0, phase: 0, sunAngle: 0, moonAngle: 0, illum: 0 });

// frac: time of day in [0, 1) (0 = sunrise). phase: moon phase in [0, 1) (0 = new, 0.5 = full). Fills `out` when given
// (a caller that asks every frame reuses one), else a new object.
export function skyState(frac: number, phase: number, out: SkyState = blank()) {
  frac = wrap(frac);
  phase = wrap(phase);
  out.frac = frac;
  out.phase = phase;
  out.sunAngle = arcAngle(frac);
  out.moonAngle = arcAngle(frac - phase);
  out.illum = litFraction(phase);
  return out;
}

export function skyAt(ms: number, out?: SkyState) {
  const days = ms / DAY_MS + START_FRAC;
  return skyState(days, days / LUNAR_DAYS + START_PHASE, out);
}
