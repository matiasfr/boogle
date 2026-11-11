// What anyone can see has happened to the town (docs/plans/place-retirement.md, "The town facts"), read from the shared
// railway's completions and thresholds only, never from predicted counts. Every client computes the same facts from its
// mirror; nothing here is kept, sent or saved. Pure. The town entity (src/entities/town/) and the opening village's
// population read these; the residents notice them in T2. `town` and `stone` (cargo-built rows) stay false until
// production-core slice 5 brings train cargo (design review, 9 November, finding 1).
import type { World } from '../ecs/index.ts';
import { forge, jobs, type ReadWorld } from './railway-rows.ts';
import { line2Completed, line2Trains } from './railway-queries-line2.ts';

/** Oldest first, in ../entities/town/town-lines.ts's `Fact` order. */
export const TOWN_FACTS = ['path', 'forge', 'depot', 'head', 'trains', 'town', 'stone', 'pier'] as const;
export type TownFact = (typeof TOWN_FACTS)[number];
/** The village sign's people: Place's TUNE.people, then +8 when the path opens, +6 at Far Head, +6 at the pier. */
export const TOWN_PEOPLE = { start: 12, path: 8, head: 6, pier: 6 } as const;

/** The few shared thresholds the facts come from, so the rules below are written once. */
export type TownRead = { path: boolean; forge: boolean; completed: number; trains: boolean };

/** The thresholds behind the town facts, from the rows. Station 2 is T3 (the root job is T1). */
export const townRead = (w: ReadWorld | World): TownRead => ({
  path: !!jobs(w)[2]?.completion,
  forge: forge(w).lit >= 0,
  completed: line2Completed(w),
  trains: line2Trains(w),
});

export function townHas(r: TownRead, f: TownFact): boolean {
  switch (f) {
    case 'path':
      return r.path;
    case 'forge':
      return r.forge;
    case 'depot':
      return r.completed >= 1; // Q1 done: the cart starts serving Q2
    case 'head':
      return r.completed >= 5; // Q5 reaches Far Head
    case 'trains':
      return r.trains;
    case 'pier':
      return r.completed >= 6;
    case 'town':
    case 'stone':
      return false; // until slice 5's train cargo
  }
}
/** The last true fact in TOWN_FACTS order, or null. */
export function newestTownFact(r: TownRead): TownFact | null {
  for (let k = TOWN_FACTS.length - 1; k >= 0; k--) if (townHas(r, TOWN_FACTS[k]!)) return TOWN_FACTS[k]!;
  return null;
}
/** How many facts are true. */
export function townLevel(r: TownRead): number {
  let n = 0;
  for (const f of TOWN_FACTS) if (townHas(r, f)) n++;
  return n;
}
export function townPopulation(r: TownRead): number {
  return (
    TOWN_PEOPLE.start +
    (townHas(r, 'path') ? TOWN_PEOPLE.path : 0) +
    (townHas(r, 'head') ? TOWN_PEOPLE.head : 0) +
    (townHas(r, 'pier') ? TOWN_PEOPLE.pier : 0)
  );
}
