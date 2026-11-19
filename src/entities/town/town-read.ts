// What the town reads of the shared railway, from rows and queries through the adapter's read facade
// (docs/plans/ecs-migration-railway.md, M10 f). The facts are the thresholds src/sim/town-facts.ts names; the rest is
// what the town view draws: the score the shop's prices climb with, the Works' breaker, line one's phase and which
// stretches are laid and when (`laidStretches`, the one reader both model tables draw). Pure over a world and a tick. The look is worked out once per (world, tick): `railCounts` and
// `railPhase` walk the rows, and the town asks every frame.
import { Plot, Town } from '../../sim/railway-components.ts';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { jobs, qjobs, works, town, plot, type ReadWorld } from '../../sim/railway-rows.ts';
import { plotsStaked, plotSlot } from '../../sim/railway-queries-trade.ts';
import { TRADE } from '../../sim/railway-trade-layout.ts';
import { railPhase } from '../../sim/railway-queries-line1.ts';
import { railCounts } from '../../sim/railway-queries-line2.ts';
import { townRead, type TownRead } from '../../sim/town-facts.ts';
import { LINE1_STATIONS } from '../../sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../../sim/railway-line2-layout.ts';
import { LINKS, STUB } from '../../place/layout.ts';

type Facade = RailwayAdapter['read'];

export type TownLook = {
  /** Home's delivered freight and numeric staking slots: cosmetic reads only. */
  plots: { wood: number; stone: number; staked: readonly number[] };
  facts: TownRead;
  /** `railCounts(w, tick).score`: the shop's prices climb with it. */
  score: number;
  /** The Works' breaker row. */
  breaker: number;
  /** `railPhase` at the tick. */
  phase: ReturnType<typeof railPhase>;
  /** Each line-one job's end tick once it is complete (its stretch is laid), else -1. */
  line1: readonly number[];
  /** Each line-two job's end tick once it is complete, else -1. */
  line2: readonly number[];
  /** The shared tick this look was read at. */
  tick: number;
};
/** Track that's down on a line (`LINKS` index): metres along it, `lo` < `hi`, and the tick it was finished on (-1 for
 * the stubs that are down from the start). */
export type LaidStretch = { line: 0 | 1; lo: number; hi: number; end: number };
/** The laid stretches, in a fixed order: the museum's table and the driver's train set both draw these
 * (docs/brainstorms/first-house-resident.md, suggestion 4), so the two can never disagree. Line 1 lays from the camp
 * to the village: each station's stretch runs from its toCm back to its fromCm, and both ends' stubs are down from the
 * start. Line 2 lays out from the turntable. */
export function* laidStretches(look: TownLook | null): Generator<LaidStretch> {
  yield { line: 0, lo: 0, hi: STUB.village, end: -1 };
  yield { line: 0, lo: LINE1_STATIONS[0]!.fromCm / 100, hi: LINKS[0]!.line.len, end: -1 };
  for (const [i, end] of (look?.line1 ?? []).entries()) {
    const q = LINE1_STATIONS[i];
    if (q && end >= 0) yield { line: 0, lo: q.toCm / 100, hi: q.fromCm / 100, end };
  }
  yield { line: 1, lo: 0, hi: LINE2_STATIONS[0]!.fromCm / 100, end: -1 };
  for (const [i, end] of (look?.line2 ?? []).entries()) {
    const q = LINE2_STATIONS[i];
    if (q && end >= 0) yield { line: 1, lo: q.fromCm / 100, hi: q.toCm / 100, end };
  }
}
/** A complete job's end tick (the wire carries it once complete: railway-sys-core.ts `jobClock`), else -1. */
const laidAt = (j: { completion: number; end: number }) => (j.completion ? Math.max(0, j.end) : -1);

const timed = (w: ReadWorld, tick: number) => ({
  score: railCounts(w, tick).score,
  phase: railPhase(w, tick, tick),
});
// Private numeric snapshots keep the public projection unchanged and never retain mutable Plot rows.
const purchaseTicks = new WeakMap<TownLook['plots'], readonly number[]>();
export const townLookOf = (
  w: ReadWorld,
  tick: number,
  held = timed(w, tick),
  previousPlots?: TownLook['plots'],
): TownLook => {
  const { wood, stone } = town(w, 0);
  // Staking depends on deliveries and purchases. Compare numbers without allocating on unchanged frame reads:
  // rows can change in place, and a new mirror world need not change either input. Preserve older projections.
  const previousTicks = previousPlots && purchaseTicks.get(previousPlots);
  let reuse = previousPlots?.wood === wood && previousPlots.stone === stone && previousTicks !== undefined;
  for (let k = 0; reuse && k < TRADE.plots[0].length; k++) reuse = previousTicks![k] === plot(w, plotSlot(0, k)).at;
  const plots = reuse ? previousPlots! : { wood, stone, staked: plotsStaked(w, 0) };
  if (!reuse)
    purchaseTicks.set(
      plots,
      TRADE.plots[0].map((_p, k) => plot(w, plotSlot(0, k)).at),
    );
  return {
    plots,
    facts: townRead(w, tick),
    ...held,
    breaker: works(w).breaker,
    line1: jobs(w).map(laidAt),
    line2: qjobs(w).map(laidAt),
    tick,
  };
};

/** The town's look at the railway, or null before it is mounted. The rows are read on each ask; the score and the
 * phase (`railCounts` and `railPhase` walk the rows) once per frame's tick and world: a press makes a new predicted
 * world, a packet a new tick. */
export function createTownReader(facade: () => Facade | null) {
  let held: { w: ReadWorld; tick: number; timed: ReturnType<typeof timed> } | null = null;
  let plots: TownLook['plots'] | undefined;
  const stats = { builds: 0 };
  return {
    stats,
    look(): TownLook | null {
      const f = facade();
      if (!f) return null;
      const tick = f.tick(),
        w = f.world();
      const townId = w.lookup(Town, 0);
      if (townId === undefined || !w.get(Town, townId)) return null;
      for (let k = 0; k < TRADE.plots[0].length; k++) {
        const id = w.lookup(Plot, k);
        if (id === undefined || !w.get(Plot, id)) return null;
      }
      if (!held || held.w !== w || held.tick !== tick) {
        stats.builds++;
        held = { w, tick, timed: timed(w, tick) };
      }
      const look = townLookOf(w, tick, held.timed, plots);
      plots = look.plots;
      return look;
    },
  };
}
