// Source rules: the src.take op and the `sources` state (../../sim/sources.js): palms (and, later, each age's own
// sources) that give the age's material straight onto the taker's stack (./stacks.js); what doesn't fit drops as a
// pile at the source (./piles.js). Sources refill when a section is laid (./sites.js onSectionDone) and on a seeded
// trickle. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createSources,
  sync as matchAge,
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
} from '../../sim/sources.js';
import { materialOf } from '../../sim/materials.js';
import { JUNK, bad } from './edit-gen.js';

export const name = 'sources';

export function install(sync, land, rules) {
  const sources = createSources();
  const { stacks, piles, sites } = rules;
  const fresh = () => matchAge(sources, sites.age(), land.layout); // apply and ticks only: the layout fills before tick 1
  // What a source holds as fresh() would see it, without changing state (validate and the adapter read this).
  const peek = (id) => {
    const n = sourcesOf(sites.age(), land.layout).length;
    if (!Number.isSafeInteger(id) || id < 0 || id >= n) return 0;
    return sources.a === sites.age() && id < sources.c.length ? chargesOf(sources, id) : FULL;
  };
  // Where a source's overflow lands: the cell beside it (the pile helper merges or spreads from there).
  const spot = (id) => sourcesOf(sources.a, land.layout)[id];
  sync.registerOp('src.take', {
    validate: (e) => {
      if (peek(e.id) <= 0) return false;
      const k = materialOf(sites.age());
      const over = YIELD - Math.min(YIELD, stacks.room(e.u, k));
      return over === 0 || piles.room(k, over) === over;
    },
    apply: (e) => {
      fresh();
      const n = take(sources, e.id);
      if (!n) return null;
      const k = materialOf(sources.a);
      const got = stacks.add(e.u, k, n);
      const p = spot(e.id);
      const over = n - got ? piles.drop(p.i + 1, p.j, k, n - got).placed : 0;
      return { id: e.id, k, n: got, over };
    },
  });
  sync.registerState('sources', {
    serialize: () => serializeSources(sources),
    load: (json) => loadSources(sources, json),
    hash: () => hashSources(sources),
  });
  sites.onSectionDone(() => {
    fresh();
    refillAll(sources); // R1: the island breathes out
  });
  sync.onTick((t) => {
    fresh();
    trickle(sources, t, sync.world.seed); // R2
  }, 'sources');
  return { sources, charges: peek };
}

// Replay-test generators (./README.md): shake a palm (charged or not), or junk.
export const edits = {
  'src.take': (r, view) => {
    if (r.chance(JUNK)) return bad(r, 'src.take');
    const { trees } = view.land.layout;
    const id = r.int(0, trees.length - 1);
    return { op: 'src.take', i: trees[id].i, j: trees[id].j, id };
  },
};

export function invariants({ sources }) {
  if (sources.c.some((v) => v < 0 || v > FULL)) return 'charges out of range';
  return null;
}
