// Gift rules: the fruit.drop, gift.take and gift.toss ops, the `gifts` state (fruit on the palms, things players
// threw, the frisbee on its perch; ../../sim/gifts.js) and its tick. Lockstep: everything
// here runs the same on every peer (see ./README.md).
import { GIFTS, giftIndex } from '../../sim/gift-catalog.js';
import {
  createGifts,
  canDrop,
  canToss,
  dropFruit,
  findItem,
  takeItem,
  tossItem,
  tickGifts,
  serializeGifts,
  loadGifts,
  hashGifts,
  MAX_ITEMS,
  NEVER,
  ON_GROUND,
} from '../../sim/gifts.js';
import { JUNK, bad } from './edit-gen.js';

export const name = 'gifts';
export const SEEDS = giftIndex('seeds');
export const LOST = -3; // `gift.toss` only: the throw ended in water or nowhere a seed can grow, so nothing lands

const isInt = Number.isSafeInteger;
const launchOk = (l) => Array.isArray(l) && l.length === 6 && l.every((v) => isInt(v) && Math.abs(v) < 1e5);

export function install(sync, land, rules) {
  const { n } = land;
  const gifts = createGifts(land.layout); // holds the layout by reference: the game fills it before tick 1
  sync.registerOp('fruit.drop', {
    validate: (e, ctx) => canDrop(gifts, e.t, ctx.tick, e.d),
    apply: (e, tick) => dropFruit(gifts, e.t, tick, e.d),
  });
  sync.registerOp('gift.take', {
    validate: (e) => isInt(e.id) && !!findItem(gifts, e.id),
    apply: (e, tick) => takeItem(gifts, e.id, tick),
  });
  // A seed plants itself where it lands (the host checks the spot as for mush.plant); anything else lands as an item.
  sync.registerOp('gift.toss', {
    validate: (e, ctx) => {
      if (
        !launchOk(e.l) ||
        !isInt(e.n) ||
        !isInt(e.k) ||
        !GIFTS[e.k] ||
        GIFTS[e.k].src === 'ball' ||
        GIFTS[e.k].retired
      )
        return false;
      if (e.y === LOST) return true;
      if (e.k === SEEDS) return rules.mushrooms.plantOk(e.i, e.j, ctx.env);
      return canToss(e.k, e.i, e.j, e.y) && e.i < n && e.j < n;
    },
    apply: (e, tick) => {
      if (e.y === LOST) return null;
      if (e.k === SEEDS) return rules.mushrooms.plant(e.i, e.j);
      return tossItem(gifts, e.k, e.i, e.j, e.y, tick);
    },
  });
  sync.registerState('gifts', {
    serialize: () => serializeGifts(gifts),
    load: (json) => loadGifts(gifts, json),
    hash: () => hashGifts(gifts),
  });
  sync.onTick((t) => tickGifts(gifts, t), 'gifts');
  return { gifts };
}

// Replay-test generators (./README.md): shake a palm, pick up a lying item, throw something
// (seeds plant where they land), or junk.
const THROWABLE = GIFTS.flatMap((g, k) => (g.src === 'ball' || g.retired ? [] : [k]));
export const edits = {
  'fruit.drop': (r, view) => {
    if (r.chance(JUNK)) return bad(r, 'fruit.drop');
    const { trees } = view.land.layout;
    if (!trees.length) return null;
    const t = r.int(0, trees.length - 1);
    return { op: 'fruit.drop', i: trees[t].i, j: trees[t].j, t, d: r.int(0, 7) };
  },
  'gift.take': (r, view) => {
    if (r.chance(JUNK)) return bad(r, 'gift.take');
    const { items } = view.rules.gifts.gifts;
    const it = items.length ? r.pick(items) : null;
    return it && { op: 'gift.take', i: it.i, j: it.j, id: it.id };
  },
  'gift.toss': (r) => {
    if (r.chance(JUNK)) return bad(r, 'gift.toss');
    return {
      op: 'gift.toss',
      i: r.int(210, 245),
      j: r.int(185, 220),
      k: r.chance(0.3) ? SEEDS : r.pick(THROWABLE),
      y: r.pick([ON_GROUND, ON_GROUND, r.int(0, 500), LOST]),
      n: r.int(0, 999),
      l: Array.from({ length: 6 }, () => r.int(-500, 500)),
    };
  },
};

// Item ids are unique and already issued, and the island holds no more than its cap.
export function invariants({ gifts }) {
  const ids = gifts.items.map((it) => it.id);
  if (ids.length > MAX_ITEMS) return `${ids.length} items`;
  if (new Set(ids).size !== ids.length) return 'duplicate item ids';
  if (ids.some((id) => id >= gifts.nextId)) return 'an item id at or past nextId';
  if (gifts.nextWash !== NEVER) return 'wash schedule unpinned';
  return null;
}
