// The talk box: The Boogler's line typed out, your answers as buttons (or number keys; a gift answer shows the gift),
// the friendship meter, his portrait to pet (pad Y), and a close button (Escape, E, pad B). Not a modal: the game keeps
// playing while it is open (move keys, stick, mouse look, jump), so walking off ends the talk (src/boogler/play.ts). It
// takes only the keys and pad buttons it answers with, and leaves the pointer lock alone.
import { reducedMotion } from '../constants.ts';
import { setPadGrab } from '../player/controls.ts';
import { modalOpen } from '../player/modal.ts';
import { heartsText } from './friendship.ts';
import { boogler } from './boogler.ts';
import { GIFTS } from '../sim/gift-catalog.ts';
import { setIcon } from '../player/item-icons.ts';
import { glyph } from '../player/glyphs.ts';

const CHARS_PER_S = 48;
const REACT_MS = 1500;
const MOUTHS = {
  smile:
    '<path d="M17.6 22.4 Q20 24.6 22.4 22.4" stroke="#1d1640" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
  joy: '<path d="M17 21.9 Q20 26.4 23 21.9 Z" fill="#1d1640"/>',
  grump:
    '<path d="M17.8 23.8 Q20 21.9 22.2 23.8" stroke="#1d1640" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
  worry:
    '<path d="M17.4 23 Q18.6 22.2 19.6 23 Q20.6 23.8 21.6 23 Q22.4 22.4 22.8 23" stroke="#1d1640" stroke-width="1" fill="none" stroke-linecap="round"/>',
};
// His portrait, in the talk box with the mood's mouth.
export const portrait = (mood: string) => `
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <ellipse cx="11" cy="28.5" rx="5" ry="3" fill="#6c4fd1"/>
    <ellipse cx="29" cy="28.5" rx="5" ry="3" fill="#6c4fd1"/>
    <circle cx="4.5" cy="21" r="3.6" fill="#b99cff"/>
    <circle cx="35.5" cy="21" r="3.6" fill="#b99cff"/>
    <ellipse cx="20" cy="21" rx="15" ry="6.5" fill="#b99cff"/>
    <ellipse cx="15.5" cy="19.6" rx="1.4" ry="1.9" fill="#1d1640"/>
    <ellipse cx="24.5" cy="19.6" rx="1.4" ry="1.9" fill="#1d1640"/>
    ${(MOUTHS as Record<string, string>)[mood] ?? MOUTHS.smile}
  </svg>`;

const HAND = `
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M5 10V5.2a1.4 1.4 0 0 1 2.8 0V9V3.6a1.4 1.4 0 0 1 2.8 0V9V4.4a1.4 1.4 0 0 1 2.8 0v5.1V6.6a1.4 1.4 0 0 1 2.8 0V12a6 6 0 0 1-6 6h-.6a5 5 0 0 1-4-2l-3.3-3.7a1.4 1.4 0 0 1 2.2-1.8Z"
      fill="#ffe3c7" stroke="#13243f" stroke-width="1.5" stroke-linejoin="round" />
  </svg>`;
const CROSS = `<svg class="bd-x" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg>`;

const MARKUP = `
  <div class="bd-wrap">
    <div class="bd-pop" hidden><div class="bd-pop-text"></div></div>
    <div class="bd-card" role="dialog" aria-modal="true" aria-labelledby="bd-name">
      <div class="bd-head">
        <button type="button" class="bd-face" aria-label="Pet The Boogler" title="Pet">
          <span class="bd-face-svg"></span><span class="bd-pet"></span>
        </button>
        <span class="bd-name" id="bd-name">The Boogler</span>
        <span class="bd-bond">
          <span class="bd-hearts" aria-hidden="true"></span>
          <span class="bd-level"></span>
          <span class="bd-bar" aria-hidden="true"><i></i></span>
        </span>
        <button type="button" class="bd-close" aria-label="Leave" title="Leave"></button>
      </div>
      <p class="bd-say" aria-live="polite"></p>
      <div class="bd-opts" role="group" aria-label="Your answer"></div>
    </div>
  </div>`;

/** What the talk box shows (src/boogler/talk.ts talkView). */
export type DialogueView = { say: string; mood: string; opts: string[]; gifts?: number[] };
export type Bond = { level: number; name: string; frac: number };
type Dom = Record<
  | 'wrap'
  | 'faceBtn'
  | 'face'
  | 'pet'
  | 'close'
  | 'pop'
  | 'popText'
  | 'hearts'
  | 'level'
  | 'bond'
  | 'bar'
  | 'say'
  | 'opts',
  HTMLElement
> & { root: HTMLElement };
type Current = {
  text: string;
  shown: number;
  at: number;
  mood: string;
  onPick: (i: number) => void;
  onClose?: () => void;
  onPet?: () => void;
  opts: string[];
  typing: boolean;
};
export const dialogue = { open: false };
let el: Dom | null = null;
let cur: Current | null = null;
const react = { until: 0 };

function dom(): Dom {
  if (el) return el;
  const root = document.createElement('div');
  root.className = 'bd';
  root.hidden = true;
  root.innerHTML = MARKUP;
  document.body.append(root);
  const q = (c: string) => root.querySelector(c) as HTMLElement; // in MARKUP
  const d: Dom = (el = {
    root,
    wrap: q('.bd-wrap'),
    faceBtn: q('.bd-face'),
    face: q('.bd-face-svg'),
    pet: q('.bd-pet'),
    close: q('.bd-close'),
    pop: q('.bd-pop'),
    popText: q('.bd-pop-text'),
    hearts: q('.bd-hearts'),
    level: q('.bd-level'),
    bond: q('.bd-bond'),
    bar: q('.bd-bar i'),
    say: q('.bd-say'),
    opts: q('.bd-opts'),
  });
  // Only the card takes taps and clicks (boogler.css); the joystick and the canvas work around it.
  d.wrap.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (cur?.typing && !(e.target as Element | null)?.closest('button')) finishTyping();
  });
  d.wrap.addEventListener('contextmenu', (e) => e.preventDefault());
  // On a desktop, Escape with the pointer locked only ends the lock (the page never sees the key): that ends the talk.
  // Added on first use, after src/features/pause.ts's own listener, which skips the pause view while a talk is open.
  document.addEventListener('pointerlockchange', () => {
    if (!document.pointerLockElement && !document.body.classList.contains('touch')) cur?.onClose?.();
  });
  d.faceBtn.addEventListener('click', () => cur?.onPet?.());
  d.close.addEventListener('click', () => cur?.onClose?.());
  return d;
}

function finishTyping() {
  if (!cur) return;
  cur.typing = false;
  cur.shown = cur.text.length;
  const d = dom();
  d.say.textContent = cur.text;
  boogler.me.speaking = false;
  d.opts.hidden = false;
}

function choose(i: number) {
  if (!cur || cur.typing || i < 0 || i >= cur.opts.length) return;
  cur.onPick(i);
}

const focusedBtn = () => (document.activeElement?.closest?.('.bd button') as HTMLButtonElement | null) ?? null;
function moveFocus(dir: number) {
  const btns = [...dom().opts.querySelectorAll('button')];
  const k = btns.indexOf(document.activeElement as HTMLButtonElement);
  const next = k < 0 ? (dir > 0 ? 0 : btns.length - 1) : (k + dir + btns.length) % btns.length;
  btns[next]?.focus({ preventScroll: true });
}

// D-pad picks an answer, A or X skips the typing and then says it, Y pets him, B walks away. With no answer picked
// yet, A picks the first one rather than saying it. The stick and the other buttons stay with the game.
const PAD_SLOTS = ['a', 'b', 'x', 'y', 'up', 'down'];
function padPress(slot: string) {
  if (!cur) return;
  if (slot === 'b') cur.onClose?.();
  else if (slot === 'y') cur.onPet?.();
  else if (slot === 'up' || slot === 'down') moveFocus(slot === 'down' ? 1 : -1);
  else if (slot === 'a' || slot === 'x') {
    if (cur.typing) finishTyping();
    else if (focusedBtn()) focusedBtn()!.click();
    else moveFocus(1);
  }
}

// view: { say, mood, opts, gifts? } (gifts[i]: the catalog index answer i hands over); bond: { level, name, frac };
// onPick(i) answers; onClose() runs on Escape and the close button; onPet() on the portrait.
export function showDialogue(
  view: DialogueView,
  bond: Bond,
  onPick: (i: number) => void,
  onClose?: () => void,
  onPet?: () => void,
) {
  const d = dom();
  const opening = !dialogue.open;
  if (opening && modalOpen()) return; // the pause view is up
  if (opening) setPadGrab(padPress, PAD_SLOTS);
  dialogue.open = true;
  d.root.hidden = false;
  if (opening) {
    d.close.innerHTML = glyph('close') || CROSS;
    d.pet.innerHTML = glyph('pet') || HAND;
  }
  if (performance.now() >= react.until) d.face.innerHTML = portrait(view.mood);
  setBond(bond);
  cur = {
    text: view.say,
    shown: 0,
    at: performance.now(),
    mood: view.mood,
    onPick,
    onClose,
    onPet,
    opts: view.opts,
    typing: !reducedMotion,
  };
  d.say.textContent = cur.typing ? '' : view.say;
  d.opts.replaceChildren(
    ...view.opts.map((text, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bd-opt';
      const n = document.createElement('kbd');
      n.textContent = String(i + 1);
      b.append(n, text);
      const gift = GIFTS[view.gifts?.[i] ?? -1];
      if (gift) {
        const img = document.createElement('img');
        img.className = 'bd-gift';
        img.alt = '';
        setIcon(img, gift.id);
        b.append(img);
      }
      b.addEventListener('click', () => choose(i));
      return b;
    }),
  );
  d.opts.hidden = cur.typing;
  boogler.me.speaking = cur.typing;
  if (!cur.typing) finishTyping();
}

// Plays a one-shot CSS animation (class `cls`) again from the start.
export function replay(node: HTMLElement, cls: string) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

let bondLevel = -1;
function setBond(b: Bond) {
  const d = dom();
  d.hearts.textContent = heartsText(b.level);
  d.level.textContent = b.name;
  d.bar.style.width = `${Math.round(b.frac * 100)}%`;
  if (bondLevel >= 0 && b.level > bondLevel) replay(d.bond, 'up');
  bondLevel = b.level;
}

// His reaction while the box is open (a pet, a level up): a speech bubble over the card, a face for a moment, hearts.
export function dialogueReact({
  line,
  mood,
  hearts = false,
  bond = null,
}: {
  line: string;
  mood: string;
  hearts?: boolean;
  bond?: Bond | null;
}) {
  if (!dialogue.open) return;
  const d = dom();
  react.until = performance.now() + REACT_MS;
  d.popText.textContent = line;
  d.face.innerHTML = portrait(mood);
  if (bond) setBond(bond);
  const w = d.wrap.getBoundingClientRect(),
    f = d.faceBtn.getBoundingClientRect();
  const x = f.left + f.width / 2 - w.left;
  d.pop.style.left = `${Math.max(0, x - 30).toFixed(0)}px`;
  d.pop.hidden = false;
  replay(d.pop, 'pop');
  replay(d.faceBtn, 'pop');
  if (!hearts || reducedMotion) return;
  for (let k = 0; k < 4; k++) {
    const h = document.createElement('span');
    h.className = 'bd-heart';
    h.textContent = '♥';
    h.style.left = `${(x - 6 + (k - 1.5) * 12).toFixed(0)}px`;
    h.style.top = `${(f.top - w.top + 6).toFixed(0)}px`;
    h.style.animationDelay = `${k * 70}ms`;
    h.addEventListener('animationend', () => h.remove());
    d.wrap.append(h);
  }
}

export function closeDialogue() {
  if (!dialogue.open) return;
  dialogue.open = false;
  cur = null;
  react.until = 0;
  const d = dom();
  d.pop.hidden = true;
  setPadGrab(null);
  boogler.me.speaking = false;
  d.root.hidden = true;
}

export function updateDialogue(now: number) {
  if (react.until && now >= react.until) {
    react.until = 0;
    dom().pop.hidden = true;
    if (cur) dom().face.innerHTML = portrait(cur.mood);
  }
  if (!cur?.typing) return;
  const n = Math.min(cur.text.length, Math.floor(((now - cur.at) / 1000) * CHARS_PER_S));
  if (n !== cur.shown) {
    cur.shown = n;
    dom().say.textContent = cur.text.slice(0, n);
  }
  if (n >= cur.text.length) finishTyping();
}

// Capture phase on window, so it runs before the game's own key handlers; it stops only the keys it answers with
// (number keys would also switch the hotbar slot) and lets the rest through to the game.
addEventListener(
  'keydown',
  (e) => {
    if (!cur || e.ctrlKey || e.metaKey || e.altKey) return;
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (!digit && e.code !== 'Escape' && e.code !== 'KeyE' && e.code !== 'Enter') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat) return;
    if (e.code === 'Escape' || e.code === 'KeyE') cur.onClose?.();
    else if (cur.typing)
      finishTyping(); // skipping the typing never also picks an answer
    else if (digit) choose(Number(digit[1]) - 1);
    else focusedBtn()?.click(); // Enter: a button focused with Tab
  },
  { capture: true },
);
