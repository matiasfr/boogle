// Control actions, so every control can live on a Backbone-style gamepad (standard mapping) as well as the
// keyboard and touch. Each action claims one pad slot; src/features/gamepad.js dispatches pad presses here. The sticks
// are fixed: left moves, right looks. This registry is also the one description of every control: the pause view's
// controls page and the first-run card are generated from it (src/guide.js), so they cannot drift from the code.
//
//   registerAction(id, { pad, label, detail, keys, touch, group, order, guide, down, up, held })
//     pad     a slot from PAD (one action per slot; a clash is logged and the later action stays unbound)
//     down    () on press, up () on release, held (dt) every frame while pressed (all optional)
//     the rest describes the control for the guide, see below; guide: false keeps it off the guide (it is covered by
//     another row, or has nothing to show)
//   describeControl(id, { label, detail, keys, pad, touch, group, order, context })
//     a display-only row for a control with no pad action of its own (move, look, hotbar digits, dig, dive). It never
//     claims a slot and never dispatches. pad may be a slot, an array of slots, or a stick: 'ls' / 'rs'. Describing
//     the same id again replaces it.
//   listControls()     every action (guide !== false) and described control as plain rows, sorted by GROUPS index,
//                      then order (default 0), then registration order
//   controlProblems()  human-readable gaps in that list (dev-time check, see src/features/controls-check.js)
//
// Fields of a guide row:
//   label    short, sentence case ("Bring the ball back"); device-specific wording goes in detail
//   detail   a string, or { pad: '...', kbm: '...' } when a note only applies to one device
//   group    id from GROUPS
//   keys     array of alternatives: a KeyboardEvent.code ('KeyE', 'Space', 'ShiftLeft'), a mouse token ('Mouse0' click,
//            'Mouse1' middle click, 'Mouse2' right click, 'Wheel', 'MouseMove'), a combo joined with '+'
//            ('ShiftLeft+Mouse0'), a digit range 'Digit1-8', or a nested array for a cluster shown side by side
//            (['KeyW', 'KeyA', 'KeyS', 'KeyD'])
//   touch    the label of the touch button (or gesture) as the player reads it
//   context  a situation the row only applies in ('swimming', 'holding'); two rows may share a key if one has one
// A control with keys or touch must also have a pad binding (AGENTS.md: every control is playable on a gamepad).
//
// New features that add a key or touch button register an action too. Free slots: freeSlots().
//
// To layer behaviour onto another module's action (feel.js turns pile into a dive while swimming), wrap it from
// onStart, once it is registered; never overwrite its handlers by hand:
//   wrapAction(id, { down, up })   each wrapper is called as (next) with the handler it wraps (a no-op if there was
//                                  none) and decides whether to call it; the last wrap runs first
//   actionById(id)                 the registered action or null; for dev tooling and tests
// Both log a [controls] warning when the id is missing (renamed or never registered). Re-registering an id drops its
// wraps.

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

export const GROUPS = [
  ['move', 'Getting around'],
  ['camera', 'Camera'],
  ['ball', 'The ball'],
  ['hands', 'Hands'],
  ['sand', 'Sand'],
  ['friends', 'Friends'],
  ['menu', 'Menu'],
];

const actions = new Map(); // id -> action
const bySlot = new Map(); // slot -> action
const described = new Map(); // id -> display-only control
let seq = 0; // registration order, the last sort key of the guide

const row = (c) => ({
  id: c.id,
  label: c.label,
  detail: c.detail,
  keys: c.keys,
  pad: c.pad,
  touch: c.touch,
  group: c.group,
  order: c.order ?? 0,
  context: c.context,
});

// Gaps in one control; what a missing field would silently leave out of the guide.
function problemsOf(c) {
  const out = [];
  const at = `${c.id}:`;
  if (!c.label) out.push(`${at} no label`);
  if (!GROUPS.some(([g]) => g === c.group)) out.push(`${at} group "${c.group}" is not in GROUPS`);
  if (c.keys !== undefined && !Array.isArray(c.keys)) out.push(`${at} keys must be an array`);
  const hasPad = Array.isArray(c.pad) ? c.pad.length > 0 : !!c.pad;
  if ((c.keys !== undefined || c.touch) && !hasPad) out.push(`${at} has keys or touch but no pad binding`);
  return out;
}

const tokens = (keys) => (Array.isArray(keys) ? keys.flat(Infinity) : []);

export function controlProblems(list = listControls()) {
  const out = list.flatMap(problemsOf);
  const owner = new Map(); // key token -> first control that claims it (without a context)
  for (const c of list) {
    if (c.context) continue;
    for (const t of new Set(tokens(c.keys))) {
      const first = owner.get(t);
      if (first && first !== c.id) out.push(`key ${t} is claimed by both ${first} and ${c.id}`);
      else owner.set(t, c.id);
    }
  }
  return out;
}

const warnProblems = (c) => {
  if (c.guide !== false) for (const p of problemsOf(c)) console.warn(`[controls] ${p}`);
};

export function registerAction(
  id,
  { pad, label, detail, keys, touch, group, order, guide = true, down = null, up = null, held = null },
) {
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
  const action = {
    id,
    pad,
    label: label ?? '',
    detail,
    keys,
    touch,
    group,
    order,
    guide,
    down,
    up,
    held,
    seq: old?.seq ?? seq++,
  };
  actions.set(id, action);
  bySlot.set(pad, action);
  warnProblems(action);
  return true;
}

export function describeControl(id, { label, detail, keys, pad, touch, group, order, context }) {
  const c = {
    id,
    label: label ?? '',
    detail,
    keys,
    pad,
    touch,
    group,
    order,
    context,
    seq: described.get(id)?.seq ?? seq++,
  };
  described.set(id, c);
  warnProblems(c);
  return c;
}

const bySort = (a, b) => groupIndex(a.group) - groupIndex(b.group) || a.order - b.order || a.seq - b.seq;
const groupIndex = (g) => {
  const i = GROUPS.findIndex(([id]) => id === g);
  return i < 0 ? GROUPS.length : i;
};

export function listControls() {
  return [...actions.values(), ...described.values()]
    .filter((c) => c.guide !== false)
    .sort(bySort)
    .map(row);
}

// One control by id, hidden from the guide or not (glyphs.js reads its keys and slots).
export function controlById(id) {
  const c = actions.get(id) ?? described.get(id);
  return c ? row(c) : null;
}

export function actionById(id, who = 'actionById') {
  const action = actions.get(id);
  if (!action) console.warn(`[controls] ${who}: no action "${id}"`);
  return action || null;
}

export function wrapAction(id, wrap) {
  const action = actionById(id, 'wrapAction');
  if (!action) return false;
  for (const k of ['down', 'up']) {
    if (!wrap[k]) continue;
    const next = action[k] || (() => {});
    const fn = wrap[k];
    action[k] = () => fn(next);
  }
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
