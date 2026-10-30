// Gift rules: the fruit.drop, gift.take and gift.toss ops, the `gifts` state (fruit on the palms, things washed up on
// the beach, things players threw, the frisbee on its perch; ../../sim/gifts.js) and its tick. Lockstep: everything
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
} from '../../sim/gifts.js';
import { isLegacyCell, fromLegacy } from '../legacy-grid.js';

export const name = 'gifts';
export const SEEDS = giftIndex('seeds');
export const LOST = -3; // `gift.toss` only: the throw ended in water or nowhere a seed can grow, so nothing lands

// Items saved by an older, smaller island sit on its 129-cell grid: move them to the same spot on today's grid.
// Snapshots with `v` are already on today's grid (and may use any cell), so it is safe to run twice.
export function migrateGifts(json) {
  const it = json?.it;
  if (!Array.isArray(it) || json.v) return json;
  const out = it.slice();
  for (let k = 0; k + 5 < out.length; k += 6)
    if (isLegacyCell(out[k + 2], out[k + 3])) [out[k + 2], out[k + 3]] = fromLegacy(out[k + 2], out[k + 3]);
  return { ...json, it: out };
}

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
      if (!launchOk(e.l) || !isInt(e.n) || !isInt(e.k) || !GIFTS[e.k] || GIFTS[e.k].src === 'ball') return false;
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
    load: (json) => loadGifts(gifts, migrateGifts(json)),
    hash: () => hashGifts(gifts),
  });
  sync.onTick((t) => tickGifts(gifts, t, sync.world.seed), 'gifts');
  return { gifts };
}
