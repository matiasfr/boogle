// Line one's default timing; its rules are systems in ./railway-sys-line1.ts and its facts queries in
// ./railway-queries-line1.ts.
import type { LineTiming } from './railway-line-schedule.ts';

export const LINE_TIMING: Readonly<LineTiming> = {
  depositMs: 320,
  feedIntervalMs: 70,
  logFlightMs: 550,
  stoneFlightMs: 450,
  beamFlightMs: 900,
  cruiseCmPerTick: 50,
  departureTicks: 20,
};
