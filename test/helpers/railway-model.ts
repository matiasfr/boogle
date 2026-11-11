// The `Railway` read model of a world, for the differential tests' old side alone (M8's queries, M8b's check corpus,
// M10's and M11's proofs): src/world/railway-predict.ts's `railwayOf` until M12 moved the client onto worlds. It links
// nothing to anything. M12b deletes it with the read model and those tests.
import type { World } from '../../src/ecs/index.ts';
import { railJobs, type Railway } from '../../src/sim/railway.ts';
import { railwayView } from '../../src/sim/railway-read-model.ts';
import { LINE1_STATIONS } from '../../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../../src/sim/railway-line2-layout.ts';
import { Job, QJob } from '../../src/sim/railway-components.ts';
import { jobProgress } from '../../src/sim/railway-queries.ts';

export const railwayOf = (w: World): Railway => railwayView(w);

/** The read model of `w` with every job's timed fields at `tick`, as the mirror's job clocks left them before M12 (line
 * one's first job has no second material). Moved here from
 * src/world/railway-replicate.ts with inspect() (M12e), for the differential tests' old side. */
export function railwayModelAt(w: World, tick: number): Railway {
  const s = railwayView(w);
  const jobs = railJobs(s);
  for (let k = 0; k < LINE1_STATIONS.length; k++) {
    const p = jobProgress(w, Job, w.lookup(Job, k)!, tick);
    Object.assign(
      jobs[k]!,
      k > 0 ? p : { elapsed: p.elapsed, lastTick: p.lastTick, used: p.used, allocation: p.allocation },
    );
  }
  for (let k = 0; k < LINE2_STATIONS.length; k++)
    Object.assign(s.line2!.jobs[k]!, jobProgress(w, QJob, w.lookup(QJob, k)!, tick));
  return s;
}
