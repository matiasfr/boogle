// Control actions, so every control can live on a Backbone-style gamepad (standard mapping) as well as the
// keyboard and touch. Each action claims one pad slot; src/features/gamepad.js dispatches pad presses here and lists
// the layout on its help card. The sticks are fixed: left moves, right looks.
//
//   registerAction(id, { pad, label, down, up, held })
//     pad    a slot from PAD (one action per slot; a clash is logged and the later action stays unbound)
//     down   () on press, up () on release, held (dt) every frame while pressed (all optional)
//
// New features that add a key or touch button register an action too. Free slots: freeSlots().

// Index = button index in the W3C "standard" gamepad mapping.
export const PAD = [
  'a',
  'b',
  'x',
  'y',
  'lb',
  'rb',
  'lt',
  'rt',
  'view',
  'menu',
  'l3',
  'r3',
  'up',
  'down',
  'left',
  'right',
];
export const PAD_LABEL = {
  a: 'A',
  b: 'B',
  x: 'X',
  y: 'Y',
  lb: 'LB',
  rb: 'RB',
  lt: 'LT',
  rt: 'RT',
  view: 'View',
  menu: 'Menu',
  l3: 'L3',
  r3: 'R3',
  up: 'D-pad ↑',
  down: 'D-pad ↓',
  left: 'D-pad ←',
  right: 'D-pad →',
};

const actions = new Map(); // id -> action
const bySlot = new Map(); // slot -> action

export function registerAction(id, { pad, label = id, down = null, up = null, held = null }) {
  if (!PAD.includes(pad)) {
    console.warn(`[controls] ${id}: unknown pad slot "${pad}"`);
    return false;
  }
  const owner = bySlot.get(pad);
  if (owner && owner.id !== id) {
    console.warn(`[controls] ${id}: pad slot ${pad} is taken by ${owner.id}; free: ${freeSlots().join(', ')}`);
    return false;
  }
  const old = actions.get(id);
  if (old && old.pad !== pad) bySlot.delete(old.pad);
  const action = { id, pad, label, down, up, held };
  actions.set(id, action);
  bySlot.set(pad, action);
  return true;
}

export const actionForSlot = (pad) => bySlot.get(pad) || null;
export const slotFor = (id) => actions.get(id)?.pad ?? null; // the pad slot an action is bound to, for glyphs
// While a modal (the Boogler's talk box) takes the pad, src/features/gamepad.js sends it each new press by slot and
// runs no action. setPadModal(null) hands the pad back.
let modal = null;
export const setPadModal = (fn) => (modal = fn);
export const padModal = () => modal;
export const listActions = () => PAD.map((p) => bySlot.get(p)).filter(Boolean);
export const freeSlots = () => PAD.filter((p) => !bySlot.has(p));
