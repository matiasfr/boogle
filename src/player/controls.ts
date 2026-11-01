// Control actions, so every control can live on a Backbone-style gamepad (standard mapping) as well as the
// keyboard and touch. Each action claims one pad slot; src/features/gamepad.js dispatches pad presses here. The sticks
// are fixed: left moves, right looks. This registry is also the one description of every control: the pause view's
// controls page and the first-run card are generated from it (src/player/guide.ts), so they cannot drift from the code.
//
//   registerAction(id, { pad, key, touch, label, detail, keys, group, order, guide, down, up, held })
//     pad     a slot from PAD (one action per slot; a clash is logged and the later action stays unbound)
//     down    () on press, up () on release, held (dt) every frame while pressed (all optional)
//     key     a KeyboardEvent.code or an array of them that also press the action (one shared listener: no repeats,
//             no Ctrl/Cmd/Alt, nothing while typing in a text field). keys (the guide row) defaults to these codes;
//             give keys too when the row shows more (ping: ['KeyG', 'Mouse1']). A code bound twice warns.
//     touch   the touch label (a string), or { label, className } to also build a .tbtn button in #touch that
//             presses the action
//     the rest describes the control for the guide, see below; guide: false keeps it off the guide (it is covered by
//     another row, or has nothing to show)
//   describeControl(id, { label, detail, keys, pad, touch, group, order, context })
//     a display-only row for a control with no pad action of its own (move, look, hotbar digits). It never
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
// A key with no pad action of its own (hotbar digits) binds through onKey(codes, { down, up }), same guard.
//
// To layer behaviour onto another module's action, wrap it from
// onStart, once it is registered; never overwrite its handlers by hand:
//   wrapAction(id, { down, up })   each wrapper is called as (next) with the handler it wraps (a no-op if there was
//                                  none) and decides whether to call it; the last wrap runs first
//   triggerAction(id, edge)        presses ('down') or releases ('up') an action, wraps included, for an input route
//                                  the registry does not bind itself (the mouse button in src/player/input.ts)
//   actionById(id)                 the registered action or null; for dev tooling and tests
// Each logs a [controls] warning when the id is missing (renamed or never registered). Re-registering an id drops its
// wraps.

/** A key list for the guide: codes, mouse tokens, combos, ranges, or a nested cluster. */
export type Keys = (string | Keys)[];
export type Detail = string | { pad?: string; kbm?: string; touch?: string };
type Edge = () => void;
/** A row of the controls guide (listControls, controlById). */
export type ControlRow = {
  id: string;
  label: string;
  detail?: Detail;
  keys?: Keys;
  pad?: string | string[];
  touch?: string;
  group?: string;
  order: number;
  context?: string;
};
export type ActionSpec = {
  pad: string;
  key?: string | string[];
  label?: string;
  detail?: Detail;
  keys?: Keys;
  touch?: string | { label: string; className: string };
  group?: string;
  order?: number;
  context?: string;
  guide?: boolean;
  down?: Edge | null;
  up?: Edge | null;
  held?: ((dt: number) => void) | null;
};
export type Action = {
  id: string;
  pad: string;
  label: string;
  detail?: Detail;
  keys?: Keys;
  touch?: string;
  group?: string;
  order?: number;
  context?: string;
  guide: boolean;
  down: Edge | null;
  up: Edge | null;
  held: ((dt: number) => void) | null;
  seq: number;
  button?: HTMLButtonElement | null;
};
type Described = Omit<ControlRow, 'order'> & { order?: number; seq: number; guide?: boolean };
type KeyLike = {
  code: string;
  type: string;
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  target?: EventTarget | null;
};

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
export const PAD_LABEL: Record<string, string> = {
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

export const GROUPS: [string, string][] = [
  ['move', 'Getting around'],
  ['camera', 'Camera'],
  ['ball', 'The ball'],
  ['hands', 'Hands'],
  ['friends', 'Friends'],
  ['menu', 'Menu'],
];

const actions = new Map<string, Action>(); // id -> action
const bySlot = new Map<string, Action>(); // slot -> action
const described = new Map<string, Described>(); // id -> display-only control
let seq = 0; // registration order, the last sort key of the guide

const row = (c: Action | Described): ControlRow => ({
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
function problemsOf(c: Omit<ControlRow, 'order'>) {
  const out: string[] = [];
  const at = `${c.id}:`;
  if (!c.label) out.push(`${at} no label`);
  if (!GROUPS.some(([g]) => g === c.group)) out.push(`${at} group "${c.group}" is not in GROUPS`);
  if (c.keys !== undefined && !Array.isArray(c.keys)) out.push(`${at} keys must be an array`);
  const hasPad = Array.isArray(c.pad) ? c.pad.length > 0 : !!c.pad;
  if ((c.keys !== undefined || c.touch) && !hasPad) out.push(`${at} has keys or touch but no pad binding`);
  return out;
}

const tokens = (keys: unknown) => (Array.isArray(keys) ? (keys.flat(Infinity) as string[]) : []);

export function controlProblems(list: ControlRow[] = listControls()) {
  const out = list.flatMap(problemsOf);
  const owner = new Map<string, string>(); // key token -> first control that claims it (without a context)
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

const warnProblems = (c: Action | Described) => {
  if (c.guide !== false) for (const p of problemsOf(c)) console.warn(`[controls] ${p}`);
};

// ---------------------------------------------------------------- keyboard
// One guard for every bound key: the name field (or any text field) keeps its letters.
export const isTyping = (e: { target?: EventTarget | null } | null | undefined) =>
  !!(e?.target as Element | null | undefined)?.closest?.('input, textarea, [contenteditable]');
const keyBinds = new Map<string, { owner: string; down: Edge | null; up: Edge | null }>(); // code -> binding
let listening = false;

// Dispatches a keydown/keyup to its binding; the window listener calls it, tests call it with plain objects.
export function keyEvent(e: KeyLike) {
  const b = keyBinds.get(e.code);
  if (!b) return false;
  if (e.type === 'keyup') b.up?.();
  else if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e)) b.down?.();
  else return false;
  return true;
}

const codesOf = (key: string | string[] | undefined): string[] => (key === undefined ? [] : [key].flat());

export function onKey(
  key: string | string[] | undefined,
  { down = null, up = null, owner = 'onKey' }: { down?: Edge | null; up?: Edge | null; owner?: string } = {},
) {
  const codes = codesOf(key);
  for (const code of codes) {
    const was = keyBinds.get(code);
    if (was && was.owner !== owner) console.warn(`[controls] ${owner}: key ${code} is already bound by ${was.owner}`);
    else keyBinds.set(code, { owner, down, up });
  }
  if (!listening && codes.length && typeof addEventListener === 'function') {
    listening = true;
    addEventListener('keydown', keyEvent as (e: KeyboardEvent) => void);
    addEventListener('keyup', keyEvent as (e: KeyboardEvent) => void);
  }
}

const unbindKeys = (owner: string) => {
  for (const [code, b] of keyBinds) if (b.owner === owner) keyBinds.delete(code);
};

// ---------------------------------------------------------------- touch
const touchLabel = (touch: ActionSpec['touch']) => (typeof touch === 'object' && touch ? touch.label : touch);

function touchButton(action: Action, { label, className }: { label: string; className: string }) {
  const box = typeof document === 'undefined' ? null : document.getElementById('touch');
  if (!box) return null;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `tbtn ${className}`;
  btn.textContent = label;
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    action.down?.();
  });
  for (const ev of ['pointerup', 'pointercancel']) btn.addEventListener(ev, () => action.up?.());
  box.append(btn);
  return btn;
}

export function registerAction(
  id: string,
  {
    pad,
    key,
    label,
    detail,
    keys,
    touch,
    group,
    order,
    context,
    guide = true,
    down = null,
    up = null,
    held = null,
  }: ActionSpec,
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
  old?.button?.remove();
  unbindKeys(id);
  const action: Action = {
    id,
    pad,
    label: label ?? '',
    detail,
    keys: keys ?? (key === undefined ? undefined : codesOf(key)),
    touch: touchLabel(touch),
    group,
    order,
    context, // like describeControl's: a situation it only applies in, so it may share a key
    guide,
    down,
    up,
    held,
    seq: old?.seq ?? seq++,
  };
  actions.set(id, action);
  bySlot.set(pad, action);
  // Keys and the touch button go through the action, so wrapAction reaches them too.
  onKey(key, { owner: id, down: () => action.down?.(), up: () => action.up?.() });
  if (typeof touch === 'object' && touch?.className) action.button = touchButton(action, touch);
  warnProblems(action);
  return true;
}

export function describeControl(
  id: string,
  {
    label,
    detail,
    keys,
    pad,
    touch,
    group,
    order,
    context,
  }: Omit<ControlRow, 'id' | 'order' | 'label'> & { label?: string; order?: number },
) {
  const c: Described = {
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

const bySort = (a: Action | Described, b: Action | Described) =>
  groupIndex(a.group) - groupIndex(b.group) || (a.order ?? 0) - (b.order ?? 0) || a.seq - b.seq;
const groupIndex = (g: string | undefined) => {
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
export function controlById(id: string) {
  const c = actions.get(id) ?? described.get(id);
  return c ? row(c) : null;
}

export function actionById(id: string, who = 'actionById') {
  const action = actions.get(id);
  if (!action) console.warn(`[controls] ${who}: no action "${id}"`);
  return action || null;
}

export function wrapAction(id: string, wrap: { down?: (next: Edge) => void; up?: (next: Edge) => void }) {
  const action = actionById(id, 'wrapAction');
  if (!action) return false;
  for (const k of ['down', 'up'] as const) {
    if (!wrap[k]) continue;
    const next = action[k] || (() => {});
    const fn = wrap[k]!;
    action[k] = () => fn(next);
  }
  return true;
}

export const triggerAction = (id: string, edge: 'down' | 'up') => actionById(id, 'triggerAction')?.[edge]?.();

export const actionForSlot = (pad: string) => bySlot.get(pad) || null;
export const slotFor = (id: string) => actions.get(id)?.pad ?? null; // the pad slot an action is bound to
// While a modal (the pause view) takes the pad, src/features/gamepad.js sends it each new press by slot and runs no
// action. setPadModal(null) hands the pad back.
let modal: ((slot: string) => void) | null = null;
export const setPadModal = (fn: ((slot: string) => void) | null) => (modal = fn);
export const padModal = () => modal;
// Lighter: something on screen that the game keeps playing behind (the Boogler's talk box) takes just these slots'
// new presses, and the stick and every other button keep working. setPadGrab(null) lets go.
let grab: { fn: (slot: string) => void; slots: string[] } | null = null;
export const setPadGrab = (fn: ((slot: string) => void) | null, slots: string[] = []) =>
  (grab = fn ? { fn, slots } : null);
export const padGrab = () => grab;
export const listActions = () => PAD.map((p) => bySlot.get(p)).filter((a): a is Action => !!a);
export const freeSlots = () => PAD.filter((p) => !bySlot.has(p));
