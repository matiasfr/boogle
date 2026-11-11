// Seed and test driver over an E world; never imported by the game, rules or adapters (docs/plans/playtest-jump-in.md).
// Only the rule tests not yet converted use it (test/railway-live.ts re-exports this); the seeds and converted tests
// drive a World through ./railway-drive.ts (docs/plans/ecs-migration-railway.md, M3c), and M12b deletes this file.
// Test support for the railway on E (docs/plans/ecs-e.md, step 3): the rule tests written before the move read the
// state as a `Railway` and drive the rules by name. Here a state is an E world (audited: a write that skips mut()
// throws) behind a read-only live view: every read sees the world as it is now (the read model is rebuilt after each
// rule), and a write to the view throws, so setup goes through `edit` (the world) and play through the systems.
import type { World } from '../ecs/index.ts';
import * as sys from './railway-systems.ts';
import * as sysCore from './railway-sys-core.ts';
import * as sysAway from './railway-sys-away.ts';
import * as sysLine1 from './railway-sys-line1.ts';
import * as sysWorks from './railway-sys-works.ts';
import { createRailwayWorld } from './railway-components.ts';
import { AUDIT } from './railway-drive.ts';
import { railwayCheck, railwayInvariant } from './railway-check.ts';
import { railwayView } from './railway-read-model.ts';
import type { RailAction, Railway } from './railway.ts';
import type { LineTiming } from './railway-line-schedule.ts';
import type { SupplyIntervals, SupplyPulse } from './railway-supply.ts';

/** A seed or test step that must hold: throws, so a broken build never reaches a save. */
export function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const WORLD = Symbol('world');
export type Live = Railway & { readonly [WORLD]: World };
type Root = { w: World | (() => World); view: Railway | null; cache: boolean };
const worldIn = (root: Root) => (typeof root.w === 'function' ? root.w() : root.w);
const roots = new WeakMap<object, Root>();

function at(root: Root, path: PropertyKey[]): unknown {
  let v: unknown = root.cache ? (root.view ??= railwayView(worldIn(root))) : railwayView(worldIn(root));
  for (const k of path) v = (v as Record<PropertyKey, unknown> | undefined)?.[k];
  return v;
}
function proxy(root: Root, path: PropertyKey[]): object {
  const now = () => at(root, path) as object;
  const p = new Proxy(Array.isArray(now()) ? [] : {}, {
    get(_t, k) {
      if (k === WORLD) return worldIn(root);
      const v = (now() as Record<PropertyKey, unknown>)[k];
      // Methods run on the live proxy, so what they return (a found pile, a job) stays live too.
      if (typeof v === 'function') return v;
      return v && typeof v === 'object' ? proxy(root, [...path, k]) : v;
    },
    set() {
      throw new Error('the railway read model is read-only: set state up with edit(), play through the systems');
    },
    deleteProperty() {
      throw new Error('the railway read model is read-only');
    },
    has: (_t, k) => k in now(),
    ownKeys: () => Reflect.ownKeys(now()),
    getOwnPropertyDescriptor(_t, k) {
      const d = Reflect.getOwnPropertyDescriptor(now(), k);
      if (d && 'value' in d && d.value && typeof d.value === 'object') d.value = proxy(root, [...path, k]);
      return d;
    },
  });
  roots.set(p, root);
  return p;
}
/** A live view of a world; of one found anew on every read (a host's, which a load replaces), rebuilt every read,
 * when it changes outside these helpers. */
export const live = (w: World | (() => World), opts: { cache?: boolean } = {}): Live =>
  proxy({ w, view: null, cache: opts.cache ?? typeof w !== 'function' }, []) as Live;
/** The live view of a seed's world (./railway-drive.ts), for a test not yet converted (M3c; M12b deletes this file). */
export const liveOf = (w: World): Live => live(w);
export const worldOf = (s: Railway): World => (s as Live)[WORLD];
const changed = (s: Railway) => void (roots.get(s)!.view = null);
/** Set state up directly on the world (marked, so it replicates and the view rebuilds). */
export function edit(s: Railway, fn: (w: World) => void) {
  fn(worldOf(s));
  changed(s);
}

export const createRailway = (): Live => live(createRailwayWorld({ audit: AUDIT }));
function rule<A extends unknown[], R>(fn: (w: World, ...a: A) => R) {
  return (s: Railway, ...a: A): R => {
    const r = fn(worldOf(s), ...a);
    changed(s);
    return r;
  };
}
/** An action as the server applies it: the rule, then the job clocks it settles. */
export const railApply = rule((w, pid: string, e: RailAction, tick: number, timing?: LineTiming) => {
  const r = sys.railApply(w, pid, e, tick, timing);
  sysCore.railSettle(w);
  return r;
});
export const railTick = rule(sys.railTick);
export const railResume = rule(sysAway.railResume);
export const railSession = rule(sysCore.railSession);
export const railOutcome = rule(sys.railOutcome);
export const railBeamRelease = rule(sysLine1.railBeamRelease);
export const railBeamStood = rule(sysLine1.railBeamStood);
export const railBeamPutDown = rule(sysLine1.railBeamPutDown);
export const railFootRelease = rule(sysWorks.railFootRelease);
export const railSupplyPulse = rule((w, e: SupplyPulse, intervals?: SupplyIntervals) =>
  sysAway.railSupplyPulse(w, e, intervals),
);

/** The world's invariant: its own load check, on a snapshot round-trip. */
export function invariant(s: Railway): string | null {
  const v = railwayInvariant(railwayView(worldOf(s)));
  if (v) return v;
  try {
    createRailwayWorld().load(JSON.parse(JSON.stringify(worldOf(s).snapshot())), railwayCheck);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'railway: invalid';
  }
}
/** A save and a restart: the snapshot through JSON into a fresh world, the same hash. */
export function restore(s: Railway): Live {
  const w = createRailwayWorld({ audit: AUDIT });
  w.load(JSON.parse(JSON.stringify(worldOf(s).snapshot())), railwayCheck);
  need(w.hash() === worldOf(s).hash(), 'restore: hash');
  return live(w);
}
export const hash = (s: Railway) => worldOf(s).hash();
