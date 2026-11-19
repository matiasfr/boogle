// Line one's default timing; its rules are systems in ./railway-sys-line1.ts and its facts queries in
// ./railway-queries-line1.ts.
import type { LineTiming } from './railway-line-schedule.ts';
import { specOf, type TuneKey } from './tune.ts';

/** A stretch's timing from a room's tune: the feed interval, cruise and departure ease are the tune's (one owner); the
 * flights and the deposit are fixed. The server funds with its room's values, and LINE_TIMING is the defaults. */
export const lineTiming = (tune: { get(key: TuneKey): number }): LineTiming => ({
  depositMs: 320,
  feedIntervalMs: tune.get('railFeedMs'),
  logFlightMs: 550,
  stoneFlightMs: 450,
  beamFlightMs: 900,
  cruiseCmPerTick: tune.get('railLaySpeed'),
  departureTicks: tune.get('railDepartureTicks'),
});

/** The untuned room's timing: what the seeds and a fresh world's job rows carry. */
export const LINE_TIMING: Readonly<LineTiming> = lineTiming({ get: (key) => specOf(key)!.def });
