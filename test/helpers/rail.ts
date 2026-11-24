// One door for the railway tests written on the world (docs/plans/ecs-migration-railway.md, section 2, "What the tests
// are rewritten against", and M3c): the driver (src/sim/railway-drive.ts), the world seeds, the row readers, the queries
// and the rules' entry points by name. A converted test reads rows and queries off a World and names no `Railway`,
// `live` or `validateRail…`. Rows are replaced when a rule writes: read again after every apply and tick.
//
// The row readers' `job` and `qjob` (rows) win over the queries' id getters of the same name; take those from
// src/sim/railway-queries.ts directly.
import type { World } from '../../src/ecs/index.ts';
import type { Seed } from '../../src/sim/railway-seed-route.ts';
import { createRailwayWorld, Pile } from '../../src/sim/railway-components.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import type { Read, ReadWorld } from '../../src/sim/railway-rows.ts';
import { invariant, restore } from '../../src/sim/railway-drive.ts';
import { act, advance } from '../../src/sim/railway-seed-route.ts';
import { shed as shedRow, steel as steelRow } from '../../src/sim/railway-rows.ts';
import { STEEL } from '../../src/sim/railway-ring-layout.ts';
import assert from 'node:assert/strict';
import * as seeds from '../../src/sim/railway-seeds.ts';
import * as works from '../../src/sim/railway-seed-works.ts';
import * as ring from '../../src/sim/railway-seed-ring.ts';

export * from '../../src/sim/railway-drive.ts';
export * from '../../src/sim/railway-seeds.ts';
export * from '../../src/sim/railway-seed-works.ts';

// Each seed stage is replayed once per test file (one process) and kept; every caller, the first included, gets its
// own copy through a save (restore: a fresh world as the driver makes it, audit and all, checked to the same hash). The
// replay stays proven by that first build and by the goldens (test/helpers/railway-golden.ts replays on its own).
const built = new Map<string, Seed>();
function shared<A extends string[]>(name: string, build: (...args: A) => Seed): (...args: A) => Seed {
  return (...args) => {
    const key = `${name}(${args.join(',')})`;
    let seed = built.get(key);
    if (!seed) built.set(key, (seed = build(...args)));
    return { w: restore(seed.w), t: seed.t };
  };
}
export const railwayAtQ2 = shared('railwayAtQ2', seeds.railwayAtQ2);
export const railwayAtHook = shared('railwayAtHook', seeds.railwayAtHook);
export const railwayAtQ4 = shared('railwayAtQ4', seeds.railwayAtQ4);
export const railwayAtQ5 = shared('railwayAtQ5', seeds.railwayAtQ5);
export const railwayAtTrains = shared('railwayAtTrains', seeds.railwayAtTrains);
export const buildSeedWorld = shared('buildSeedWorld', seeds.buildSeedWorld);
export const railwayAtWorks = shared('railwayAtWorks', (stage: works.WorksStage) => works.railwayAtWorks(stage));
export const railwayAtRing = shared('railwayAtRing', (stage: ring.RingStage) => ring.railwayAtRing(stage));
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
/** A seed's world copied into a plain (unaudited) world through a save, for a long run: the same rules and hash; the
 * audit (which re-serializes every row around each system run) is left to the shorter tests. */
export function unaudited(s: Seed): Seed {
  const raw = createRailwayWorld();
  raw.load(JSON.parse(JSON.stringify(s.w.snapshot())), railwayCheck);
  return { w: raw, t: s.t };
}
/** `source` (unaudited) played on until the first steel is in Home's bay, from accepted ops and ticks only: the kit
 * into the island yard, the bill fed by one player, the casts and the ride home. Ring-joined or any later seed whose
 * works is cold (a leg seed's kit already lies in the yard). */
export function steelHome(source: Seed): Seed {
  const s = unaudited({ w: restore(source.w), t: source.t });
  const run = (ok: () => boolean, max: number, what: string) => {
    for (let t = 0; !ok(); t++) {
      assert.ok(t < max, `${what} in time (tick ${s.t})`);
      advance(s, 1);
    }
  };
  run(() => steelRow(s.w).yardLogs + steelRow(s.w).yardRails === STEEL.logs + STEEL.rails, 4000, 'the kit in the yard');
  for (const kind of [0, 1])
    for (let k = 0; k < 8; k++) {
      act(s, 'a', 'rail.steelTake', { kind });
      if (!act(s, 'a', 'rail.steel')) break;
    }
  assert.ok(steelRow(s.w).lit >= 0, 'the works lit');
  run(() => shedRow(s.w).steel >= 1, 6000, 'the first steel in the bay');
  assert.equal(invariant(s.w), null);
  return s;
}
