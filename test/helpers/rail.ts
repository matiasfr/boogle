// One door for the railway tests written on the world (docs/plans/ecs-migration-railway.md, section 2, "What the tests
// are rewritten against", and M3c): the driver (src/sim/railway-drive.ts), the world seeds, the row readers, the queries
// and the rules' entry points by name. A converted test reads rows and queries off a World and names no `Railway`,
// `live` or `validateRail…`. Rows are replaced when a rule writes: read again after every apply and tick.
//
// The row readers' `job` and `qjob` (rows) win over the queries' id getters of the same name; take those from
// src/sim/railway-queries.ts directly.
import type { World } from '../../src/ecs/index.ts';
import { Pile } from '../../src/sim/railway-components.ts';
import type { Read, ReadWorld } from '../../src/sim/railway-rows.ts';
export * from '../../src/sim/railway-drive.ts';
export * from '../../src/sim/railway-seeds.ts';
export * from '../../src/sim/railway-seed-works.ts';
export * from '../../src/sim/railway-rows.ts';
export * from '../../src/sim/railway-queries.ts';
export { job, qjob } from '../../src/sim/railway-rows.ts';
/** The piles with their entity ids, in id order: `piles(w)` lists the rows without them (a client's drop is a negative
 * temporary id until the server names it). */
export function pilesWithIds(w: World | ReadWorld) {
  const out: ({ id: number } & Read<typeof Pile>)[] = [];
  w.each([Pile], (id, p) => out.push({ id, ...p }));
  return out;
}
export { railTick, railOutcome } from '../../src/sim/railway-systems.ts';
export { railSession, railSettle } from '../../src/sim/railway-sys-core.ts';
export { railResume, railSupplyPulse } from '../../src/sim/railway-sys-away.ts';
export { railBeamPutDown, railBeamRelease, railBeamStood } from '../../src/sim/railway-sys-line1.ts';
export { railBoilerPutDown, railBoilerStood } from '../../src/sim/railway-sys-line2.ts';
export { railFootRelease } from '../../src/sim/railway-sys-works.ts';
