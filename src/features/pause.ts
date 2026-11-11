// The pause view: a local overlay with Resume, Controls (the generated guide, src/player/guide.ts; on the Gamepad tab a
// drawn controller with a set per situation, src/player/pad-diagram.ts, or the list), Room (who is here, an invite link,
// and You: your name and colour, src/player/you-editor.ts) and Leave (out to the menu page, with the game stopped).
// The island keeps running behind it (DESIGN.md: a Local feature, never stops the frame loop); it only takes this
// player's input through src/player/modal.ts. Opens on Esc (the pointer lock ends), H (on the controls),
// Menu on a gamepad and the corner menu button.
// Options (the main list) has mute and fullscreen icons unless a start page has mute; the volume slider lives on More.
// Fullscreen is a toggle on the main page, shown only where the page can go fullscreen and is not already an installed
// fullscreen app: desktop browsers, Android and iPad; not iPhone Safari (no element fullscreen) or a frame without it.
import './pause.css';
import { WORLD_NS } from '../world/namespace.ts';
import { BUILD } from '../build-id.ts';
import { onStart } from '../loop.ts';
import { background } from '../async.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { COLORS } from '../constants.ts';
import { inputState } from '../player/input-state.ts';
import { me } from '../player/player.ts';
import { dom } from '../player/dom.ts';
import { remotes, getRoomId } from '../netplay/net.ts';
import { requestLock } from '../player/input.ts';
import { canvas } from '../render/scene.ts';
import { openModal, closeModal, modalOpen } from '../player/modal.ts';
import { conversation } from '../player/conversation.ts';
import { registerAction, onMenuKey, menuSlot } from '../player/controls.ts';
import type { MenuPress } from '../player/controls.ts';
import { renderGuide, type GuideKind } from '../player/guide.ts';
import { renderPadDiagram, padContexts } from '../player/pad-diagram.ts';
import { glyph, inputKind, padGlyph } from '../player/glyphs.ts';
import { youEditor } from '../player/you-editor.ts';
import { freshButton } from '../player/fresh-button.ts';
import { backToSpawn } from '../entities/player/state.ts';
import { protoOn, roomInviteQuery, productionRailway } from '../proto/flags.ts';
import { getRailwayUnstuck } from '../entities/railway/state.ts';
import { carry } from '../physics/platforms.ts';
import { forgetInRoom, leaveIsland, SPOT_KEY } from '../player/arrival.ts';
import { getVolume, isMuted, setMuted, setVolume } from '../render/audio.ts';
import { uiSound } from '../ui/ui-sound.ts';
import { pausePages, pauseNavigation, pauseSections, startPage } from '../player/pause-pages.ts';
import { devCursorFree } from '../player/dev-input.ts';
import { tuningVisit } from '../dev-preferences.ts';

const TABS: [GuideKind, string][] = [
  ['kbm', 'Keyboard'],
  ['pad', 'Gamepad'],
  ['touch', 'Touch'],
];
const LEAVE_MS = 3000;
// Sections a prototype adds to the Room page, above You.
const roomExtras: (() => HTMLElement)[] = [];

// Built on first open (build) and at start (the menu button); used only after.
let dlg!: HTMLDialogElement;
let card!: HTMLElement;
let menuBtn!: HTMLButtonElement;
let open = false;
type Page = string;
const OPTIONS = 'options';
let page: Page = OPTIONS;
// The page Pause opens on instead of Options (the wardrobe's You, once you own something to wear), or null. It carries
// the roster, the connection pill and mute; Options carries the rest. Esc and RB cross between the two.
let startId: string | null = null;
let disposePage = () => {};
let tab: GuideKind = 'kbm';
// The Gamepad tab: the drawn controller (src/player/pad-diagram.ts) for one situation, or the list.
let padView: 'diagram' | 'list' = 'diagram';
let padCtx = 'foot';
let leaveTimer: ReturnType<typeof setTimeout> | 0 = 0;
let peopleKey = '';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const button = (text: string, onClick: () => void | Promise<void>, cls = '') => {
  const b = el('button', `pause-btn ${cls}`.trim(), text);
  b.type = 'button';
  b.addEventListener('click', () => {
    const task = onClick();
    if (task) background(task, 'pause action');
  });
  return b;
};

function inviteLink() {
  return location.origin + location.pathname + roomInviteQuery(getRoomId(), location.search);
}

type Person = { name: string; colorIdx: number; you?: boolean };
function people() {
  const out: Person[] = [];
  if (me.entered) out.push({ name: me.name, colorIdx: me.colorIdx, you: true });
  for (const r of remotes.values()) if (r.entered) out.push({ name: r.name, colorIdx: r.colorIdx });
  return out;
}

function personRow(p: Person) {
  const li = el('li', 'pause-person');
  const dot = el('span', 'pause-dot');
  dot.style.background = COLORS[p.colorIdx] ?? COLORS[0]!;
  li.append(dot, el('span', 'pause-name', p.name));
  if (p.you) li.append(el('span', 'pause-you', 'you'));
  return li;
}

// Fullscreen API, with the webkit names Safari on iPad still needs. The whole page goes fullscreen, so the HUD and this view stay.
// The webkit names (not in the DOM types).
const doc = document as Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void>;
};
const nav = navigator as Navigator & { standalone?: boolean };
const fsElement = () => doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
const installed = () =>
  !fsElement() &&
  (nav.standalone === true || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches);
const canFullscreen = () => !!(doc.fullscreenEnabled || doc.webkitFullscreenEnabled) && !installed();
const fsLabel = () => (fsElement() ? 'Exit fullscreen' : 'Fullscreen');

async function toggleFullscreen(b: HTMLElement) {
  try {
    if (fsElement()) await (doc.exitFullscreen ?? doc.webkitExitFullscreen).call(doc);
    else {
      const root = doc.documentElement as HTMLElement & { webkitRequestFullscreen?: HTMLElement['requestFullscreen'] };
      await (root.requestFullscreen ?? root.webkitRequestFullscreen).call(root, { navigationUI: 'hide' });
    }
  } catch {
    // Refused: a gamepad press is not a user gesture to the browser, so it needs a click, a tap or Enter.
    const message = 'Click or tap for fullscreen';
    setFsLabel(b, message);
    const note = el('p', 'pause-note', message);
    note.setAttribute('role', 'status');
    card.querySelector('.pause-head')?.append(note);
    setTimeout(() => {
      note.remove();
      if (b.isConnected) setFsLabel(b, fsLabel());
    }, 2500);
  }
}
// Safari on iPad goes fullscreen without the keyboard: WebKit grants element fullscreen there only with keyboard access
// off (WebFullScreenManager::supportsFullScreenForElement, `!withKeyboard` off the desktop idiom), and then drops every key
// but Space, the arrows, Tab, Enter and the modifiers before the page sees it (EventHandler::isKeyEventAllowedInFullScreen).
// W A S D, E, R, H, the digits and Esc all go dead, which is what a Magic Keyboard player met. WebKit bug 311151 also stops
// a pad's shoulders and triggers (LB, RB, LT, RT) in fullscreen. So on iPad the first press explains and offers the Home
// Screen web app, which opens standalone without the Fullscreen API; a second press goes fullscreen anyway, for touch
// (research/cross-device-input.md rec 5). The iPad's Safari says it is a Mac, so it is told apart by its touch points;
// this names a platform limit, not a feature to detect.
const iPadOS = () => /Macintosh|iPad/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
const FS_IPAD_NOTE =
  'Safari’s fullscreen on iPad turns off the keyboard’s letter keys and a controller’s shoulder buttons. For a full screen that keeps every control, use Share → Add to Home Screen and play from there.';
function fullscreenButton() {
  let warned = false;
  const fs = button(
    '',
    () => {
      if (!fsElement() && !warned && iPadOS()) {
        warned = true;
        const note = el('p', 'pause-note', FS_IPAD_NOTE);
        note.setAttribute('role', 'status');
        card.querySelector('.pause-head')!.append(note);
        setFsLabel(fs, 'Fullscreen anyway (touch only)');
        return;
      }
      void toggleFullscreen(fs); // refusal already updates this button
    },
    'pause-icon',
  );
  fs.dataset.act = 'fullscreen';
  fs.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="pause-icon-label"></span>';
  setFsLabel(fs, fsLabel());
  return fs;
}
function setFsLabel(b: HTMLElement, label: string) {
  b.setAttribute('aria-label', label);
  b.querySelector('.pause-icon-label')!.textContent = label;
}
const syncFsButton = () => {
  const b = card?.querySelector<HTMLElement>('[data-act="fullscreen"]');
  if (b) setFsLabel(b, fsLabel());
};
doc.addEventListener('fullscreenchange', syncFsButton);
doc.addEventListener('webkitfullscreenchange', syncFsButton);

const SPEAKER = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>';
const WAVES =
  '<path d="M15 9a4.2 4.2 0 0 1 0 6M17.6 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
const CROSS =
  '<path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>';
// The mute button and volume slider: every sound in the game (src/render/audio.ts).
function volumeSlider() {
  const slider = el('input', 'pause-volume');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1';
  slider.step = '0.05';
  slider.setAttribute('aria-label', 'Volume');
  function sync() {
    slider.value = String(isMuted() ? 0 : getVolume());
  }
  slider.addEventListener('input', () => {
    if (isMuted()) setMuted(false);
    setVolume(Number(slider.value));
    sync();
  });
  slider.addEventListener('change', () => uiSound('tick')); // hear the level you landed on
  sync();
  return slider;
}
function muteButton() {
  const mute = button(
    '',
    () => {
      setMuted(!isMuted());
      sync();
      if (!isMuted()) uiSound('tick');
    },
    'pause-icon',
  );
  mute.dataset.act = 'mute';
  function sync() {
    const off = isMuted() || getVolume() === 0;
    mute.setAttribute('aria-label', isMuted() ? 'Unmute' : 'Mute');
    mute.setAttribute('aria-pressed', String(isMuted()));
    mute.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${SPEAKER}${off ? CROSS : WAVES}</svg>`;
  }
  sync();
  return mute;
}
// Left and right on a pad move the slider.
function nudgeVolume(dir: number) {
  const slider = document.activeElement;
  if (!(slider instanceof HTMLInputElement) || slider.type !== 'range') return false;
  slider.value = String(Number(slider.value) + dir * 0.1);
  slider.dispatchEvent(new Event('input'));
  slider.dispatchEvent(new Event('change'));
  return true;
}

function renderOptions() {
  const leave = button(
    'Leave',
    () => {
      if (leaveTimer) leaveIsland();
      leave.textContent = 'Leave the island?';
      leave.classList.add('sure');
      leaveTimer = setTimeout(() => {
        leaveTimer = 0;
        leave.textContent = 'Leave';
        leave.classList.remove('sure');
      }, LEAVE_MS);
    },
    'pause-leave',
  );
  leave.dataset.act = 'leave';
  const resume = button('Resume', closePause, 'primary');
  resume.dataset.act = 'resume';
  const controls = button('Controls', () => show('controls'));
  controls.dataset.act = 'controls';
  const room = button('Room', () => show('room'));
  room.dataset.act = 'room';
  const more = button('More', () => show('more'));
  more.dataset.act = 'more';
  const list = el('div', 'pause-list');
  if (!startId) {
    const identity = el('div', 'pause-identity');
    identity.append(dom.rosterEl, dom.netEl);
    list.append(identity);
  }
  list.append(...pauseSections, resume);
  if (startId) {
    const back = button('Back', () => show(startId!), 'pause-back');
    back.dataset.act = 'back';
    list.append(back);
  }
  list.append(
    controls,
    button('Graphics', () => show('graphics')),
    room,
    more,
    leave,
    el('p', 'pause-version', `World ${WORLD_NS} · ${BUILD.slice(0, 7)}`),
  );
  return list;
}

function renderMore() {
  const list = el('div', 'pause-page');
  // Get unstuck: one press, nothing lost. A saved spot you were stuck in mustn't bring you back there.
  if (!inputState.seated) {
    const unstuck = button('Get unstuck', async () => {
      if (me.body) {
        if (productionRailway) getRailwayUnstuck();
        else if (protoOn('place')) (await import('../proto/place/index.ts')).getUnstuck();
        else backToSpawn();
        carry.x = carry.z = 0;
        forgetInRoom(getRoomId(), SPOT_KEY);
      }
      closePause();
    });
    unstuck.dataset.act = 'unstuck';
    list.append(unstuck);
  }
  const sound = el('div', 'pause-sound');
  sound.append(el('span', '', 'Volume'), volumeSlider());
  list.append(...freshButton(), sound);
  for (const extra of pausePages)
    if (extra.id !== 'graphics' && !extra.start)
      list.append(button(extra.label, () => (extra.open ? extra.open() : show(extra.id))));
  const back = button('Back', () => show(OPTIONS), 'pause-back');
  back.dataset.act = 'back';
  list.append(back);
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
  const diagram = tab === 'pad' && padView === 'diagram';
  body.append(diagram ? renderPadDiagram(padCtx) : renderGuide(tab));
  const back = button('Back', () => show(OPTIONS), 'pause-back');
  back.dataset.act = 'back';
  const bar = el('div', 'pause-bar');
  bar.append(back, tabs);
  wrap.append(bar);
  if (tab === 'pad') wrap.append(padBar(diagram));
  wrap.append(body);
  return wrap;
}

// Above the gamepad diagram: one chip per situation (LB and RB cycle them on the pad) and the list toggle.
function padBar(diagram: boolean) {
  const bar = el('div', 'pause-padbar');
  if (diagram) {
    const ctx = el('div', 'pause-ctxs');
    ctx.setAttribute('role', 'tablist');
    for (const [id, title] of padContexts()) {
      const b = button(title, () => setCtx(id), 'pause-ctx');
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(id === padCtx));
      b.dataset.ctx = id;
      ctx.append(b);
    }
    if (inputKind() === 'pad') {
      const hint = el('span', 'pause-ctx-hint');
      hint.innerHTML = `${padGlyph('lb')}${padGlyph('rb')}`;
      ctx.prepend(hint);
    }
    bar.append(ctx);
  }
  const view = button(diagram ? 'Show as a list' : 'Show the controller', () => {
    padView = diagram ? 'list' : 'diagram';
    rerender('[data-act="pad-view"]');
  });
  view.dataset.act = 'pad-view';
  bar.append(view);
  return bar;
}
function setCtx(id: string) {
  padCtx = id;
  rerender(`[data-ctx="${id}"]`);
}
function cycleCtx(dir: number) {
  if (page !== 'controls' || tab !== 'pad' || padView !== 'diagram') return;
  const ids = padContexts().map(([id]) => id);
  setCtx(ids[(ids.indexOf(padCtx) + dir + ids.length) % ids.length]!);
}
function rerender(focus: string) {
  const fresh = renderControls();
  card.querySelector('.pause-page')!.replaceWith(fresh);
  fresh.querySelector<HTMLElement>(focus)?.focus({ preventScroll: true });
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
  const back = button('Back', () => show(OPTIONS), 'pause-back');
  back.dataset.act = 'back';
  link.append(copy);
  wrap.append(
    el('h2', 'pause-h', 'On the island'),
    list,
    link,
    ...roomExtras.map((part) => part()),
    youEditor({ colour: !startId }),
    back,
  );
  fillPeople(list);
  return wrap;
}

function fillPeople(list = card.querySelector('.pause-people')) {
  if (!list) return;
  const all = people();
  list.replaceChildren(...all.map(personRow));
  peopleKey = JSON.stringify(all);
}

function show(next: Page) {
  disposePage();
  disposePage = () => {};
  page = next;
  clearTimeout(leaveTimer);
  leaveTimer = 0;
  card.dataset.page = dlg.dataset.page = page;
  const head = card.querySelector<HTMLElement>('.pause-head')!;
  head.querySelector('.pause-actions')?.remove();
  head.querySelector('.pause-note')?.remove();
  head.querySelector(':scope > .pause-identity')?.remove();
  const onStart = page === startId;
  const mute = onStart || (page === OPTIONS && !startId);
  const fullscreen = page === OPTIONS && canFullscreen();
  head.classList.toggle('has-actions', mute || fullscreen);
  if (onStart) {
    // The roster and the connection pill: Pause's first page keeps them (5 November), in a compact row.
    const identity = el('div', 'pause-identity');
    identity.append(dom.rosterEl, dom.netEl);
    head.append(identity);
  }
  if (mute || fullscreen) {
    const actions = el('div', 'pause-actions');
    if (mute) actions.append(muteButton());
    if (fullscreen) actions.append(fullscreenButton());
    head.append(actions);
  }
  const body = card.querySelector<HTMLElement>('.pause-body')!;
  const extra = pausePages.find((entry) => entry.id === page);
  if (extra) {
    body.replaceChildren();
    disposePage = extra.mount(body, closePause);
  } else
    body.replaceChildren(
      page === 'controls'
        ? renderControls()
        : page === 'room'
          ? renderRoom()
          : page === 'more'
            ? renderMore()
            : renderOptions(),
    );
  body.scrollTop = 0;
  focusFirst();
}

function setTab(kind: GuideKind) {
  tab = kind;
  rerender(`[data-tab="${kind}"]`);
}

const stops = () => {
  const all = [
    ...card.querySelectorAll<HTMLElement>(
      '.pause-body button:not(:disabled), .pause-body input, .pause-body textarea, .pause-body summary, .pause-body select',
    ),
    ...card.querySelectorAll<HTMLElement>('.pause-head .pause-actions button'),
  ].filter((target) => {
    // Chromium can retain layout rects for descendants of a closed details element. Only its direct summary
    // participates in focus navigation; an inner summary is still hidden when an outer details is closed.
    for (let details = target.closest('details'); details; details = details.parentElement?.closest('details') ?? null)
      if (!details.open && details.querySelector(':scope > summary') !== target) return false;
    return (
      !target.matches(':disabled, [data-nostop]') &&
      [...target.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0)
    );
  });
  // The tabs are one stop (left and right pick one; LB and RB the situation), so up and down go to Back.
  return page === 'controls'
    ? all.filter((b) => !b.matches('.pause-tab, .pause-ctx') || b.getAttribute('aria-selected') === 'true')
    : all;
};
function focusFirst() {
  // Resume first with a keyboard and mouse (only a Resume click takes the pointer lock back); with a pad or a touch
  // there is nothing to relock, so the start page's first row is where the hand is.
  const row = page === startId && inputKind() !== 'kbm' ? stops().find((b) => b.closest('[data-cycle]')) : undefined;
  const target =
    row ??
    card.querySelector<HTMLElement>('[data-act="resume"]') ??
    (page === 'place-debug' ? card.querySelector<HTMLElement>('.pause-back') : null) ??
    card.querySelector<HTMLElement>('[aria-selected="true"]') ??
    stops()[0];
  target?.focus({ preventScroll: true });
}
function move(dir: number) {
  const list = stops();
  if (!list.length) return;
  const k = list.indexOf(document.activeElement as HTMLElement);
  const target = list[k < 0 ? (dir > 0 ? 0 : list.length - 1) : (k + dir + list.length) % list.length]!;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest' });
}
function moveTab(dir: number) {
  if (page !== 'controls') return;
  const k = TABS.findIndex(([kind]) => kind === tab);
  setTab(TABS[(k + dir + TABS.length) % TABS.length]![0]);
}

// Where back goes: More from Place's debug page, the start page from Options (when there is one), else Options.
const parentPage = () => (page === 'place-debug' ? 'more' : page === OPTIONS && startId ? startId : OPTIONS);
// Left and right on a focused row (a slot, the colours) step it; the page owns what that means.
function cycleRow(dir: number) {
  const row = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('.pause-body [data-cycle]');
  if (!row) return false;
  row.dispatchEvent(new CustomEvent('cycle', { detail: dir }));
  return true;
}

function onKey(e: MenuPress) {
  const onSlider = (e.target as Element | null)?.matches?.('input[type="range"]');
  if (e.key !== 'back' && e.typing && !onSlider) return; // the Room page's name box
  if (e.key === 'back') {
    e.preventDefault();
    // Esc can't relock, so on the start page it is free to open Options; Options goes back to it.
    if (page === startId) show(OPTIONS);
    else if (page !== OPTIONS || startId) show(parentPage());
  } else if (e.key === 'help') {
    e.preventDefault();
    if (!e.repeat) closePause();
  } else if (e.key === 'up') {
    e.preventDefault();
    move(-1);
  } else if (e.key === 'down') {
    e.preventDefault();
    move(1);
  } else if (e.key === 'left' || e.key === 'right') {
    if (cycleRow(e.key === 'left' ? -1 : 1)) e.preventDefault();
    else if (page === 'controls') {
      e.preventDefault();
      moveTab(e.key === 'left' ? -1 : 1);
    }
  }
}

function onPad(slot: string) {
  if (slot === 'up') move(-1);
  else if (slot === 'down') move(1);
  else if (slot === 'left' || slot === 'right') {
    const dir = slot === 'left' ? -1 : 1;
    if (!cycleRow(dir) && !nudgeVolume(dir)) moveTab(dir);
  } else if (slot === 'rb' && page === startId) show(OPTIONS);
  else if (slot === 'lb' || slot === 'rb') cycleCtx(slot === 'lb' ? -1 : 1);
  else if (slot === menuSlot('confirm')) document.activeElement?.closest<HTMLElement>('.pause button')?.click();
  else if (slot === menuSlot('back')) {
    if (page === startId || (page === OPTIONS && !startId)) closePause();
    else show(parentPage());
  } else if (slot === 'menu') closePause();
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
    disposePage();
    disposePage = () => {};
    closeModal();
  });
  card.addEventListener('focusin', (e) => {
    for (const b of card.querySelectorAll<HTMLElement>('[data-focus]')) delete b.dataset.focus;
    const t = e.target as HTMLElement;
    if (t.matches?.('button, input')) t.dataset.focus = '1';
  });
}

export function openPause(start?: Page) {
  if (!me.entered || open) return false;
  if (!dlg) build();
  if (!openModal({ onKey, onPad })) return false;
  open = true;
  tab = inputKind();
  padCtx = 'foot';
  card.querySelector('.pause-title')!.textContent = getRoomId();
  dlg.showModal(); // after openModal: its setPadModal keeps gamepad.ts from pulling focus off the buttons
  startId = startPage()?.id ?? null;
  // The dim fades between pages (none on You), not on open: skip the fade from the page left last time.
  const dim = dlg.querySelector<HTMLElement>('.pause-dim')!;
  dim.style.transition = 'none';
  show(start ?? startId ?? OPTIONS);
  void getComputedStyle(dim).backgroundColor;
  dim.style.transition = '';
  return true;
}

export function closePause() {
  if (!open) return;
  open = false;
  disposePage();
  disposePage = () => {};
  clearTimeout(leaveTimer);
  leaveTimer = 0;
  dlg.close();
  closeModal();
  if (inputKind() === 'kbm' && !document.pointerLockElement) requestLock();
  canvas.focus({ preventScroll: true });
}

pauseNavigation.open = (next) => {
  if (open) {
    show(next);
    return true;
  }
  return openPause(next);
};
pauseNavigation.close = closePause;

registerAction('pause', {
  pad: 'menu',
  label: 'Menu and controls',
  keys: ['Escape', 'KeyH'],
  group: 'menu',
  down: () => openPause(),
});

// Capture phase on window, registered after src/player/modal.ts: H opens the controls, Esc (when the browser sends it, the
// pointer is not locked) the menu. The game's own key handlers never see these keys.
onMenuKey((e) => {
  if ((e.key !== 'help' && e.key !== 'back') || e.repeat || modalOpen() || !me.entered) return;
  if (e.key === 'back' && conversation.open) return; // Esc walks away from the talk; H opens this over it (and ends it)
  if (e.modified || e.typing) return;
  if (openPause(e.key === 'help' ? 'controls' : undefined)) {
    e.preventDefault();
    e.stop();
  }
});

// Esc ends the pointer lock: that is the way in on a desktop. This view releases the lock after it marks itself open
// (openModal), so it does not trigger it; during a talk, losing the lock ends the talk instead (src/player/conversation.ts).
let wasLocked = false;
document.addEventListener('pointerlockchange', () => {
  const locked = !!document.pointerLockElement;
  if (
    wasLocked &&
    !locked &&
    me.entered &&
    !modalOpen() &&
    !conversation.open &&
    !tuningVisit &&
    !devCursorFree() &&
    inputKind() !== 'touch'
  )
    openPause();
  wasLocked = locked;
});

defineKind('pause', { lateUpdate: 0 });

onStart(() => {
  // These live elements keep their existing updates, now inside Pause instead of the play view.
  dom.rosterEl.remove();
  dom.netEl.remove();
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
  spawn({
    kind: 'pause',
    lateUpdate() {
      const k = inputKind();
      if (k !== kind) {
        kind = k;
        menuBtn.querySelector('.menu-glyph')!.innerHTML = glyph('pause')!;
      }
      if (open && page === 'room' && JSON.stringify(people()) !== peopleKey) fillPeople();
    },
  });
});
