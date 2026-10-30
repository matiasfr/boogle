// Button glyphs for on-screen prompts, drawn for the input in use: keycaps and the mouse on a computer, face buttons
// and triggers on a gamepad (body.gamepad), nothing on touch (body.touch), where the buttons carry their own labels.
//
//   glyph(action)   HTML for one control: 'interact' (E / B), 'use' (click / X), 'alt' (right click / LT),
//                   'close' (Esc / B), 'pet' (Y on a gamepad only); '' when the input has no glyph for it
//   inputKind()     'pad' | 'touch' | 'kbm'
//
// Pad glyphs for actions read their slot from src/controls.js, so a rebound action shows its new button.
import './glyphs.css';
import { slotFor, PAD_LABEL } from './controls.js';

export const inputKind = () =>
  document.body.classList.contains('gamepad') ? 'pad' : document.body.classList.contains('touch') ? 'touch' : 'kbm';

const MOUSE = (side) => `
  <svg class="g g-mouse" viewBox="0 0 16 22" role="img" aria-label="${side === 'l' ? 'Click' : 'Right click'}">
    <rect x="1" y="1" width="14" height="20" rx="7" fill="#fff" stroke="currentColor" stroke-width="2" />
    <path d="${side === 'l' ? 'M8 1.8 A6.2 6.2 0 0 0 1.8 8 V9 H8 Z' : 'M8 1.8 A6.2 6.2 0 0 1 14.2 8 V9 H8 Z'}" fill="var(--sun)" />
    <path d="M1.5 9 H14.5 M8 1.5 V9" stroke="currentColor" stroke-width="1.6" fill="none" />
  </svg>`;
const key = (k) => `<kbd class="g g-key">${k}</kbd>`;
const pad = (b, text = b.toUpperCase()) =>
  `<span class="g g-pad" data-b="${b}" role="img" aria-label="${text}">${text}</span>`;

const KBM = { interact: key('E'), use: MOUSE('l'), alt: MOUSE('r'), close: key('Esc'), pet: '' };
// The action (src/input.js) behind each pad glyph; the glyph is '' while that action has no slot.
const PAD_ACTION = { interact: 'interact', use: 'use', alt: 'pile' };
// Not actions: the talk box reads these buttons itself (padPress in src/boogler-dialogue.js); keep them in step.
const PAD_FIXED = { close: pad('b'), pet: pad('y') };

function padGlyph(action) {
  if (!PAD_ACTION[action]) return PAD_FIXED[action] ?? '';
  const slot = slotFor(PAD_ACTION[action]);
  return slot ? pad(slot, PAD_LABEL[slot]) : '';
}

export function glyph(action) {
  const kind = inputKind();
  return kind === 'kbm' ? (KBM[action] ?? '') : kind === 'pad' ? padGlyph(action) : '';
}
