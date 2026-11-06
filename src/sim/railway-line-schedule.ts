// Accepted schedule primitives for slice 3. Callers pin room tunables when funding a station.
// These are not installed in live T1: no partial T2 receiver or changed legacy replay semantics.
import { linePanels, type LineStation } from './railway-line-layout.ts';

export type LineTiming = {
  depositMs: number;
  feedIntervalMs: number;
  logFlightMs: number;
  stoneFlightMs: number;
  beamFlightMs: number;
  cruiseCmPerTick: number;
  departureTicks: number;
};
export type LineFeed = { kind: 'log' | 'stone' | 'beam'; slot: number; launchMs: number; landMs: number };
/** Beam first, stone next, logs last. A flight is display of an accepted transfer, never a debit callback. */
export function lineFeed(station: LineStation, timing: LineTiming): LineFeed[] {
  const feed: LineFeed[] = [];
  const add = (kind: LineFeed['kind'], count: number, flight: number) => {
    for (let slot = count - 1; slot >= 0; slot--) {
      const launchMs = feed.length * timing.feedIntervalMs;
      feed.push({ kind, slot, launchMs, landMs: launchMs + flight });
    }
  };
  add('beam', station.beam, timing.beamFlightMs);
  add('stone', station.bill[1], timing.stoneFlightMs);
  add('log', station.bill[0], timing.logFlightMs);
  return feed;
}
/** Integral of the accepted quadratic ease-out speed. Arithmetic only; independent of render cadence. */
export function lineLayDistance(ticks: number, timing: LineTiming): number {
  const t = Math.max(0, ticks);
  const a = timing.departureTicks;
  return timing.cruiseCmPerTick * (a === 0 || t >= a ? t - a / 3 : (t * t) / a - (t * t * t) / (3 * a * a));
}
function timingValid(t: LineTiming): boolean {
  return (
    [t.depositMs, t.feedIntervalMs, t.logFlightMs, t.stoneFlightMs, t.beamFlightMs, t.departureTicks].every(
      (n) => Number.isSafeInteger(n) && n >= 0 && n <= 60000 && !Object.is(n, -0),
    ) &&
    Number.isSafeInteger(t.cruiseCmPerTick) &&
    t.cruiseCmPerTick > 0 &&
    t.cruiseCmPerTick <= 10000
  );
}
export function lineSchedule(station: LineStation, timing: LineTiming) {
  if (!timingValid(timing)) throw new Error('railway: line timing');
  const feed = lineFeed(station, timing);
  const feedMs = feed.reduce((last, flight) => Math.max(last, flight.landMs), 0);
  const depositTicks = Math.ceil(timing.depositMs / 100);
  const feedTicks = Math.ceil(feedMs / 100);
  const contactTick = (distance: number) => {
    // Bounded integer binary search: first authoritative tick at/after physical contact.
    let lo = 0;
    let hi = Math.ceil(distance / timing.cruiseCmPerTick) + timing.departureTicks;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (lineLayDistance(mid, timing) >= distance) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };
  const panels = linePanels()
    .filter((panel) => panel.station === station.id)
    .map((panel) => ({ ...panel, tick: contactTick(station.fromCm - panel.toCm) }));
  const layTicks = contactTick(station.fromCm - station.toCm);
  return {
    depositTicks,
    feedTicks,
    layTicks,
    totalTicks: depositTicks + feedTicks + layTicks,
    depositRoundingMs: depositTicks * 100 - timing.depositMs,
    feedRoundingMs: feedTicks * 100 - feedMs,
    panels,
  };
}
