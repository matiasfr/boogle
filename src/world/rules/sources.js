// Source rules: the src.take op and the `sources` state (../../sim/sources.js): palms (and, later, each age's own
// sources) that give the age's material straight onto the taker's stack (./stacks.js); what doesn't fit drops as a
// pile at the source (./piles.js). Sources refill when a section is laid (./sites.js onSectionDone) and on a seeded
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
} from '../../sim/sources.js';
import { materialOf } from '../../sim/materials.js';
import { JUNK, bad } from './edit-gen.js';

export const name = 'sources';

export function install(sync, land, rules) {
  const sources = createSources();
  const { stacks, piles, sites } = rules;
  const list = () => sourcesOf(sites.age(), land.layout); // the layout is filled before tick 1
  const charges = (id) => chargesOf(sources, sites.age(), list().length, id);
  sync.registerOp('src.take', {
    validate: (e) => {
      if (charges(e.id) <= 0) return false;
      const k = materialOf(sites.age());
      const over = YIELD - Math.min(YIELD, stacks.room(e.u, k));
      return over === 0 || piles.room(k, over) === over;
    },
    apply: (e) => {
      const n = take(sources, sites.age(), list().length, e.id);
      if (!n) return null;
      const k = materialOf(sites.age());
      const got = stacks.add(e.u, k, n);
      const p = list()[e.id];
      const over = n - got ? piles.drop(p.i + 1, p.j, k, n - got).placed : 0; // beside the source
      return { id: e.id, k, n: got, over };
    },
  });
  sync.registerState('sources', {
    serialize: () => serializeSources(sources),
    load: (json) => loadSources(sources, json),
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
  'src.take': (r, view) => {
    if (r.chance(JUNK)) return bad(r, 'src.take');
    const { trees } = view.land.layout;
    const id = r.int(0, trees.length - 1);
    return { op: 'src.take', i: trees[id].i, j: trees[id].j, id };
  },
};

export function invariants({ sources }) {
  for (const [id, n] of sources.spent) if (n < 1 || n > FULL || id < 0) return `source ${id} spent ${n}`;
  return null;
}
