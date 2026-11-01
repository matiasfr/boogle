// The haul playtest kit's panel (?proto=haul; loaded by src/features/haul-kit.ts; checklist:
// docs/playtest-kits/haul.md). Two kinds of knobs:
// - This tab: the Local feel numbers (src/player/haul-feel.ts): pour cadence, pickup flight. Instant, never
//   sent.
// - Whole room: the lockstep haul numbers (src/world/rules/tune.ts): a tune.set edit, so everyone in the room changes
//   at the same tick. Only in a `proto-` room (the host refuses it elsewhere).
// Plus Reset haul (tune.reset: a fresh haul for the room, tuning kept), Defaults, and Copy values (one line for
// docs/playtests.md). Collapsible; while closed it has no focusable field, and an open field keeps its keys
// (src/player/controls.ts isTyping), so it never takes the game's keys.
import { rules } from '../world/game-world.ts';
import './haul-kit.css';
import { onFrame } from '../loop.ts';
import { submitEdit, onApplied } from '../world/sync.ts';
import { getRoomId, net } from '../netplay/net.ts';
import { me } from '../player/player.ts';
import { TUNABLES, isProtoRoom, type TuneKey } from '../sim/tune.ts';
import { haulFeel, HAUL_FEEL_DEFAULTS, type HaulFeel } from '../player/haul-feel.ts';

const QUESTIONS = [
  'Does carrying a load of wood feel good with no goal?',
  'Does filling a rail section feel like effort or a chore?',
  'Which numbers changed how it felt, and to what?',
];
const LOCAL: { key: keyof HaulFeel; label: string; min: number; max: number; step: number }[] = [
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

// Chores this section (Local, this tab): how much gathering and walking one section takes, to see whether the chore
// is the gathering (docs/research/carrying-and-logistics-play.md rec 1: about 15 Take-logs presses across ~8 palms;
// start from at most 6-8 deliberate actions and under ~2 minutes per section). Counts from your first take after the
// section opens until its machine starts; starts over when the next section opens or the haul is reset.
body.append(el('h3', '', 'Chores this section (this tab)'));
const choreLine = el('p', 'hk-note hk-chores');
body.append(choreLine);
const chores = { site: -1, presses: 0, palms: new Set<number>(), metres: 0, t0: 0, t1: 0 };
let lastPos: { x: number; z: number } | null = null;
function choresReset(site: number) {
  Object.assign(chores, { site, presses: 0, metres: 0, t0: 0, t1: 0 });
  chores.palms.clear();
}
onApplied((e: { op: string; p?: string; id?: number }) => {
  if (e.op === 'tune.reset') choresReset(rules.sites.sites.open);
  if (e.op !== 'src.take' || e.p !== (net.room?.selfId ?? 'local')) return;
  chores.presses++;
  if (typeof e.id === 'number') chores.palms.add(e.id);
  if (!chores.t0) chores.t0 = performance.now();
});
const choreText = () => {
  const s = (((chores.t1 || (chores.t0 ? performance.now() : 0)) - chores.t0) / 1000) | 0;
  return `presses ${chores.presses} · palms ${chores.palms.size} · walked ${Math.round(chores.metres)} m · ${s} s`;
};

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
  LOCAL.map((k) => `${k.key}=${haulFeel[k.key]}`).join(' ') +
  ` | section ${chores.site + 1}: ${choreText()}`;
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
    // the chore counter runs whether or not the panel is open
    const site = rules.sites.sites.open;
    if (site !== chores.site) choresReset(site);
    const running = rules.sites.sites.list[site]?.t0 >= 0;
    if (running && chores.t0 && !chores.t1) chores.t1 = performance.now();
    const p = me.entered ? me.body?.position : null;
    if (p) {
      const d = lastPos ? Math.hypot(p.x - lastPos.x, p.z - lastPos.z) : 0;
      if (chores.t0 && !chores.t1 && d < 3) chores.metres += d; // a bigger jump is a teleport, not a walk
      lastPos = { x: p.x, z: p.z };
    }
    if (open) choreLine.textContent = choreText();
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
