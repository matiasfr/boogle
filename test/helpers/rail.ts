// One door for the railway tests written on the world (docs/plans/ecs-migration-railway.md, section 2, "What the tests
// are rewritten against", and M3c): the driver (src/sim/railway-drive.ts), the world seeds, the row readers, the queries
// and the rules' entry points by name. A converted test reads rows and queries off a World and names no `Railway`,
// `live` or `validateRail…`. Rows are replaced when a rule writes: read again after every apply and tick.
//
// The row readers' `job` and `qjob` (rows) win over the queries' id getters of the same name; take those from
// src/sim/railway-queries.ts directly.
import type { Seed } from '../../src/sim/railway-seed-route.ts';
import { createRailwayWorld } from '../../src/sim/railway-components.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';

export * from '../../src/sim/railway-drive.ts';
export * from '../../src/sim/railway-seeds.ts';
export * from '../../src/sim/railway-seed-works.ts';
export * from '../../src/sim/railway-rows.ts';
export * from '../../src/sim/railway-queries.ts';
export { job, qjob } from '../../src/sim/railway-rows.ts';
export { railTick, railOutcome } from '../../src/sim/railway-systems.ts';
export { railSession, railSettle } from '../../src/sim/railway-sys-core.ts';
export { railResume, railSupplyPulse } from '../../src/sim/railway-sys-away.ts';
export { railBeamPutDown, railBeamRelease, railBeamStood } from '../../src/sim/railway-sys-line1.ts';
export { railBoilerPutDown, railBoilerStood } from '../../src/sim/railway-sys-line2.ts';
export { railFootRelease } from '../../src/sim/railway-sys-works.ts';
/** A seed's world copied into a plain (unaudited) world through a save, for a long run: the same rules and hash; the
 * audit (which re-serializes every row around each system run) is left to the shorter tests. */
export function unaudited(s: Seed): Seed {
  const raw = createRailwayWorld();
  raw.load(JSON.parse(JSON.stringify(s.w.snapshot())), railwayCheck);
  return { w: raw, t: s.t };
}
