// The talk box: The Boogler's line typed out, your answers as buttons (or number keys), and the friendship meter.
// While it is open it swallows game keys and clicks, and frees the mouse pointer.
import { reducedMotion } from './constants.js';
import { input, requestLock } from './input.js';
import { MAX_LEVEL } from './boogler-friendship.js';
import { boogler } from './boogler.js';

const CHARS_PER_S = 48;
const MOUTHS = {
  smile:
    '<path d="M17.6 22.4 Q20 24.6 22.4 22.4" stroke="#1d1640" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
  joy: '<path d="M17 21.9 Q20 26.4 23 21.9 Z" fill="#1d1640"/>',
  grump:
    '<path d="M17.8 23.8 Q20 21.9 22.2 23.8" stroke="#1d1640" stroke-width="1.2" fill="none" stroke-linecap="round"/>',
  worry:
    '<path d="M17.4 23 Q18.6 22.2 19.6 23 Q20.6 23.8 21.6 23 Q22.4 22.4 22.8 23" stroke="#1d1640" stroke-width="1" fill="none" stroke-linecap="round"/>',
};
const face = (mood) => `
  <svg viewBox="0 0 40 40" aria-hidden="true">
    <ellipse cx="11" cy="28.5" rx="5" ry="3" fill="#6c4fd1"/>
    <ellipse cx="29" cy="28.5" rx="5" ry="3" fill="#6c4fd1"/>
    <circle cx="4.5" cy="21" r="3.6" fill="#b99cff"/>
    <circle cx="35.5" cy="21" r="3.6" fill="#b99cff"/>
    <ellipse cx="20" cy="21" rx="15" ry="6.5" fill="#b99cff"/>
    <ellipse cx="15.5" cy="19.6" rx="1.4" ry="1.9" fill="#1d1640"/>
    <ellipse cx="24.5" cy="19.6" rx="1.4" ry="1.9" fill="#1d1640"/>
    ${MOUTHS[mood] ?? MOUTHS.smile}
  </svg>`;

const MARKUP = `
  <div class="bd-card" role="dialog" aria-modal="true" aria-labelledby="bd-name">
    <div class="bd-head">
      <span class="bd-face"></span>
      <span class="bd-name" id="bd-name">The Boogler</span>
      <span class="bd-bond">
        <span class="bd-hearts" aria-hidden="true"></span>
        <span class="bd-level"></span>
        <span class="bd-bar" aria-hidden="true"><i></i></span>
      </span>
    </div>
    <p class="bd-say" aria-live="polite"></p>
    <div class="bd-opts" role="group" aria-label="Your answer"></div>
  </div>`;

export const dialogue = { open: false };
let el = null;
let cur = null; // { text, shown, t, onPick, onClose, opts, typing }

function dom() {
  if (el) return el;
  const root = document.createElement('div');
  root.className = 'bd';
  root.hidden = true;
  root.innerHTML = MARKUP;
  document.body.append(root);
  const q = (c) => root.querySelector(c);
  el = {
    root,
    card: q('.bd-card'),
    face: q('.bd-face'),
    hearts: q('.bd-hearts'),
    level: q('.bd-level'),
    bond: q('.bd-bond'),
    bar: q('.bd-bar i'),
    say: q('.bd-say'),
    opts: q('.bd-opts'),
  };
  root.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (cur?.typing && !e.target.closest('button')) finishTyping();
  });
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  return el;
}

function finishTyping() {
  if (!cur) return;
  cur.typing = false;
  cur.shown = cur.text.length;
  el.say.textContent = cur.text;
  boogler.me.speaking = false;
  el.opts.hidden = false;
}

function choose(i) {
  if (!cur || cur.typing || i < 0 || i >= cur.opts.length) return;
  cur.onPick(i);
}

// view: { say, mood, opts }; bond: { level, name, frac }; onPick(i) answers; onClose() runs on Escape.
export function showDialogue(view, bond, onPick, onClose) {
  const d = dom();
  const opening = !dialogue.open;
  dialogue.open = true;
  d.root.hidden = false;
  if (opening) {
    input.keys.clear();
    if (document.pointerLockElement) document.exitPointerLock();
  }
  d.face.innerHTML = face(view.mood);
  d.card.dataset.mood = view.mood;
  setBond(bond);
  cur = {
    text: view.say,
    shown: 0,
    at: performance.now(),
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
      b.addEventListener('click', () => choose(i));
      return b;
    }),
  );
  d.opts.hidden = cur.typing;
  boogler.me.speaking = cur.typing;
  if (!cur.typing) finishTyping();
}

let bondLevel = -1;
function setBond(b) {
  const d = dom();
  d.hearts.textContent = '♥'.repeat(b.level) + '♡'.repeat(MAX_LEVEL - b.level);
  d.level.textContent = b.name;
  d.bar.style.width = `${Math.round(b.frac * 100)}%`;
  if (bondLevel >= 0 && b.level > bondLevel) {
    d.bond.classList.remove('up');
    void d.bond.offsetWidth; // restart the level-up animation
    d.bond.classList.add('up');
  }
  bondLevel = b.level;
}

export function closeDialogue() {
  if (!dialogue.open) return;
  dialogue.open = false;
  cur = null;
  boogler.me.speaking = false;
  el.root.hidden = true;
  requestLock();
}

export function updateDialogue(now) {
  if (!cur?.typing) return;
  const n = Math.min(cur.text.length, Math.floor(((now - cur.at) / 1000) * CHARS_PER_S));
  if (n !== cur.shown) {
    cur.shown = n;
    el.say.textContent = cur.text.slice(0, n);
  }
  if (n >= cur.text.length) finishTyping();
}

// Capture phase on window: runs before the game's own key handlers and stops them while the box is open.
addEventListener(
  'keydown',
  (e) => {
    if (!dialogue.open || !cur) return;
    e.stopPropagation();
    if (e.code === 'Escape') {
      e.preventDefault();
      cur.onClose?.();
      return;
    }
    // Skipping the typing must never also pick an answer, so these only activate an answer focused with the arrows.
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
      e.preventDefault();
      if (cur.typing) finishTyping();
      else if (!e.repeat) document.activeElement?.closest?.('.bd-opt')?.click();
      return;
    }
    const digit = /^(?:Digit|Numpad)([1-9])$/.exec(e.code);
    if (digit) {
      e.preventDefault();
      if (!e.repeat) choose(Number(digit[1]) - 1);
      return;
    }
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp' || e.code === 'KeyS' || e.code === 'KeyW') {
      e.preventDefault();
      const btns = [...el.opts.querySelectorAll('button')];
      const k = btns.indexOf(document.activeElement);
      const dir = e.code === 'ArrowDown' || e.code === 'KeyS' ? 1 : -1;
      const next = k < 0 ? (dir > 0 ? 0 : btns.length - 1) : (k + dir + btns.length) % btns.length;
      btns[next]?.focus({ preventScroll: true });
    }
  },
  { capture: true },
);
addEventListener('keyup', (e) => dialogue.open && e.stopPropagation(), { capture: true });
