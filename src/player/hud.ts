import { COLORS, DEFAULT_NAME, isTouch } from '../constants.ts';
import { sanitizeName } from '../math.ts';
import { me } from './state.ts';
import { enterIsland } from './player.ts';
import { dom } from './dom.ts';
import { chargeOf } from './throw-curve.ts';
import { dropHoldProgress } from './cargo-drop.ts';
import { net, remotes, onNetState, onPeopleChanged } from '../netplay/net.ts';
import { inputState } from './input-state.ts';
import { requestLock } from './input.ts';
import { canvas } from '../render/scene.ts';
import { momentBusy } from '../render/buddy-frame.ts';
import { mainVerb } from './hands.ts';
import { glyph, inputKind } from './glyphs.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { showCard, friendlyName } from './arrival.ts';

export { dom } from './dom.ts';

let lastHint: string | null = null;
function updateHud() {
  // The throw's bar, and the same bar filling toward putting your whole back down while Drop is held.
  const dropping = dropHoldProgress();
  dom.chargeEl.style.display = me.charging || dropping > 0 ? 'block' : 'none';
  if (me.charging || dropping > 0)
    dom.chargeFill.style.width = `${Math.round((me.charging ? chargeOf(performance.now() - me.chargeStart) : dropping) * 100)}%`;
  // Touch guidance follows the active input, and retires once a touch drag has turned the camera.
  const { canLock } = inputState;
  const kind = inputKind();
  const touchHint = kind === 'touch' && !inputState.touchLooked && !inputState.seated;
  const mouseHint =
    kind === 'kbm' &&
    !isTouch &&
    !inputState.locked &&
    !inputState.lockFailed &&
    (canLock || (!inputState.looked && !inputState.seated));
  const hint =
    me.entered && !momentBusy() && (touchHint || mouseHint)
      ? mouseHint && canLock
        ? `${glyph('use')}<span>Look around</span>`
        : '<span>Drag or scroll with two fingers to look around</span>'
      : '';
  if (hint !== lastHint) {
    lastHint = hint;
    dom.hintEl.innerHTML = hint;
    dom.hintEl.hidden = !hint;
  }
  if (!document.body.classList.contains('touch') || !me.entered) return;
  const label = mainVerb();
  if (dom.grabBtn.textContent !== label) {
    dom.grabBtn.textContent = label;
    document.body.classList.toggle('main-throws', label === 'Throw');
  }
}
// late -190, after the throw preview (src/player/throw.ts, -200), before the feature late hooks (src/loop.ts lists the orders).
defineKind('hud', { lateUpdate: -190 });
spawn({ kind: 'hud', lateUpdate: updateHud });

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
    dot.style.background = COLORS[colorIdx]!;
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
  if (net.state === 'solo')
    dom.netLabel.textContent = net.full
      ? `Solo · island full${net.retryAt ? ' · waiting for a spot' : ''}`
      : net.error === 'elsewhere'
        ? 'Solo · playing in another tab'
        : `Solo · ${net.error || 'room unavailable'}${net.retryAt ? ' · retrying' : ''}`;
  else if (net.state === 'connecting') dom.netLabel.textContent = 'Connecting';
  else dom.netLabel.textContent = `Live · ${count} on the island`;
}
onPeopleChanged(renderPeople);
onNetState((state) => {
  if (dom.netEl) dom.netEl.dataset.state = state;
  renderPeople();
});

// ---------------------------------------------------------------- lobby
// The name-and-colour card shows on a first visit only (src/player/arrival.ts): a returning player skips it and goes
// straight in with the saved name and colour as soon as the island can be drawn.
const direct = !showCard();
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

// The lobby's part of entering: its name field, closing it, remembering who you are. The rest is enterIsland's.
function joinFromLobby() {
  if (me.entered) return;
  const name = sanitizeName(dom.nameInput.value) || DEFAULT_NAME;
  document.body.classList.add('playing');
  dom.lobbyEl.hidden = true;
  try {
    localStorage.setItem('boogle.name', name);
    localStorage.setItem('boogle.color', String(me.colorIdx));
  } catch {
    // storage unavailable (private mode); the name just will not be remembered
  }
  enterIsland(name);
}

// The island can be drawn: Jump in becomes available (the lobby itself, and the network, do not wait for this).
export function lobbyReady() {
  dom.enterBtn.disabled = false;
  dom.enterBtn.textContent = 'Jump in';
  if (direct) joinFromLobby();
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
  dom.nameInput.value = storedName || friendlyName();
  const nameRow = document.createElement('div');
  nameRow.className = 'name-row';
  const reroll = document.createElement('button');
  reroll.className = 'name-reroll';
  reroll.type = 'button';
  reroll.textContent = '⚄';
  reroll.setAttribute('aria-label', 'Suggest another name');
  reroll.addEventListener('click', () => {
    dom.nameInput.value = friendlyName(dom.nameInput.value);
  });
  dom.nameInput.replaceWith(nameRow);
  nameRow.append(dom.nameInput, reroll);
  if (direct) dom.lobbyEl.hidden = true; // the loading screen covers the wait
  me.colorIdx =
    Number.isInteger(storedColor) && storedColor >= 0 && storedColor < COLORS.length
      ? storedColor
      : Math.floor(Math.random() * COLORS.length);
  renderSwatches();
  dom.joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (dom.enterBtn.disabled) return; // the graphics are still starting
    joinFromLobby();
    canvas.focus();
    requestLock();
  });
}
