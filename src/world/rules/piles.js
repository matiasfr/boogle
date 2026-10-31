// Pile rules: the pile.drop and pile.take ops and the `piles` state (../../sim/piles.js): loose material on the ground
// that anyone can pick up onto their stack (./stacks.js), or spill from it. Lockstep: everything here runs the same on every peer (see ./README.md).
import {
  createPiles,
  dropPile,
  takePile,
  findPile,
  room,
  serializePiles,
  loadPiles,
  hashPiles,
  MAX_PILES,
  MAX_N,
  PILE_CAP,
} from '../../sim/piles.js';
import { MATERIALS } from '../../sim/materials.js';
import { JUNK, bad } from './edit-gen.js';

export const name = 'piles';
const isInt = Number.isSafeInteger;

export function install(sync, land, rules) {
  const piles = createPiles();
  const { stacks } = rules;
  const onLand = (i, j) => isInt(i) && isInt(j) && i >= 1 && j >= 1 && i <= land.n - 2 && j <= land.n - 2;
  // Put down n from your own stack (a jump past the soft cap spills its top this way): the kind is the stack's.
  sync.registerOp('pile.drop', {
    validate: (e) => {
      const k = stacks.kind(e.u);
      if (!onLand(e.i, e.j) || !isInt(e.n) || e.n < 1 || e.n > PILE_CAP || e.n > stacks.count(e.u)) return false;
      return room(piles, e.i, e.j, k, e.n) === e.n;
    },
    apply: (e) => {
      const k = stacks.kind(e.u);
      const r = dropPile(piles, e.i, e.j, k, Math.min(e.n, stacks.count(e.u)));
      stacks.take(e.u, r.placed); // only what landed leaves the stack
      return { k, ...r };
    },
  });
  // Take up to n onto your stack: refused when you carry another material or are full (state checks bound it).
  sync.registerOp('pile.take', {
    validate: (e) => {
      const p = isInt(e.id) && isInt(e.n) && e.n >= 1 && e.n <= MAX_N ? findPile(piles, e.id) : null;
      return !!p && stacks.room(e.u, p.k) > 0;
    },
    apply: (e) => {
      const p = findPile(piles, e.id);
      if (!p) return null;
      const got = takePile(piles, e.id, Math.min(e.n, stacks.room(e.u, p.k)));
      stacks.add(e.u, got.k, got.n);
      return got; // { id, k, n }: what went onto the stack
    },
  });
  sync.registerState('piles', {
    serialize: () => serializePiles(piles),
    load: (json) => loadPiles(piles, json),
    hash: () => hashPiles(piles),
  });
  return { piles, drop: (i, j, k, n) => dropPile(piles, i, j, k, n), room: (i, j, k, n) => room(piles, i, j, k, n) };
}

// Replay-test generators (./README.md): put some of your stack down near the court (often onto an existing pile), take
// part or all of a pile. (Stacks only fill from piles, sources and so on, so the first pile comes from a later module's
// overflow or a spill; the replay seeds one with a test-only drop, see test/world-replay.test.mjs.)
export const edits = {
  'pile.drop': (r) =>
    r.chance(JUNK) ? bad(r, 'pile.drop') : { op: 'pile.drop', i: r.int(210, 216), j: r.int(185, 191), n: r.int(1, 6) },
  'pile.take': (r, view) => {
    if (r.chance(JUNK)) return bad(r, 'pile.take');
    const { list } = view.rules.piles.piles;
    const p = list.length ? r.pick(list) : null;
    return p && { op: 'pile.take', i: p.i, j: p.j, id: p.id, n: r.int(1, 30) };
  },
};

// Ids unique and issued, caps hold, no empty piles, kinds known.
export function invariants({ piles }) {
  const { list, nextId } = piles;
  if (list.length > MAX_PILES) return `${list.length} piles`;
  if (new Set(list.map((p) => p.id)).size !== list.length) return 'duplicate pile ids';
  for (const p of list) {
    if (p.id >= nextId) return `pile ${p.id} at or past nextId`;
    if (p.n < 1 || p.n > MAX_N) return `pile ${p.id} holds ${p.n}`;
    if (p.k >= MATERIALS.length) return `pile ${p.id} of kind ${p.k}`;
  }
  return null;
}
