// Gift rules: the gift.take and gift.toss ops, the `gifts` state (things players threw, the frisbee on its perch;
// ../../sim/gifts.ts) and its tick. Lockstep: everything here runs the same on every peer (see ./README.md).
import { GIFTS, giftIndex, carryable } from '../../sim/gift-catalog.ts';
import {
  createGifts,
  canToss,
  findItem,
  takeItem,
  tossItem,
  tickGifts,
  serializeGifts,
  loadGifts,
  hashGifts,
  MAX_ITEMS,
  ON_GROUND,
} from '../../sim/gifts.ts';
import { JUNK, bad } from './edit-gen.ts';
import type { SyncView, Land, Stream, Rules } from './types.ts';
import type { Gifts } from '../../sim/gifts.ts';
import type { install as installMushrooms } from './mushrooms.ts';

// Wire fields of each op (on top of op, i, j): the item, and a throw's kind, resting height, sequence and launch (six
// integers).
export type TakeFields = { id: number };
export type TossFields = { k: number; y: number; n: number; l: number[] };

export const name = 'gifts';
export const SEEDS = giftIndex('seeds');
export const LOST = -3; // `gift.toss` only: the throw ended in water or nowhere a seed can grow, so nothing lands

const isInt = (v: unknown): v is number => Number.isSafeInteger(v);
const launchOk = (l: unknown) => Array.isArray(l) && l.length === 6 && l.every((v) => isInt(v) && Math.abs(v) < 1e5);

export function install(sync: SyncView, land: Land, rules: { mushrooms: ReturnType<typeof installMushrooms> }) {
  const { n } = land;
  const gifts = createGifts(land.layout); // holds the layout by reference: the game fills it before tick 1
  sync.registerOp<TakeFields>('gift.take', {
    validate: (e) => isInt(e.id) && !!findItem(gifts, e.id),
    apply: (e, tick) => takeItem(gifts, e.id, tick),
  });
  // A seed plants itself where it lands (the host checks the spot as for mush.plant); anything else lands as an item.
  sync.registerOp<TossFields>('gift.toss', {
    validate: (e, ctx) => {
      if (!launchOk(e.l) || !isInt(e.n) || !isInt(e.k) || !carryable(GIFTS[e.k])) return false;
      if (e.y === LOST) return true;
      if (e.k === SEEDS)
        return rules.mushrooms.plantOk(e.i, e.j, ctx.env as Parameters<typeof rules.mushrooms.plantOk>[2]);
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

// Replay-test generators (./README.md): pick up a lying item, throw something (seeds plant where they land), or junk.
const THROWABLE = GIFTS.flatMap((g, k) => (carryable(g) ? [k] : []));
export const edits = {
  'gift.take': (r: Stream, view: { rules: Rules }) => {
    if (r.chance(JUNK)) return bad(r, 'gift.take');
    const { items } = view.rules.gifts.gifts;
    const it = items.length ? r.pick(items) : null;
    return it && { op: 'gift.take', i: it.i, j: it.j, id: it.id };
  },
  'gift.toss': (r: Stream) => {
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
export function invariants({ gifts }: { gifts: Gifts }): string | null {
  const ids = gifts.items.map((it) => it.id);
  if (ids.length > MAX_ITEMS) return `${ids.length} items`;
  if (new Set(ids).size !== ids.length) return 'duplicate item ids';
  if (ids.some((id) => id >= gifts.nextId)) return 'an item id at or past nextId';
  return null;
}
