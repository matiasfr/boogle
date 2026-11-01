// Your hotbar: everything you carry, one thing at a time in your hand. Personal (DESIGN.md: personal rewards) and kept
// in localStorage, except the beach ball, whose slot follows ball ownership (src/player/hands.ts syncs it every frame).
//
//   inv.slots[k] = { id, n } | null   id: a catalog id (src/sim/gift-catalog.ts) or 'ball'; n: how many (seeds stack)
//   inv.sel                           the slot in your hand, -1 for empty hands
//   onHotbarChange(fn)                fn() after any change (selection included)
import { GIFTS, carryable } from '../sim/gift-catalog.ts';

export const SLOTS = 5;
export const MAX_SEEDS = 20;
const STORE = 'boogle.hotbar';
export type Slot = { id: string; n: number };
const known = (id: unknown) => GIFTS.some((g) => g.id === id && carryable(g));

export const inv = { slots: new Array<Slot | null>(SLOTS).fill(null), sel: -1, version: 0 };
const changeFns: (() => void)[] = [];
export const onHotbarChange = (fn: () => void) => changeFns.push(fn);

function load() {
  let saved: unknown = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORE) ?? 'null');
  } catch {
    // storage unavailable or corrupt: start empty-handed
  }
  if (!Array.isArray(saved)) return;
  // The first five filled known items, so an older, longer save compacts itself.
  saved
    .filter((s): s is Slot => s && known(s.id))
    .slice(0, SLOTS)
    .forEach((s, k) => {
      inv.slots[k] = { id: s.id, n: s.id === 'seeds' ? clampSeeds(s.n) : 1 };
    });
}
const clampSeeds = (n: unknown) => (Number.isInteger(n) ? Math.min(MAX_SEEDS, Math.max(1, n as number)) : 1);

function save() {
  try {
    localStorage.setItem(STORE, JSON.stringify(inv.slots.map((s) => (s && s.id !== 'ball' ? s : null))));
  } catch {
    // storage unavailable; the hotbar lasts until reload
  }
}

function changed() {
  inv.version++;
  save();
  for (const fn of changeFns) fn();
}

const heldSlot = () => inv.slots[inv.sel] ?? null;
export const heldId = () => heldSlot()?.id ?? null;
export const slotOf = (id: string) => inv.slots.findIndex((s) => s?.id === id);
export const has = (id: string) => slotOf(id) >= 0;

// Where `id` would go: a seed stack with room, or the first empty slot; -1 if neither.
export function roomFor(id: string) {
  const stack = id === 'seeds' ? inv.slots.findIndex((s) => s?.id === 'seeds' && s.n < MAX_SEEDS) : -1;
  if (stack >= 0) return stack;
  return inv.slots.indexOf(null);
}

function put(id: string, n: number) {
  const k = roomFor(id);
  if (k < 0) return -1;
  const s = inv.slots[k];
  if (s) s.n = Math.min(MAX_SEEDS, s.n + n);
  else inv.slots[k] = { id, n: id === 'seeds' ? Math.min(MAX_SEEDS, n) : 1 };
  return k;
}

// Puts `id` into the hotbar, and into your hand unless `hold` is false. Returns false if there is no room, or `id` is
// neither the ball nor a carryable catalog item (the HUD names every slot from the catalog).
export function take(id: string, n = 1, hold = true) {
  if (id !== 'ball' && !known(id)) return false;
  const k = put(id, n);
  if (k < 0) return false;
  if (hold) inv.sel = k;
  changed();
  return true;
}

// Takes one of what is in your hand out of the hotbar (a seed off the stack, or the whole thing). Returns its id.
export function useOne() {
  const s = heldSlot();
  if (!s) return null;
  if (--s.n <= 0) inv.slots[inv.sel] = null;
  changed();
  return s.id;
}

export function drop(id: string) {
  const k = slotOf(id);
  if (k < 0) return;
  inv.slots[k] = null;
  changed();
}

// Pressing the key of the slot already in your hand empties your hands.
export function select(k: number) {
  if (k < -1 || k >= SLOTS) return;
  inv.sel = k === inv.sel ? -1 : k;
  changed();
}

export function cycle(dir: number) {
  inv.sel = ((((inv.sel < 0 ? (dir > 0 ? -1 : 0) : inv.sel) + dir) % SLOTS) + SLOTS) % SLOTS;
  changed();
}

load();
