// What is in your hand: one thing at a time, or nothing. Personal and not saved: you start each visit empty-handed. The
// beach ball is in your hand exactly while you carry it (src/player/hands.ts follows ball ownership every frame).
//
//   inv.held               a catalog id (src/sim/gift-catalog.ts), 'ball', or null for empty hands
//   take(id)               into your hand; what you held lets go (onLetGo)
//   onHandChange(fn)       fn() after any change: one listener, src/player/hands.ts
//   onLetGo(fn)            fn(id) when something is pushed out of your hand: src/player/hands.ts drops it by your feet
import { GIFTS, carryable } from '../sim/gift-catalog.ts';

const known = (id: string) => GIFTS.some((g) => g.id === id && carryable(g));

export const inv = { held: null as string | null, version: 0 };
let handChanged = () => {};
export const onHandChange = (fn: () => void) => {
  handChanged = fn;
};
let letGo: (id: string) => void = () => {};
export const onLetGo = (fn: (id: string) => void) => {
  letGo = fn;
};

function changed() {
  inv.version++;
  handChanged();
}

export const heldId = () => inv.held;

// Puts `id` in your hand. Returns false if `id` is neither the ball nor a carryable catalog item (the name tag names it
// from the catalog).
export function take(id: string) {
  if (id !== 'ball' && !known(id)) return false;
  if (inv.held) letGo(inv.held);
  inv.held = id;
  changed();
  return true;
}

// Empties your hand. Returns what was in it.
export function emptyHand() {
  const id = inv.held;
  if (!id) return null;
  inv.held = null;
  changed();
  return id;
}

export function drop(id: string) {
  if (inv.held === id) emptyHand();
}
