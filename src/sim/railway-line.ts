// Line one's default timing; its rules are systems in ./railway-sys-line1.ts and its facts queries in
// ./railway-queries-line1.ts.
import type { LineTiming } from './railway-line-schedule.ts';
import { TUNABLES } from './tune.ts';

/** The departure ease is the room tune's default, its one owner: the server funds a stretch with the room's value,
 * and the seeds and a fresh world's unfunded rows carry this one. */
const DEPARTURE_TICKS = TUNABLES.find((t) => t.key === 'railDepartureTicks')!.def;

export const LINE_TIMING: Readonly<LineTiming> = {
  depositMs: 320,
  feedIntervalMs: 70,
  logFlightMs: 550,
  stoneFlightMs: 450,
  beamFlightMs: 900,
  cruiseCmPerTick: 50,
  departureTicks: DEPARTURE_TICKS,
};
