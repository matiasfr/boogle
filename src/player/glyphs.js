// Button glyphs for on-screen prompts, drawn for the input in use: keycaps and the mouse on a computer, face buttons
// and triggers on a gamepad (body.gamepad), nothing on touch (body.touch), where the buttons carry their own labels.
//
//   glyph(action)   HTML for one control: 'interact' (E / B), 'use' (click / X),
//                   'close' (Esc / B), 'pet' (Y on a gamepad only); '' when the input has no glyph for it
//   inputKind()     'pad' | 'touch' | 'kbm'
//
//   keyGlyph(token)  HTML for one `keys` alternative of a control (src/player/controls.js): keycaps, the mouse, combos joined
//                    with a small +, clusters side by side
//   padGlyph(slot)   HTML for one PAD slot or a stick ('ls' / 'rs')
//
// Pad glyphs for actions read their slot from src/player/controls.js, so a rebound action shows its new button. Any
// registered action or described control id also works with glyph(): its first key, or its pad slots.
import './glyphs.css';
import { slotFor, controlById, PAD_LABEL } from './controls.js';

export const inputKind = () =>
  document.body.classList.contains('gamepad') ? 'pad' : document.body.classList.contains('touch') ? 'touch' : 'kbm';

const MOUSE_LABEL = { l: 'Click', r: 'Right click', n: 'Mouse' };
// l / r light that button; n lights none (moving the mouse).
const MOUSE = (side) => `
  <svg class="g g-mouse" viewBox="0 0 16 22" role="img" aria-label="${MOUSE_LABEL[side]}">
    <rect x="1" y="1" width="14" height="20" rx="7" fill="#fff" stroke="currentColor" stroke-width="2" />
    ${
      side === 'n'
        ? ''
        : `<path d="${side === 'l' ? 'M8 1.8 A6.2 6.2 0 0 0 1.8 8 V9 H8 Z' : 'M8 1.8 A6.2 6.2 0 0 1 14.2 8 V9 H8 Z'}" fill="var(--sun)" />`
    }
    <path d="M1.5 9 H14.5 M8 1.5 V9" stroke="currentColor" stroke-width="1.6" fill="none" />
  </svg>`;
const key = (k) => `<kbd class="g g-key">${k}</kbd>`;
const pad = (b, text = b.toUpperCase()) =>
  `<span class="g g-pad" data-b="${b}" role="img" aria-label="${text}">${text}</span>`;

const KBM = { interact: key('E'), use: MOUSE('l'), close: key('Esc'), pet: '' };
// The action (src/player/input.js) behind each pad glyph; the glyph is '' while that action has no slot.
const PAD_ACTION = { interact: 'interact', use: 'use' };
// Not actions: the talk box reads these buttons itself (padPress in src/boogler/dialogue.js); keep them in step.
const PAD_FIXED = { close: pad('b'), pet: pad('y') };

const KEY_TEXT = {
  Space: 'Space',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  Escape: 'Esc',
  Enter: 'Enter',
  Tab: 'Tab',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
};
const keyText = (code) => {
  if (KEY_TEXT[code]) return KEY_TEXT[code];
  const m = /^(?:Key|Digit|Numpad)(.+)$/.exec(code);
  return m ? m[1] : code;
};
const plus = '<span class="g-plus">+</span>';

export function keyGlyph(token) {
  if (Array.isArray(token)) return `<span class="g-cluster">${token.map(keyGlyph).join('')}</span>`;
  if (typeof token !== 'string') return '';
  if (token.includes('+')) return token.split('+').map(keyGlyph).join(plus);
  if (token === 'Mouse0') return MOUSE('l');
  if (token === 'Mouse2') return MOUSE('r');
  if (token === 'Mouse1') return key('Middle click');
  if (token === 'Wheel') return key('Wheel');
  if (token === 'MouseMove') return MOUSE('n');
  const range = /^Digit(\d)-(\d)$/.exec(token);
  if (range) return key(`${range[1]}–${range[2]}`);
  return key(keyText(token));
}

export function padGlyph(slot) {
  if (slot === 'ls') return pad('ls', 'L');
  if (slot === 'rs') return pad('rs', 'R');
  if (!PAD_LABEL[slot]) return '';
  const dir = { up: '↑', down: '↓', left: '←', right: '→' }[slot];
  return dir
    ? `<span class="g g-pad" data-b="${slot}" role="img" aria-label="${PAD_LABEL[slot]}">${dir}</span>`
    : pad(slot, PAD_LABEL[slot]);
}

function padGlyphFor(action) {
  if (PAD_ACTION[action]) {
    const slot = slotFor(PAD_ACTION[action]);
    return slot ? padGlyph(slot) : '';
  }
  if (PAD_FIXED[action] !== undefined) return PAD_FIXED[action];
  const slots = [controlById(action)?.pad].flat().filter(Boolean);
  return slots.map(padGlyph).join('');
}

export function glyph(action) {
  const kind = inputKind();
  if (kind === 'touch') return '';
  if (kind === 'pad') return padGlyphFor(action);
  if (action in KBM) return KBM[action];
  const first = controlById(action)?.keys?.[0];
  return first === undefined ? '' : keyGlyph(first);
}
