// What the welcome back (src/features/welcome-back.ts) remembers of the railway and compares on return, from rows and
// queries through the adapter's read facade (docs/plans/ecs-migration-railway.md, M10). Pure over a world: the card's
// "stretches of track laid" counts the stations laid on both lines (T1 to T3, then Q1 on), each one a stretch.
import type { RailwayAdapter } from '../adapters/railway-session.ts';
import { jobs, type ReadWorld } from '../sim/railway-rows.ts';
import { line2Completed } from '../sim/railway-queries-line2.ts';

/** Stretches of track laid in `w`: line one's stations laid, and line two's. */
export const stretchesLaid = (w: ReadWorld) => jobs(w).filter((j) => j.completion).length + line2Completed(w);

/** Stretches laid since the remembered count `then` (0 for no change, a malformed memory or fewer than then). */
export const stretchesSince = (then: unknown, now: number) =>
  typeof then === 'number' && Number.isFinite(then) ? Math.max(0, now - then) : 0;

/** The railway's world once its whole state is in, or null (not mounted, connecting, or its storage failed). */
export const railwayKnown = (facade: RailwayAdapter['read'] | null): ReadWorld | null =>
  facade && facade.status() === 'ready' ? facade.world() : null;
