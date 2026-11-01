import { COLORS } from '../constants.ts';
import { me, enterIsland } from './player.ts';
import { chargeOf } from './throw-curve.ts'; // not throw.ts: that imports player.js, which imports us
import { net, remotes } from '../netplay/net.ts';
import { inputState, requestLock } from './input.ts';
import { canvas } from '../render/scene.ts';
import { interactTarget, useVerb } from './hands.ts';
import { glyph, inputKind } from './glyphs.ts';
import { onFrame } from '../loop.ts';

// Elements of index.html, always there.
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const dom = {
  lobbyEl: $('lobby'),
  joinForm: $<HTMLFormElement>('join'),
  nameInput: $<HTMLInputElement>('name-input'),
  swatchesEl: $('swatches'),
  enterBtn: $<HTMLButtonElement>('enter'),
  hereEl: $('here'),
  rosterEl: $('roster'),
  netEl: $('net'),
  netLabel: $('net-label'),
  hintEl: $('hint'),
  chargeEl: $('charge'),
  chargeFill: $('charge-fill'),
  grabBtn: $('btn-grab'),
  jumpBtn: $('btn-jump'),
  touchEl: $('touch'),
  stickEl: $('stick'),
  knobEl: $('knob'),
};

let lastHint: boolean | null = null;
function updateHud() {
  dom.chargeEl.style.display = me.charging ? 'block' : 'none';
  if (me.charging) dom.chargeFill.style.width = `${Math.round(chargeOf(performance.now() - me.chargeStart) * 100)}%`;
  // No Pointer Lock (the iPad): the hint says how to look instead, until the player has (never in a seat: no looking).
  const { canLock } = inputState;
  const hint =
    me.entered &&
    inputKind() === 'kbm' &&
    !inputState.locked &&
    !inputState.lockFailed &&
    (canLock || (!inputState.looked && !inputState.seated));
  if (hint !== lastHint) {
    lastHint = hint;
    dom.hintEl.innerHTML = !hint
      ? ''
      : canLock
        ? `${glyph('use')}<span>Look around</span>`
        : '<span>Drag or scroll with two fingers to look around</span>';
    dom.hintEl.hidden = !hint;
  }
  if (!document.body.classList.contains('touch') || !me.entered) return;
  const t = me.charging ? null : interactTarget(); // mid wind-up the button only throws
  const label = t?.run ? t.verb : (useVerb() ?? 'Grab');
  if (dom.grabBtn.textContent !== label) {
    dom.grabBtn.textContent = label;
    document.body.classList.toggle('main-throws', label === 'Throw');
  }
}
// late -190, after the throw preview (player.js, -200), before the feature late hooks (src/loop.ts lists the orders).
onFrame(updateHud, { phase: 'late', order: -190 });

let peopleKey = '';
export function renderPeople() {
  const on = [...remotes.values()].filter((r) => r.entered);
  const key = JSON.stringify([
    net.state,
    net.error,
    me.entered && [me.name, me.colorIdx],
    on.map((r) => [r.name, r.colorIdx]),
  ]);
  if (key === peopleKey) return;
  peopleKey = key;
  dom.rosterEl.replaceChildren();
  const addRow = (name: string, colorIdx: number, isYou: boolean) => {
    const li = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = COLORS[colorIdx];
    const label = document.createElement('span');
    label.textContent = name;
    li.append(dot, label);
    if (isYou) {
      const you = document.createElement('span');
      you.className = 'you';
      you.textContent = 'you';
      li.append(you);
    }
    dom.rosterEl.append(li);
  };
  if (me.entered) addRow(me.name, me.colorIdx, true);
  for (const r of on) addRow(r.name, r.colorIdx, false);

  const count = on.length + (me.entered ? 1 : 0);
  const cap = typeof net.full === 'number' ? ` (${net.full} players)` : '';
  if (net.state === 'solo')
    dom.netLabel.textContent = net.full
      ? `Solo · island full${net.retryAt ? ' · waiting for a spot' : ''}`
      : net.error === 'elsewhere'
        ? 'Solo · playing in another tab'
        : `Solo · ${net.error || 'room unavailable'}${net.retryAt ? ' · retrying' : ''}`;
  else if (net.state === 'connecting') dom.netLabel.textContent = 'Connecting';
  else dom.netLabel.textContent = `Live · ${count} on the island`;

  if (net.state === 'solo') {
    dom.hereEl.textContent = net.full
      ? `The island is full${cap}. You'll join when someone leaves.`
      : "Couldn't reach the island's room, so it's yours alone. Reload the page to try again.";
  } else if (!on.length) dom.hereEl.textContent = 'Nobody else is on the island yet. Share this page to bring friends.';
  else {
    const names = on.map((r) => r.name);
    dom.hereEl.textContent =
      names.length === 1
        ? `${names[0]} is on the island.`
        : `${names.slice(0, -1).join(', ')} and ${names.at(-1)} are on the island.`;
  }
}

// ---------------------------------------------------------------- lobby
function renderSwatches() {
  dom.swatchesEl.replaceChildren();
  COLORS.forEach((col, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.id = `swatch-${k}`;
    b.className = 'swatch';
    b.style.background = col;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(k === me.colorIdx));
    b.setAttribute('aria-label', `Color ${k + 1}`);
    b.addEventListener('click', () => {
      me.colorIdx = k;
      renderSwatches();
    });
    dom.swatchesEl.append(b);
  });
}

// The island can be drawn: Jump in becomes available (the lobby itself, and the network, do not wait for this).
export function lobbyReady() {
  dom.enterBtn.disabled = false;
  dom.enterBtn.textContent = 'Jump in';
}

export function initLobby() {
  let storedName = '',
    storedColor = NaN;
  try {
    storedName = localStorage.getItem('boogle.name') || '';
    storedColor = parseInt(localStorage.getItem('boogle.color') ?? '', 10);
  } catch {
    // storage unavailable; start with defaults
  }
  if (storedName) dom.nameInput.value = storedName;
  me.colorIdx =
    Number.isInteger(storedColor) && storedColor >= 0 && storedColor < COLORS.length
      ? storedColor
      : Math.floor(Math.random() * COLORS.length);
  renderSwatches();
  dom.joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (dom.enterBtn.disabled) return; // the graphics are still starting
    enterIsland();
    canvas.focus();
    requestLock();
  });
}
