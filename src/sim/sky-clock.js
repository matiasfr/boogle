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

const wrap = (x) => x - Math.floor(x);

// Position along the daily arc: 0 = rising in the east, PI/2 = highest, PI = setting, 3PI/2 = lowest (under the island).
export function arcAngle(frac) {
  const f = wrap(frac);
  return f < DAYLIGHT ? (Math.PI * f) / DAYLIGHT : Math.PI + (Math.PI * (f - DAYLIGHT)) / (1 - DAYLIGHT);
}

// Lit fraction of the moon's face: 0 at new, 1 at full. A smoothstep in the distance from full stands in for
// (1 - cos(2 PI phase)) / 2 (off by about 0.01 at most) using only + - * /, so this module stays lockstep-safe.
function litFraction(phase) {
  const d = Math.abs(2 * phase - 1);
  return 1 - d * d * (3 - 2 * d);
}

// frac: time of day in [0, 1) (0 = sunrise). phase: moon phase in [0, 1) (0 = new, 0.5 = full).
export function skyState(frac, phase) {
  frac = wrap(frac);
  phase = wrap(phase);
  return {
    frac,
    phase,
    sunAngle: arcAngle(frac),
    moonAngle: arcAngle(frac - phase),
    illum: litFraction(phase),
  };
}

export function skyAt(ms) {
  const days = ms / DAY_MS + START_FRAC;
  return skyState(days, days / LUNAR_DAYS + START_PHASE);
}
