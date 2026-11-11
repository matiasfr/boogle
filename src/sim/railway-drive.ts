// The railway's seed and test driver on a World (docs/plans/ecs-migration-railway.md, M3c): the rules by name, the
// world's invariant and a save round trip, with no proxy and no read model. The seed builders (./railway-seeds.ts) and
// the converted rule tests (test/helpers/rail.ts) use it; never imported by the game, the rules or the adapters.
// ./railway-live.ts is the old driver, a `Railway` view for the tests not yet converted; M12b deletes it.
//
//   need(cond, msg)                     a seed or test step that must hold
//   createRailway()                     a fresh world, audited: a write that skips mut() or a declaration throws
//   AUDIT                               off under RAIL_AUDIT=0 (local test runs; CI and the server's seeds keep it)
//   apply(w, pid, action, tick)         an action as the server applies it: railApply, then railSettle
//   check(w)                            the load check on the world as it stands: the message, or null
//   invariant(w)                        check(w), then the same on a JSON snapshot loaded into a fresh world
//   restore(w)                          that round trip as a new audited world, its hash asserted
import type { World } from '../ecs/index.ts';
import { createRailwayWorld } from './railway-components.ts';
import { railwayCheck } from './railway-check.ts';
import { railApply } from './railway-systems.ts';
import { railSettle } from './railway-sys-core.ts';
import type { RailAction } from './railway.ts';
import type { LineTiming } from './railway-line-schedule.ts';

/** A seed or test step that must hold: throws, so a broken build never reaches a save. */
export function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
/** The audit serializes every row around every system run (about 250 times slower). `npm run test:unit` and the
 * pre-push gate turn it off with RAIL_AUDIT=0; CI's unit job and the nightly long run keep it (docs/agents/tests.md). */
export const AUDIT = typeof process === 'undefined' || process.env.RAIL_AUDIT !== '0';
export const createRailway = (): World => createRailwayWorld({ audit: AUDIT });
export function apply(w: World, pid: string, action: RailAction, tick: number, timing?: LineTiming) {
  const r = railApply(w, pid, action, tick, timing);
  railSettle(w);
  return r;
}
const saved = (w: World): unknown => JSON.parse(JSON.stringify(w.snapshot()));
const message = (e: unknown) => (e instanceof Error ? e.message : 'railway: invalid');
/** railwayCheck on the world itself: rows and queries only, no read model (M8b). */
export function check(w: World): string | null {
  try {
    railwayCheck(w);
    return null;
  } catch (e) {
    return message(e);
  }
}
/** The world's invariant: the load check on the world, then on a snapshot round trip (what a save must pass). */
export function invariant(w: World): string | null {
  const broken = check(w);
  if (broken) return broken;
  try {
    createRailwayWorld().load(saved(w), railwayCheck);
    return null;
  } catch (e) {
    return message(e);
  }
}
/** A save and a restart: the snapshot through JSON into a fresh audited world, the same hash. */
export function restore(w: World): World {
  const out = createRailway();
  out.load(saved(w), railwayCheck);
  need(out.hash() === w.hash(), 'restore: hash');
  return out;
}
export const hash = (w: World) => w.hash();
