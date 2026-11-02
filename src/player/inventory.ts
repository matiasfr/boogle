// Your hotbar: everything you carry, one thing at a time in your hand. Personal (DESIGN.md: personal rewards) and kept
// in localStorage, except the beach ball, whose slot follows ball ownership (src/player/hands.ts syncs it every frame).
//
//   inv.slots[k] = { id } | null      id: a catalog id (src/sim/gift-catalog.ts) or 'ball'
//   inv.sel                           the slot in your hand, -1 for empty hands
//   onHotbarChange(fn)                fn() after any change (selection included)
import { GIFTS, carryable } from '../sim/gift-catalog.ts';

export const SLOTS = 5;
const STORE = 'boogle.hotbar';
export type Slot = { id: string };
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
      inv.slots[k] = { id: s.id };
    });
}

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

// Where a new item would go: the first empty slot, -1 if none.
export const roomFor = () => inv.slots.indexOf(null);

// Puts `id` into the hotbar, and into your hand unless `hold` is false. Returns false if there is no room, or `id` is
// neither the ball nor a carryable catalog item (the HUD names every slot from the catalog).
export function take(id: string, hold = true) {
  if (id !== 'ball' && !known(id)) return false;
  const k = roomFor();
  if (k < 0) return false;
  inv.slots[k] = { id };
  if (hold) inv.sel = k;
  changed();
  return true;
}

// Takes what is in your hand out of the hotbar. Returns its id.
export function useOne() {
  const s = heldSlot();
  if (!s) return null;
  inv.slots[inv.sel] = null;
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
