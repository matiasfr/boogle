// Pile rules: the pile.drop and pile.take ops and the `piles` state (../../sim/piles.ts): loose material on the ground
// that anyone can pick up onto their stack (./stacks.ts), or spill from it. Lockstep: everything here runs the same on every peer (see ./README.md).
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
} from '../../sim/piles.ts';
import { MATERIALS } from '../../sim/materials.ts';
import { JUNK, bad } from './edit-gen.ts';

import type { SyncView, Land, Stream } from './types.ts';
import type { StacksApi } from './stacks.ts';

export const name = 'piles';
export type PilesApi = ReturnType<typeof install>;
const isInt = (v: unknown): v is number => Number.isSafeInteger(v);

export function install(sync: SyncView, land: Land, rules: { stacks: StacksApi }) {
  const piles = createPiles();
  const { stacks } = rules;
  const onLand = (i: unknown, j: unknown) =>
    isInt(i) && isInt(j) && i >= 1 && j >= 1 && i <= land.n - 2 && j <= land.n - 2;
  // Put down n from your own stack: the kind is the stack's.
  sync.registerOp<{ n: number }>('pile.drop', {
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
  sync.registerOp<{ id: number; n: number }>('pile.take', {
    validate: (e) => {
      const p = isInt(e.id) && isInt(e.n) && e.n >= 1 && e.n <= MAX_N ? findPile(piles, e.id) : null;
      return !!p && stacks.room(e.u, p.k) > 0;
    },
    apply: (e) => {
      const p = findPile(piles, e.id);
      if (!p) return null;
      const got = takePile(piles, e.id, Math.min(e.n, stacks.room(e.u, p.k)));
      if (!got) return null;
      stacks.add(e.u, got.k, got.n);
      return got; // { id, k, n }: what went onto the stack
    },
  });
  sync.registerState('piles', {
    serialize: () => serializePiles(piles),
    load: (json: unknown) => loadPiles(piles, json),
    hash: () => hashPiles(piles),
  });
  return {
    piles,
    drop: (i: number, j: number, k: number, n: number) => dropPile(piles, i, j, k, n), // apply only
    room: (i: number, j: number, k: number, n: number) => room(piles, i, j, k, n),
  };
}

// Replay-test generators (./README.md): put some of your stack down near the court (often onto an existing pile), take
// part or all of a pile. (Stacks only fill from piles, sources and so on, so the first pile comes from a later module's
// overflow or a spill; the replay seeds one with a test-only drop, see test/world-replay.test.mjs.)
export const edits = {
  'pile.drop': (r: Stream) =>
    r.chance(JUNK) ? bad(r, 'pile.drop') : { op: 'pile.drop', i: r.int(210, 216), j: r.int(185, 191), n: r.int(1, 6) },
  'pile.take': (r: Stream, view: { rules: { piles: PilesApi } }) => {
    if (r.chance(JUNK)) return bad(r, 'pile.take');
    const { list } = view.rules.piles.piles;
    const p = list.length ? r.pick(list) : null;
    return p && { op: 'pile.take', i: p.i, j: p.j, id: p.id, n: r.int(1, 30) };
  },
};

// Ids unique and issued, caps hold, no empty piles, kinds known.
export function invariants({ piles }: PilesApi): string | null {
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
