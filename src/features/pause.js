// The pause view: a local overlay with Resume, Controls (the generated guide, src/player/guide.ts), Room (who is here, an
// invite link) and Leave. The island keeps running behind it (DESIGN.md: a Local feature, never stops the frame loop);
// it only takes this player's input through src/player/modal.ts. Opens on Esc (the pointer lock ends), H (on the controls),
// Menu on a gamepad and the corner menu button. The first-run card is src/features/first-run.js.
// Fullscreen is a toggle on the main page, shown only where the page can go fullscreen and is not already an installed
// fullscreen app: desktop browsers, Android and iPad; not iPhone Safari (no element fullscreen) or a frame without it.
import './pause.css';
import { onFrame, onStart } from '../loop.ts';
import { COLORS, DEFAULT_ROOM, isTouch } from '../constants.ts';
import { me } from '../player/player.ts';
import { remotes, getRoomId } from '../netplay/net.ts';
import { requestLock } from '../player/input.ts';
import { canvas } from '../render/scene.ts';
import { openModal, closeModal, modalOpen } from '../player/modal.ts';
import { dialogue } from '../boogler/dialogue.js';
import { registerAction, isTyping } from '../player/controls.ts';
import { renderGuide } from '../player/guide.ts';
import { glyph, inputKind } from '../player/glyphs.ts';

const TABS = [
  ['kbm', 'Keyboard'],
  ['pad', 'Gamepad'],
  ['touch', 'Touch'],
];
const LEAVE_MS = 3000;

let dlg = null;
let card = null;
let menuBtn = null;
let open = false;
let page = 'main';
let tab = 'kbm';
let leaveTimer = 0;
let peopleKey = '';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const button = (text, onClick, cls = '') => {
  const b = el('button', `pause-btn ${cls}`.trim(), text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
};

function inviteLink() {
  const id = getRoomId();
  return location.origin + location.pathname + (id === DEFAULT_ROOM ? '' : `?room=${id}`);
}

function people() {
  const out = [];
  if (me.entered) out.push({ name: me.name, colorIdx: me.colorIdx, you: true });
  for (const r of remotes.values()) if (r.entered) out.push({ name: r.name, colorIdx: r.colorIdx });
  return out;
}

function personRow(p) {
  const li = el('li', 'pause-person');
  const dot = el('span', 'pause-dot');
  dot.style.background = COLORS[p.colorIdx] ?? COLORS[0];
  li.append(dot, el('span', 'pause-name', p.name));
  if (p.you) li.append(el('span', 'pause-you', 'you'));
  return li;
}

// Fullscreen API, with the webkit names Safari on iPad still needs. The whole page goes fullscreen, so the HUD and this view stay.
const doc = document;
const fsElement = () => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
const installed = () =>
  !fsElement() &&
  (navigator.standalone === true || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
const canFullscreen = () => !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && !installed();
const fsLabel = () => (fsElement() ? 'Exit fullscreen' : 'Fullscreen');

async function toggleFullscreen(b) {
  try {
    if (fsElement()) await (doc.exitFullscreen ?? doc.webkitExitFullscreen).call(doc);
    else {
      const root = doc.documentElement;
      await (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
    }
  } catch {
    // Refused: a gamepad press is not a user gesture to the browser, so it needs a click, a tap or Enter.
    b.textContent = 'Click or tap for fullscreen';
    setTimeout(() => b.isConnected && (b.textContent = fsLabel()), 2500);
  }
}
const syncFsButton = () => {
  const b = card?.querySelector('[data-act="fullscreen"]');
  if (b) b.textContent = fsLabel();
};
doc.addEventListener('fullscreenchange', syncFsButton);
doc.addEventListener('webkitfullscreenchange', syncFsButton);

function renderMain() {
  const leave = button('Leave', () => {
    if (leaveTimer) location.reload();
    leave.textContent = 'Leave the island?';
    leave.classList.add('sure');
    leaveTimer = setTimeout(() => {
      leaveTimer = 0;
      leave.textContent = 'Leave';
      leave.classList.remove('sure');
    }, LEAVE_MS);
  });
  leave.dataset.act = 'leave';
  const resume = button('Resume', closePause, 'primary');
  resume.dataset.act = 'resume';
  const controls = button('Controls', () => show('controls'));
  controls.dataset.act = 'controls';
  const room = button('Room', () => show('room'));
  room.dataset.act = 'room';
  const list = el('div', 'pause-list');
  list.append(resume, controls, room);
  if (canFullscreen()) {
    const fs = button(fsLabel(), () => toggleFullscreen(fs));
    fs.dataset.act = 'fullscreen';
    list.append(fs);
  }
  list.append(leave);
  return list;
}

function renderControls() {
  const wrap = el('div', 'pause-page');
  const tabs = el('div', 'pause-tabs');
  tabs.setAttribute('role', 'tablist');
  for (const [kind, name] of TABS) {
    const b = button(name, () => setTab(kind), 'pause-tab');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(kind === tab));
    b.dataset.tab = kind;
    tabs.append(b);
  }
  const body = el('div', 'pause-guide');
  body.append(renderGuide(tab));
  const back = button('Back', () => show('main'), 'pause-back');
  back.dataset.act = 'back';
  const bar = el('div', 'pause-bar');
  bar.append(back, tabs);
  wrap.append(bar, body);
  return wrap;
}

function renderRoom() {
  const wrap = el('div', 'pause-page');
  const list = el('ul', 'pause-people');
  const link = el('div', 'pause-link');
  const copy = button('Copy invite link', async () => {
    try {
      await navigator.clipboard.writeText(inviteLink());
      copy.textContent = 'Copied';
      setTimeout(() => open && copy.isConnected && (copy.textContent = 'Copy invite link'), 2000);
    } catch {
      const input = el('input', 'pause-url');
      input.readOnly = true;
      input.value = inviteLink();
      link.replaceChildren(input);
      input.focus();
      input.select();
    }
  });
  copy.dataset.act = 'copy';
  const back = button('Back', () => show('main'), 'pause-back');
  back.dataset.act = 'back';
  link.append(copy);
  wrap.append(el('h2', 'pause-h', 'On the island'), list, link, back);
  fillPeople(list);
  return wrap;
}

function fillPeople(list = card.querySelector('.pause-people')) {
  if (!list) return;
  const all = people();
  list.replaceChildren(...all.map(personRow));
  peopleKey = JSON.stringify(all);
}

function show(next) {
  page = next;
  clearTimeout(leaveTimer);
  leaveTimer = 0;
  card.dataset.page = page;
  card
    .querySelector('.pause-body')
    .replaceChildren(page === 'controls' ? renderControls() : page === 'room' ? renderRoom() : renderMain());
  card.querySelector('.pause-body').scrollTop = 0;
  focusFirst();
}

function setTab(kind) {
  tab = kind;
  const old = card.querySelector('.pause-page');
  const fresh = renderControls();
  old.replaceWith(fresh);
  fresh.querySelector(`[data-tab="${kind}"]`).focus({ preventScroll: true });
}

const stops = () => {
  const all = [...card.querySelectorAll('.pause-body button, .pause-body input')];
  // The tabs are one stop (left and right pick one), so up and down go to Back.
  return page === 'controls'
    ? all.filter((b) => !b.matches('.pause-tab') || b.getAttribute('aria-selected') === 'true')
    : all;
};
function focusFirst() {
  const target =
    card.querySelector('[data-act="resume"]') ?? card.querySelector('[aria-selected="true"]') ?? stops()[0];
  target?.focus({ preventScroll: true });
}
function move(dir) {
  const list = stops();
  if (!list.length) return;
  const k = list.indexOf(document.activeElement);
  list[k < 0 ? (dir > 0 ? 0 : list.length - 1) : (k + dir + list.length) % list.length].focus({ preventScroll: true });
}
function moveTab(dir) {
  if (page !== 'controls') return;
  const k = TABS.findIndex(([kind]) => kind === tab);
  setTab(TABS[(k + dir + TABS.length) % TABS.length][0]);
}

function onKey(e) {
  if (e.code === 'Escape') {
    e.preventDefault();
    if (page !== 'main') show('main');
  } else if (e.code === 'KeyH') {
    e.preventDefault();
    if (!e.repeat) closePause();
  } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    move(-1);
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
    e.preventDefault();
    move(1);
  } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
    if (page === 'controls') {
      e.preventDefault();
      moveTab(e.code === 'ArrowLeft' ? -1 : 1);
    }
  }
}

function onPad(slot) {
  if (slot === 'up') move(-1);
  else if (slot === 'down') move(1);
  else if (slot === 'left') moveTab(-1);
  else if (slot === 'right') moveTab(1);
  else if (slot === 'a') document.activeElement?.closest?.('.pause button')?.click();
  else if (slot === 'b') page === 'main' ? closePause() : show('main');
  else if (slot === 'menu') closePause();
}

function build() {
  dlg = el('dialog', 'pause');
  const dim = el('div', 'pause-dim');
  card = el('div', 'pause-card');
  const head = el('header', 'pause-head');
  head.append(el('h1', 'pause-title'), el('p', 'pause-sub', "The island keeps going while you're here"));
  card.append(head, el('div', 'pause-body'));
  dlg.append(dim, card);
  document.body.append(dlg);
  dlg.addEventListener('cancel', (e) => e.preventDefault());
  // A browser may close the dialog on its own (repeated Esc): never leave a half-open menu behind.
  dlg.addEventListener('close', () => {
    if (!open || dlg.open) return; // a close we asked for, or the view already reopened
    open = false;
    closeModal();
  });
  card.addEventListener('focusin', (e) => {
    for (const b of card.querySelectorAll('[data-focus]')) delete b.dataset.focus;
    if (e.target.matches?.('button, input')) e.target.dataset.focus = '1';
  });
}

export function openPause(start = 'main') {
  if (!me.entered || open) return false;
  if (!dlg) build();
  if (!openModal({ onKey, onPad })) return false;
  open = true;
  tab = inputKind();
  card.querySelector('.pause-title').textContent = getRoomId();
  dlg.showModal(); // after openModal: its setPadModal keeps gamepad.js from pulling focus off the buttons
  show(start);
  return true;
}

export function closePause() {
  if (!open) return;
  open = false;
  clearTimeout(leaveTimer);
  leaveTimer = 0;
  dlg.close();
  closeModal();
  if (inputKind() === 'kbm' && !document.pointerLockElement) requestLock();
  canvas.focus({ preventScroll: true });
}

registerAction('pause', {
  pad: 'menu',
  label: 'Menu and controls',
  keys: ['Escape', 'KeyH'],
  group: 'menu',
  down: () => openPause(),
});

// Capture phase on window, registered after src/player/modal.ts: H opens the controls, Esc (when the browser sends it, the
// pointer is not locked) the menu. The game's own key handlers never see these keys.
addEventListener(
  'keydown',
  (e) => {
    if ((e.code !== 'KeyH' && e.code !== 'Escape') || e.repeat || modalOpen() || !me.entered) return;
    if (e.code === 'Escape' && dialogue.open) return; // Esc walks away from the talk; H opens this over it (and ends it)
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
    if (openPause(e.code === 'KeyH' ? 'controls' : 'main')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  { capture: true },
);

// Esc ends the pointer lock: that is the way in on a desktop. This view releases the lock after it marks itself open
// (openModal), so it does not trigger it; during a talk, losing the lock ends the talk instead (src/boogler/dialogue.js).
let wasLocked = false;
document.addEventListener('pointerlockchange', () => {
  const locked = !!document.pointerLockElement;
  if (wasLocked && !locked && me.entered && !modalOpen() && !dialogue.open && !isTouch) openPause();
  wasLocked = locked;
});

onStart(() => {
  menuBtn = el('button', 'menu-btn');
  menuBtn.type = 'button';
  menuBtn.setAttribute('aria-label', 'Menu and controls');
  menuBtn.innerHTML =
    '<svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" ' +
    'stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>' +
    '<span class="menu-glyph"></span>';
  menuBtn.addEventListener('click', () => openPause());
  const tr = document.querySelector('.hud-tr') ?? document.body;
  tr.append(menuBtn);
  let kind = '';
  onFrame(
    () => {
      const k = inputKind();
      if (k !== kind) {
        kind = k;
        menuBtn.querySelector('.menu-glyph').innerHTML = glyph('pause');
      }
      if (open && page === 'room' && JSON.stringify(people()) !== peopleKey) fillPeople();
    },
    { phase: 'late' },
  );
});
