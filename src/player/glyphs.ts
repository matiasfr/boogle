// Button glyphs for on-screen prompts, drawn for the input in use: keycaps and the mouse on a computer, face buttons
// and triggers on a gamepad (body.gamepad), nothing on touch (body.touch), where the buttons carry their own labels.
//
//   glyph(action)   HTML for one control: 'interact' (E / X), 'use' (click / D-pad →), 'close' (Esc / B),
//                   'confirm' (E / A); '' when the input has no glyph for it
//   inputKind()     'pad' | 'touch' | 'kbm'
//   padBrand()      'xbox' | 'ps' | 'nintendo': body[data-pad], set by src/features/gamepad.ts from the pad's id. Slots
//                   are positions (W3C standard mapping: a is the bottom face button, b the right, x the left, y the
//                   top); the brand only changes what they are called: X is □ on a PlayStation pad and Y on a Switch one.
//   padText(slot)   the slot's name on the pad in use ('X', '□', 'Y'), for plain text such as a guide detail
//
//   keyGlyph(token)  HTML for one `keys` alternative of a control (src/player/controls.ts): keycaps, the mouse, combos joined
//                    with a small +, clusters side by side
//   padGlyph(slot)   HTML for one PAD slot or a stick ('ls' / 'rs'), named for padBrand()
//   padDetail(text)  text with {slot} tokens ('{x} talks', or {confirm} / {back}: menuSlot) named for padBrand()
//
// Pad glyphs for actions read their slot from src/player/controls.ts, so a rebound action shows its new button. Any
// registered action or described control id also works with glyph(): its first key, or its pad slots.
import './glyphs.css';
import { controlById, menuSlot, PAD_LABEL, type Keys } from './controls.ts';

export const inputKind = (): 'pad' | 'touch' | 'kbm' =>
  document.body.classList.contains('gamepad') ? 'pad' : document.body.classList.contains('touch') ? 'touch' : 'kbm';

const MOUSE_LABEL = { l: 'Click', r: 'Right click', n: 'Mouse' } as const;
// l / r light that button; n lights none (moving the mouse).
const MOUSE = (side: keyof typeof MOUSE_LABEL) => `
  <svg class="g g-mouse" viewBox="0 0 16 22" role="img" aria-label="${MOUSE_LABEL[side]}">
    <rect x="1" y="1" width="14" height="20" rx="7" fill="#fff" stroke="currentColor" stroke-width="2" />
    ${
      side === 'n'
        ? ''
        : `<path d="${side === 'l' ? 'M8 1.8 A6.2 6.2 0 0 0 1.8 8 V9 H8 Z' : 'M8 1.8 A6.2 6.2 0 0 1 14.2 8 V9 H8 Z'}" fill="var(--sun)" />`
    }
    <path d="M1.5 9 H14.5 M8 1.5 V9" stroke="currentColor" stroke-width="1.6" fill="none" />
  </svg>`;
const key = (k: string) => `<kbd class="g g-key">${k}</kbd>`;

export type PadBrand = 'xbox' | 'ps' | 'nintendo';
export const padBrand = (): PadBrand => {
  const b = typeof document === 'undefined' ? '' : document.body.dataset.pad;
  return b === 'ps' || b === 'nintendo' ? b : 'xbox';
};
// What each brand prints on a slot; missing ones fall back to PAD_LABEL (the Xbox names).
const BRAND_LABEL: Record<PadBrand, Record<string, string>> = {
  xbox: {},
  ps: { a: '✕', b: '○', x: '□', y: '△', lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', view: 'Create', menu: 'Options' },
  nintendo: { a: 'B', b: 'A', x: 'Y', y: 'X', lb: 'L', rb: 'R', lt: 'ZL', rt: 'ZR', view: '−', menu: '+' },
};
const ARIA: Record<string, string> = { '✕': 'Cross', '○': 'Circle', '□': 'Square', '△': 'Triangle' };
export const padText = (slot: string) => BRAND_LABEL[padBrand()][slot] ?? PAD_LABEL[slot] ?? slot;
export const padDetail = (text: string) =>
  text.replace(/\{(\w+)\}/g, (m, s: string) =>
    s === 'confirm' || s === 'back' ? padText(menuSlot(s)) : PAD_LABEL[s] ? padText(s) : m,
  );
const pad = (b: string, text = padText(b)) =>
  `<span class="g g-pad" data-b="${b}" data-brand="${padBrand()}" role="img" aria-label="${ARIA[text] ?? text}">${text}</span>`;

const KBM: Record<string, string> = {
  interact: key('E'),
  use: MOUSE('l'),
  close: key('Esc'),
  confirm: key('E'),
};
// Not actions: talk boxes and menus read these buttons themselves (src/player/conversation.ts, src/player/modal.ts
// users); menuSlot swaps confirm and back on a Switch pad.
const PAD_FIXED: Record<string, () => string> = {
  close: () => pad(menuSlot('back')),
  confirm: () => pad(menuSlot('confirm')),
};

const KEY_TEXT: Record<string, string> = {
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
const keyText = (code: string) => {
  if (KEY_TEXT[code]) return KEY_TEXT[code];
  const m = /^(?:Key|Digit|Numpad)(.+)$/.exec(code);
  return m ? m[1] : code;
};
const plus = '<span class="g-plus">+</span>';

export function keyGlyph(token: string | Keys): string {
  if (Array.isArray(token)) return `<span class="g-cluster">${token.map((t) => keyGlyph(t)).join('')}</span>`;
  if (typeof token !== 'string') return '';
  if (token.includes('+'))
    return token
      .split('+')
      .map((t) => keyGlyph(t))
      .join(plus);
  if (token === 'Mouse0') return MOUSE('l');
  if (token === 'Mouse2') return MOUSE('r');
  if (token === 'Mouse1') return key('Middle click');
  if (token === 'Wheel') return key('Wheel');
  if (token === 'MouseMove') return MOUSE('n');
  const range = /^Digit(\d)-(\d)$/.exec(token);
  if (range) return key(`${range[1]}–${range[2]}`);
  return key(keyText(token));
}

export function padGlyph(slot: string) {
  if (slot === 'ls') return pad('ls', 'L');
  if (slot === 'rs') return pad('rs', 'R');
  if (!PAD_LABEL[slot]) return '';
  const dir = ({ up: '↑', down: '↓', left: '←', right: '→' } as Record<string, string>)[slot];
  return dir
    ? `<span class="g g-pad" data-b="${slot}" role="img" aria-label="${PAD_LABEL[slot]}">${dir}</span>`
    : pad(slot);
}

function padGlyphFor(action: string) {
  if (action in PAD_FIXED) return PAD_FIXED[action]();
  const slots = [controlById(action)?.pad].flat().filter((p): p is string => !!p);
  return slots.map((p) => padGlyph(p)).join('');
}

export function glyph(action: string) {
  const kind = inputKind();
  if (kind === 'touch') return '';
  if (kind === 'pad') return padGlyphFor(action);
  if (action in KBM) return KBM[action];
  const first = controlById(action)?.keys?.[0];
  return first === undefined ? '' : keyGlyph(first);
}
