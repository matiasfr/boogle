// What the town reads of the shared railway, from rows and queries through the adapter's read facade
// (docs/plans/ecs-migration-railway.md, M10 f). The facts are the thresholds src/sim/town-facts.ts names; the rest is
// what the town view draws: the score the shop's prices climb with, the Works' breaker, line one's phase and which
// stretches are laid. Pure over a world and a tick. The look is worked out once per (world, tick): `railCounts` and
// `railPhase` walk the rows, and the town asks every frame.
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { jobs, qjobs, works, type ReadWorld } from '../../sim/railway-rows.ts';
import { railPhase } from '../../sim/railway-queries-line1.ts';
import { railCounts } from '../../sim/railway-queries-line2.ts';
import { townRead, type TownRead } from '../../sim/town-facts.ts';

type Facade = RailwayAdapter['read'];

export type TownLook = {
  facts: TownRead;
  /** `railCounts(w, tick).score`: the shop's prices climb with it. */
  score: number;
  /** The Works' breaker row. */
  breaker: number;
  /** `railPhase` at the tick. */
  phase: ReturnType<typeof railPhase>;
  /** Each line-one job's completion. */
  line1: readonly number[];
  /** Each line-two job's completion. */
  line2: readonly number[];
};

const timed = (w: ReadWorld, tick: number) => ({
  score: railCounts(w, tick).score,
  phase: railPhase(w, tick, tick),
});
export const townLookOf = (w: ReadWorld, tick: number, held = timed(w, tick)): TownLook => ({
  facts: townRead(w),
  ...held,
  breaker: works(w).breaker,
  line1: jobs(w).map((j) => j.completion),
  line2: qjobs(w).map((j) => j.completion),
});

/** The town's look at the railway, or null before it is mounted. The rows are read on each ask; the score and the
 * phase (`railCounts` and `railPhase` walk the rows) once per frame's tick and world: a press makes a new predicted
 * world, a packet a new tick. */
export function createTownReader(facade: () => Facade | null) {
  let held: { w: ReadWorld; tick: number; timed: ReturnType<typeof timed> } | null = null;
  const stats = { builds: 0 };
  return {
    stats,
    look(): TownLook | null {
      const f = facade();
      if (!f) return null;
      const tick = f.tick(),
        w = f.world();
      if (!held || held.w !== w || held.tick !== tick) {
        stats.builds++;
        held = { w, tick, timed: timed(w, tick) };
      }
      return townLookOf(w, tick, held.timed);
    },
  };
}
