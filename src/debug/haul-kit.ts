// The haul playtest kit's panel (?proto=haul; loaded by src/features/haul-kit.ts; checklist:
// docs/playtest-kits/haul.md). Two kinds of knobs:
// - This tab: the Local feel numbers (src/player/haul-feel.ts): stack sway, pour cadence, pickup flight. Instant, never
//   sent.
// - Whole room: the lockstep haul numbers (src/world/rules/tune.ts): a tune.set edit, so everyone in the room changes
//   at the same tick. Only in a `proto-` room (the host refuses it elsewhere).
// Plus Reset haul (tune.reset: a fresh haul for the room, tuning kept), Defaults, and Copy values (one line for
// docs/playtests.md). Collapsible; while closed it has no focusable field, and an open field keeps its keys
// (src/player/controls.ts isTyping), so it never takes the game's keys.
import { rules } from '../world/game-world.ts';
import './haul-kit.css';
import { onFrame } from '../loop.ts';
import { submitEdit } from '../world/sync.ts';
import { getRoomId } from '../netplay/net.ts';
import { TUNABLES, isProtoRoom, type TuneKey } from '../sim/tune.ts';
import { haulFeel, HAUL_FEEL_DEFAULTS, type HaulFeel } from '../player/haul-feel.ts';

const QUESTIONS = [
  'Does carrying a wobbly stack feel good with no goal?',
  'Does filling a rail section feel like effort or a chore?',
  'Which numbers changed how it felt, and to what?',
];
const LOCAL: { key: keyof HaulFeel; label: string; min: number; max: number; step: number }[] = [
  { key: 'sway', label: 'Sway', min: 0, max: 0.05, step: 0.001 },
  { key: 'swayOver', label: 'Sway past soft cap', min: 0, max: 0.2, step: 0.005 },
  { key: 'swayHz', label: 'Sway speed', min: 0.5, max: 6, step: 0.1 },
  { key: 'pourMs', label: 'Pour every (ms)', min: 50, max: 1000, step: 10 },
  { key: 'pourN', label: 'Pieces per pour', min: 1, max: 12, step: 1 },
  { key: 'flyMs', label: 'Pickup flight (ms)', min: 100, max: 1500, step: 20 },
];
const room = getRoomId();
const proto = isProtoRoom(room);
const { tune } = rules.tune;

let open = true;
try {
  open = localStorage.getItem('haulKitOpen') !== '0';
} catch {
  // no storage: start open
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const panel = el('aside', 'haul-kit');
const head = el('button', 'hk-head', 'Haul kit');
head.type = 'button';
const body = el('div', 'hk-body');
panel.append(head, body);
document.body.append(panel);
function setOpen(v: boolean): void {
  open = v;
  panel.classList.toggle('open', v);
  head.setAttribute('aria-expanded', String(v));
  try {
    localStorage.setItem('haulKitOpen', v ? '1' : '0');
  } catch {
    // per-viewer convenience only
  }
}
head.addEventListener('click', () => setOpen(!open));
setOpen(open);

const intro = el('p', 'hk-note');
intro.textContent = proto
  ? `Room "${room}": room-wide numbers change for everyone here.`
  : `Room "${room}" is not a playtest room: only this tab's knobs work. Open ?proto=haul&room=proto-haul to tune the room.`;
const qs = el('ol', 'hk-qs');
for (const q of QUESTIONS) qs.append(el('li', '', q));
body.append(intro, qs);

// A row: label, slider and number box kept in step; `commit` runs on release (room) or on every move (local).
type Row = { range: HTMLInputElement; num: HTMLInputElement; set: (v: number) => void };
function row(
  parent: HTMLElement,
  label: string,
  min: number,
  max: number,
  step: number,
  live: boolean,
  commit: (v: number) => void,
): Row {
  const r = el('label', 'hk-row');
  const range = el('input');
  const num = el('input');
  range.type = 'range';
  num.type = 'number';
  for (const i of [range, num]) Object.assign(i, { min: String(min), max: String(max), step: String(step) });
  num.inputMode = 'decimal';
  r.append(el('span', 'hk-label', label), range, num);
  parent.append(r);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const set = (v: number) => {
    range.value = String(v);
    num.value = String(v);
  };
  range.addEventListener('input', () => {
    num.value = range.value;
    if (live) commit(Number(range.value));
  });
  range.addEventListener('change', () => {
    commit(Number(range.value));
    range.blur(); // the game's keys again
  });
  num.addEventListener('change', () => {
    const v = clamp(Number(num.value) || min);
    set(v);
    commit(v);
  });
  num.addEventListener('keydown', (e) => e.key === 'Enter' && num.blur());
  return { range, num, set };
}

body.append(el('h3', '', 'This tab (feel)'));
const local = el('div', 'hk-group');
body.append(local);
const localRows = LOCAL.map((k) => {
  const r = row(local, k.label, k.min, k.max, k.step, true, (v) => (haulFeel[k.key] = v));
  r.set(haulFeel[k.key]);
  return r;
});

body.append(el('h3', '', proto ? 'Whole room (lockstep)' : 'Whole room (proto- rooms only)'));
const shared = el('div', 'hk-group');
body.append(shared);
// key -> what we sent and when: the row waits for it, and snaps back to the room's value if the host refused it
const pending = new Map<TuneKey, { v: number; t0: number }>();
const sendTune = (key: TuneKey, v: number) => {
  if (tune.v[key] === v) return;
  if (submitEdit({ op: 'tune.set', i: 0, j: 0, key, v })) pending.set(key, { v, t0: performance.now() });
};
const roomRows = TUNABLES.map((t) => {
  const r = row(shared, t.label, t.min, t.max, 1, false, (v) => sendTune(t.key, Math.round(v)));
  r.set(tune.v[t.key]);
  if (!proto) for (const i of [r.range, r.num]) i.disabled = true;
  return r;
});

const status = el('p', 'hk-note hk-status');
const buttons = el('div', 'hk-buttons');
const resetBtn = el('button', '', 'Reset haul');
const defaultsBtn = el('button', '', 'Defaults');
const copyBtn = el('button', '', 'Copy values');
for (const b of [resetBtn, defaultsBtn, copyBtn]) b.type = 'button';
resetBtn.disabled = !proto;
buttons.append(resetBtn, defaultsBtn, copyBtn);
body.append(buttons, status);
const say = (text: string) => (status.textContent = text);

// Reset haul: a second tap within 3 s confirms (it empties every stack, pile and site in the room).
let armed = 0;
resetBtn.addEventListener('click', () => {
  if (performance.now() - armed > 3000) {
    armed = performance.now();
    resetBtn.textContent = 'Tap again to reset';
    return;
  }
  armed = 0;
  resetBtn.textContent = 'Reset haul';
  say(submitEdit({ op: 'tune.reset', i: 0, j: 0 }) ? 'Haul reset for the room.' : 'Reset not sent.');
});
defaultsBtn.addEventListener('click', () => {
  Object.assign(haulFeel, HAUL_FEEL_DEFAULTS);
  LOCAL.forEach((k, n) => localRows[n].set(haulFeel[k.key]));
  if (proto) for (const t of TUNABLES) sendTune(t.key, t.def);
  say('Back to the shipped numbers.');
});
// One line, for docs/playtests.md: the room's numbers, then this tab's.
const valuesLine = () =>
  `haul-kit room=${room} ` +
  TUNABLES.map((t) => `${t.key}=${tune.v[t.key]}`).join(' ') +
  ' | ' +
  LOCAL.map((k) => `${k.key}=${haulFeel[k.key]}`).join(' ');
copyBtn.addEventListener('click', async () => {
  const line = valuesLine();
  try {
    await navigator.clipboard.writeText(line);
    say('Copied: ' + line);
  } catch {
    say(line); // no clipboard (insecure origin): select it by hand
  }
});

// Room values follow the state (someone else's change, a refused set, a load); a field you're in is left alone.
let drawn = -1;
onFrame(
  () => {
    if (!open) return;
    const now = performance.now();
    let settled = false;
    for (const [key, p] of pending) if (tune.v[key] === p.v || now - p.t0 > 1500) settled = pending.delete(key);
    if (tune.rev === drawn && !settled) return;
    drawn = tune.rev;
    TUNABLES.forEach((t, n) => {
      const r = roomRows[n];
      if (pending.has(t.key) || document.activeElement === r.num || document.activeElement === r.range) return;
      r.set(tune.v[t.key]);
    });
  },
  { phase: 'late', order: 40 },
);
