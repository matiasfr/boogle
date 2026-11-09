// The wardrobe: what you own and what you wear (docs/plans/place-retirement.md, T4; docs/game-design/place.md,
// "The wardrobe"). Ownership is Personal Local, a localStorage store per world and player that a world bump prunes;
// what you wear (and what you're trying on) is Owner presence `wardrobe`, so others see it.
// Semantics are Place's gifts.ts ("what you wear"): one thing a slot; trying something on puts it on without owning
// it, and what it replaced comes back if you try something else or leave; swapping cycles what you own in a slot.
// The T1 hat and T2 scarf are granted here when their railway-profile.ts claims are accepted (entities/railway/reward.ts).
// The catalog (src/render/cosmetic-parts.ts) is handed in by ./index.ts: state.ts loads in Node and imports no render.
// Game code imports this file; the view draws it, and only main.ts's glob imports index.ts.
import { addPresenceField, onPeerRemoved, onRemotePresence } from '../../netplay/net.ts';

/** A cosmetic's catalog id (cosmetic-parts.ts's GiftId). */
export type CosmeticId = string;
export type ClothesSlot = 'hat' | 'accessory' | 'outfit';
export const CLOTHES_SLOTS: readonly ClothesSlot[] = ['hat', 'accessory', 'outfit'];
/** What the wardrobe needs to know of the catalog: every item in order, and what can be worn where. */
export type WardrobeCatalog = {
  items: readonly { id: CosmeticId; name: string; slot?: string }[];
  wearable(id: unknown, slot: ClothesSlot): id is CosmeticId;
};
export type Worn = Partial<Record<ClothesSlot, CosmeticId>>;
/** The saved shape. `dry` (boxes in a row with no Wonder) and `opened` (station boxes opened) are C1's. */
export type WardrobeSave = { got: CosmeticId[]; bought: CosmeticId[]; worn: Worn; dry: number; opened: string[] };
export type WardrobeEvent = {
  kind: 'try' | 'untry' | 'keep' | 'wear' | 'off' | 'swap' | 'grant' | 'load';
  id: CosmeticId | null;
};
export type WardrobeStorage = { read(): string | null; write(text: string): void };

export const WARDROBE_PREFIX = 'boogle.railway-wardrobe.v0:';
const MAX_OPENED = 32;
const MAX_DRY = 99;

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const empty = (): WardrobeSave => ({ got: [], bought: [], worn: {}, dry: 0, opened: [] });
const isClothes = (slot: unknown): slot is ClothesSlot => CLOTHES_SLOTS.includes(slot as ClothesSlot);

/** A save as stored, validated whole: anything malformed starts the wardrobe empty (room-safety). */
export function parseWardrobe(text: string | null, catalog: WardrobeCatalog): WardrobeSave {
  if (text === null || text.length > 8192) return empty();
  const known = new Set(catalog.items.map((g) => g.id));
  const ids = (v: unknown): CosmeticId[] | null => {
    if (!Array.isArray(v) || v.length > known.size) return null;
    const out = new Set<CosmeticId>();
    for (const id of v) {
      if (typeof id !== 'string' || !known.has(id) || out.has(id)) return null;
      out.add(id);
    }
    return [...out];
  };
  try {
    const v: unknown = JSON.parse(text);
    if (!record(v) || !record(v.worn)) return empty();
    const got = ids(v.got),
      bought = ids(v.bought);
    const { dry, opened } = v;
    if (!got || !bought || typeof dry !== 'number' || !Number.isInteger(dry) || dry < 0 || dry > MAX_DRY)
      return empty();
    if (
      !Array.isArray(opened) ||
      opened.length > MAX_OPENED ||
      !opened.every((s) => typeof s === 'string' && /^[A-Za-z0-9-]{1,16}$/.test(s))
    )
      return empty();
    const worn: Worn = {};
    for (const slot of CLOTHES_SLOTS) {
      const id = v.worn[slot];
      if (id === undefined) continue;
      if (!catalog.wearable(id, slot) || (!got.includes(id) && !bought.includes(id))) return empty();
      worn[slot] = id;
    }
    return { got, bought, worn, dry, opened: [...new Set(opened as string[])] };
  } catch {
    return empty();
  }
}

/** A peer's `wardrobe` presence, validated: catalog ids in their own slot only; anything else is nothing worn. */
export function parseWorn(v: unknown, catalog: WardrobeCatalog): Worn {
  const out: Worn = {};
  if (!record(v)) return out;
  for (const slot of CLOTHES_SLOTS) {
    const id = v[slot];
    if (catalog.wearable(id, slot)) out[slot] = id;
  }
  return out;
}

/** One player's wardrobe over a storage. Headless: the view, the shop and the shelf react through onWardrobe. */
export function createWardrobe(catalog: WardrobeCatalog, storage: WardrobeStorage, saveDelayMs = 250) {
  const slotOf = (id: CosmeticId) => catalog.items.find((g) => g.id === id)?.slot;
  const read = () => {
    try {
      return storage.read();
    } catch {
      return null;
    }
  };
  let save = parseWardrobe(read(), catalog);
  // What's on you now: what you wear, with what you're trying on in its slot.
  const on: Worn = { ...save.worn };
  let trying: { id: CosmeticId; slot: ClothesSlot; was: CosmeticId | null } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const listeners = new Set<(e: WardrobeEvent) => void>();

  function flush() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    try {
      storage.write(JSON.stringify(save));
    } catch {
      // Storage is optional: the wardrobe keeps working for this visit.
    }
  }
  /** What you wear, without what you're trying on. */
  function worn(): Worn {
    const out: Worn = { ...on };
    if (trying) {
      if (trying.was) out[trying.slot] = trying.was;
      else delete out[trying.slot];
    }
    return out;
  }
  function changed(kind: WardrobeEvent['kind'], id: CosmeticId | null, persist = true) {
    if (persist) {
      save.worn = worn();
      timer ??= setTimeout(flush, saveDelayMs);
    }
    for (const fn of listeners) fn({ kind, id });
  }
  function putOn(id: CosmeticId | null, slot: ClothesSlot) {
    if (id) on[slot] = id;
    else delete on[slot];
  }
  function untry() {
    if (!trying) return;
    putOn(trying.was, trying.slot);
    trying = null;
  }
  const isOwned = (id: CosmeticId) => save.got.includes(id) || save.bought.includes(id);
  const owned = (slot: string) => catalog.items.filter((g) => g.slot === slot && isOwned(g.id));
  /** On to the next thing you own in this slot, or nothing. */
  function nextInSlot(slot: ClothesSlot) {
    const list = owned(slot);
    const current = trying?.slot === slot ? trying.was : on[slot];
    return list[list.findIndex((g) => g.id === current) + 1];
  }

  return {
    owned,
    isOwned,
    isWorn(id: CosmeticId) {
      const slot = slotOf(id);
      return isClothes(slot) && on[slot] === id;
    },
    tried: () => trying?.id ?? null,
    /** Puts it on without owning it; what it replaced comes back with untry, another try or anything else. */
    tryOn(id: CosmeticId) {
      const slot = slotOf(id);
      if (!isClothes(slot) || !catalog.wearable(id, slot)) return false;
      const was = trying?.slot === slot ? trying.was : (on[slot] ?? null);
      if (trying?.slot !== slot) untry();
      putOn(id, slot);
      trying = { id, slot, was };
      changed('try', id, false);
      return true;
    },
    /** Puts back what trying something on replaced (walking out of the shop). */
    untry() {
      if (!trying) return;
      untry();
      changed('untry', null, false);
    },
    /** What you're trying on is yours: free, personal, and it stays on. */
    keepTried() {
      if (!trying) return null;
      const { id } = trying;
      trying = null;
      if (!save.bought.includes(id)) save.bought.push(id);
      changed('keep', id);
      return id;
    },
    wearOwned(id: CosmeticId) {
      const slot = slotOf(id);
      if (!isClothes(slot) || !isOwned(id) || !catalog.wearable(id, slot)) return;
      untry();
      putOn(id, slot);
      changed('wear', id);
    },
    takeOff(id: CosmeticId) {
      const slot = slotOf(id);
      if (!isClothes(slot)) return;
      untry();
      putOn(null, slot);
      changed('off', id);
    },
    /** Previews the very same cycle as swapSlot. `offVerb` is the shop's word for nothing (town-lines.ts, SHOP). */
    swapLabel: (slot: ClothesSlot, offVerb: string) => `Swap ${slot}: ${nextInSlot(slot)?.name ?? offVerb}`,
    swapSlot(slot: ClothesSlot) {
      untry();
      const next = nextInSlot(slot);
      putOn(next?.id ?? null, slot);
      changed('swap', next?.id ?? null);
    },
    /** A box, a find or a claim gave you this; `wear` puts it on at once. Saved at once, before any show. */
    grant(id: CosmeticId, { wear }: { wear: boolean }) {
      const slot = slotOf(id);
      if (slot === undefined) return;
      const fresh = !isOwned(id);
      if (fresh) save.got.push(id);
      const dress = wear && isClothes(slot) && catalog.wearable(id, slot);
      if (dress) {
        if (trying?.slot === slot) trying = null;
        putOn(id, slot);
      }
      if (fresh || dress) {
        changed('grant', id, false);
        save.worn = worn();
        flush();
      }
    },
    onWardrobe(fn: (e: WardrobeEvent) => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    /** What's on you, for presence and the view: null when nothing is worn or tried. */
    wearing(): Worn | null {
      return CLOTHES_SLOTS.some((slot) => on[slot]) ? { ...on } : null;
    },
    /** Reads the store again (another tab wrote it). Drops a try-on. */
    reload() {
      save = parseWardrobe(read(), catalog);
      trying = null;
      for (const slot of CLOTHES_SLOTS) putOn(save.worn[slot] ?? null, slot);
      changed('load', null, false);
    },
    flush,
    inspect: () => ({
      got: [...save.got],
      bought: [...save.bought],
      worn: worn(),
      tried: trying?.id ?? null,
      dry: save.dry,
      opened: [...save.opened],
    }),
  };
}
export type WardrobeApi = ReturnType<typeof createWardrobe>;

// ---------------------------------------------------------------- this tab's wardrobe and the partners'
let mine: WardrobeApi | null = null;
let known: WardrobeCatalog | null = null;
const theirs = new Map<string, Worn>();

/** The production entry starts it (./index.ts). Place never does, so its own `placeClothes` stays the only one there. */
export function startWardrobe(catalog: WardrobeCatalog, storage: WardrobeStorage) {
  known = catalog;
  mine ??= createWardrobe(catalog, storage);
  return mine;
}
/** This tab's wardrobe, or null before the production railway starts it. */
export const wardrobe = () => mine;
export const inspectWardrobe = () => mine?.inspect() ?? null;
/** What a partner is wearing, validated, or null. */
export const partnerWearing = (peer: string): Worn | null => theirs.get(peer) ?? null;

addPresenceField('wardrobe', () => mine?.wearing() ?? null);
onRemotePresence((remote, presence) => {
  const worn = remote.entered && known ? parseWorn(presence.wardrobe, known) : {};
  if (CLOTHES_SLOTS.some((slot) => worn[slot])) theirs.set(remote.peer, worn);
  else theirs.delete(remote.peer);
});
onPeerRemoved((remote) => void theirs.delete(remote.peer));
