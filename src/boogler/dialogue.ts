// The talk box: The Boogler's line typed out, your answers as buttons (a gift answer shows the gift), the friendship
// meter, his portrait, a close button, and the button hints for the input in use. Its keys, pad buttons,
// taps, the held movement and the camera are the shared NPC talk input (src/player/conversation.ts): confirm (pad A,
// E, Space, Enter) skips the typing and says the selected answer, up and down pick, number keys answer at once, back
// (pad B, Esc) leaves.
import { reducedMotion } from '../constants.ts';
import { openConversation, closeConversation } from '../player/conversation.ts';
import { heartsText } from './friendship.ts';
import { boogler } from './boogler.ts';
import { GIFTS } from '../sim/gift-catalog.ts';
import { setIcon } from '../player/item-icons.ts';
import { glyph, inputKind, padBrand } from '../player/glyphs.ts';

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

const CROSS = `<svg class="bd-x" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" /></svg>`;

const MARKUP = `
  <div class="bd-wrap">
    <div class="bd-pop" hidden><div class="bd-pop-text"></div></div>
    <div class="bd-card" role="dialog" aria-modal="true" aria-labelledby="bd-name">
      <div class="bd-head">
        <span class="bd-face"><span class="bd-face-svg"></span></span>
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
      <div class="talk-hints bd-hints" hidden></div>
    </div>
  </div>`;

/** What the talk box shows (src/boogler/talk.ts talkView). */
export type DialogueView = { say: string; mood: string; opts: string[]; gifts?: number[] };
export type Bond = { level: number; name: string; frac: number };
type Dom = Record<
  | 'wrap'
  | 'faceBox'
  | 'face'
  | 'close'
  | 'pop'
  | 'popText'
  | 'hearts'
  | 'level'
  | 'bond'
  | 'bar'
  | 'say'
  | 'opts'
  | 'hints',
  HTMLElement
> & { root: HTMLElement };
type Current = {
  text: string;
  shown: number;
  at: number;
  mood: string;
  onPick: (i: number) => void;
  onClose?: () => void;
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
    faceBox: q('.bd-face'),
    face: q('.bd-face-svg'),
    close: q('.bd-close'),
    pop: q('.bd-pop'),
    popText: q('.bd-pop-text'),
    hearts: q('.bd-hearts'),
    level: q('.bd-level'),
    bond: q('.bd-bond'),
    bar: q('.bd-bar i'),
    say: q('.bd-say'),
    opts: q('.bd-opts'),
    hints: q('.bd-hints'),
  });
  // Only the card takes taps and clicks (boogler.css); the canvas works around it.
  d.wrap.addEventListener('pointerdown', (e) => e.stopPropagation());
  d.wrap.addEventListener('contextmenu', (e) => e.preventDefault());
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

// The close button shows the button for the input in use (a cross on touch).
let glyphKey = '';
function refreshGlyphs() {
  const key = inputKind() + padBrand();
  if (key === glyphKey) return;
  glyphKey = key;
  dom().close.innerHTML = glyph('close') || CROSS;
}

// view: { say, mood, opts, gifts? } (gifts[i]: the catalog index answer i hands over); bond: { level, name, frac };
// onPick(i) answers; onClose() runs on back (Esc, pad B) and the close button.
export function showDialogue(view: DialogueView, bond: Bond, onPick: (i: number) => void, onClose?: () => void) {
  const d = dom();
  const opening = !dialogue.open;
  if (opening) {
    const talk = {
      box: d.wrap,
      typing: () => !!cur?.typing,
      skip: finishTyping,
      choices: () => (cur?.typing ? [] : [...d.opts.querySelectorAll<HTMLButtonElement>('button')]),
      close: () => cur?.onClose?.(),
      focus: () => boogler.center,
      hints: d.hints,
    };
    if (!openConversation(talk)) return; // the pause view is up, or another talk
    glyphKey = '';
    refreshGlyphs();
  }
  dialogue.open = true;
  d.root.hidden = false;
  if (performance.now() >= react.until) d.face.innerHTML = portrait(view.mood);
  setBond(bond);
  cur = {
    text: view.say,
    shown: 0,
    at: performance.now(),
    mood: view.mood,
    onPick,
    onClose,
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

// His reaction while the box is open (a level up): a speech bubble over the card, a face for a moment, hearts.
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
    f = d.faceBox.getBoundingClientRect();
  const x = f.left + f.width / 2 - w.left;
  d.pop.style.left = `${Math.max(0, x - 30).toFixed(0)}px`;
  d.pop.hidden = false;
  replay(d.pop, 'pop');
  replay(d.faceBox, 'pop');
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
  closeConversation();
  boogler.me.speaking = false;
  d.root.hidden = true;
}

export function updateDialogue(now: number) {
  if (dialogue.open) refreshGlyphs();
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
