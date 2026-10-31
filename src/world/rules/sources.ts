// Source rules: the src.take op and the `sources` state (../../sim/sources.ts): home palm cells (where the log bundles lie) and,
// later, each age's own sources, that give the age's material straight onto the taker's stack (./stacks.ts); what doesn't fit drops as a
// pile at the source (./piles.ts). Sources refill when a section is laid (./sites.ts onSectionDone) and on a seeded
// trickle. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createSources,
  matchAge,
  sourcesOf,
  chargesOf,
  take,
  refillAll,
  trickle,
  serializeSources,
  loadSources,
  hashSources,
  YIELD,
  FULL,
} from '../../sim/sources.ts';
import { materialOf } from '../../sim/materials.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Land, Stream } from './types.ts';
import type { StacksApi } from './stacks.ts';
import type { PilesApi } from './piles.ts';
import type { SitesApi } from './sites.ts';

export const name = 'sources';
export type SourcesApi = ReturnType<typeof install>;

export function install(sync: SyncView, land: Land, rules: { stacks: StacksApi; piles: PilesApi; sites: SitesApi }) {
  const sources = createSources();
  const { stacks, piles, sites } = rules;
  const list = () => sourcesOf(sites.age(), land.layout); // the layout is filled before tick 1
  const charges = (id: unknown) => chargesOf(sources, sites.age(), list().length, id);
  sync.registerOp<{ id: number }>('src.take', {
    validate: (e) => {
      if (charges(e.id) <= 0) return false;
      const k = materialOf(sites.age());
      const over = YIELD - Math.min(YIELD, stacks.room(e.u, k));
      const p = list()[e.id];
      return over === 0 || piles.room(p.i + 1, p.j, k, over) === over;
    },
    apply: (e) => {
      const n = take(sources, sites.age(), list().length, e.id);
      if (!n) return null;
      const k = materialOf(sites.age());
      const p = list()[e.id];
      // what fits beside the source; validate checked it all fits, so the stack takes the rest
      const over = Math.min(n - Math.min(n, stacks.room(e.u, k)), piles.room(p.i + 1, p.j, k, n));
      if (over) piles.drop(p.i + 1, p.j, k, over);
      const got = stacks.add(e.u, k, n - over);
      return { id: e.id, k, n: got, over };
    },
  });
  sync.registerState('sources', {
    serialize: () => serializeSources(sources),
    load: (json: unknown) => loadSources(sources, json),
    hash: () => hashSources(sources),
  });
  sites.onSectionDone(() => refillAll(sources)); // R1: the island breathes out
  sync.onTick((t) => {
    matchAge(sources, sites.age());
    trickle(sources, t, sync.world.seed); // R2
  }, 'sources');
  return { sources, charges, list };
}

// Replay-test generators (./README.md): shake a palm (charged or not), or junk.
export const edits = {
  'src.take': (r: Stream, view: { land: Land }) => {
    if (r.chance(JUNK)) return bad(r, 'src.take');
    const { trees } = view.land.layout;
    const id = r.int(0, trees.length - 1);
    return { op: 'src.take', i: trees[id].i, j: trees[id].j, id };
  },
};

export function invariants({ sources }: SourcesApi): string | null {
  for (const [id, n] of sources.spent) if (n < 1 || n > FULL || id < 0) return `source ${id} spent ${n}`;
  return null;
}
