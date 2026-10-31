// Pile rules: the pile.drop and pile.take ops and the `piles` state (../../sim/piles.js): loose material on the ground
// that anyone can pick up. Lockstep: everything here runs the same on every peer (see ./README.md).
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
import { okKind, MATERIALS } from '../../sim/materials.js';
import { JUNK, bad } from './edit-gen.js';

export const name = 'piles';
const isInt = Number.isSafeInteger;

export function install(sync, land) {
  const piles = createPiles();
  const onLand = (i, j) => isInt(i) && isInt(j) && i >= 1 && j >= 1 && i <= land.n - 2 && j <= land.n - 2;
  const dropOk = (i, j, k, n) =>
    onLand(i, j) && okKind(k) && isInt(n) && n >= 1 && n <= PILE_CAP && room(piles, k, n) === n;
  sync.registerOp('pile.drop', {
    validate: (e) => dropOk(e.i, e.j, e.k, e.n),
    apply: (e) => dropPile(piles, e.i, e.j, e.k, e.n),
  });
  sync.registerOp('pile.take', {
    validate: (e) => isInt(e.id) && isInt(e.n) && e.n >= 1 && e.n <= MAX_N && !!findPile(piles, e.id),
    apply: (e) => takePile(piles, e.id, e.n), // { id, k, n }: what was taken
  });
  sync.registerState('piles', {
    serialize: () => serializePiles(piles),
    load: (json) => loadPiles(piles, json),
    hash: () => hashPiles(piles),
  });
  return { piles, drop: (i, j, k, n) => dropPile(piles, i, j, k, n), room: (k, n) => room(piles, k, n) };
}

// Replay-test generators (./README.md): drop near the court (often onto an existing pile), take part or all of one.
export const edits = {
  'pile.drop': (r) =>
    r.chance(JUNK)
      ? bad(r, 'pile.drop')
      : { op: 'pile.drop', i: r.int(210, 216), j: r.int(185, 191), k: r.int(0, 1), n: r.int(1, 40) },
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
