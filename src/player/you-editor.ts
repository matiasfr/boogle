// "You" on the pause view's Room page (src/features/pause.ts): your name (and your colour, until the wardrobe's You page
// has it: src/entities/wardrobe/menu.ts), changeable at any time and saved
// for next time (the same localStorage keys the first-visit card writes; src/player/arrival.ts). Presence carries the
// new name and colour on its next beat, and src/features/identity.ts tells the roster, so plaques follow. Local: only
// your own identity. Serves DESIGN.md 8 (Designed for drop-in: a returning player skips the card, so this is where a
// name changes).
import './you-editor.css';
import { COLORS } from '../constants.ts';
import { paintAvatar } from './avatars.ts';
import { sanitizeName } from '../math.ts';
import { me } from './player.ts';
import { renderPeople } from './hud.ts';

function save() {
  try {
    localStorage.setItem('boogle.name', me.name);
    localStorage.setItem('boogle.color', String(me.colorIdx));
  } catch {
    // not remembered past this visit
  }
  if (me.avatar) paintAvatar(me.avatar.userData.mat, me.colorIdx);
  renderPeople(); // the Room page's list follows on its own (it watches who is on the island)
}

/** Your colour as swatches: the one you wear is the focus stop (the rest are reached with left and right), and a
 * `cycle` event steps through them. `onPick` hears every change. */
export function colourSwatches(onPick?: () => void) {
  const el = document.createElement('div');
  el.className = 'pause-swatches';
  const paint = () =>
    el.querySelectorAll('button').forEach((b, k) => {
      b.setAttribute('aria-pressed', String(k === me.colorIdx));
      b.toggleAttribute('data-nostop', k !== me.colorIdx);
    });
  const pick = (k: number) => {
    me.colorIdx = k;
    paint();
    save();
    onPick?.();
  };
  COLORS.forEach((col, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pause-btn pause-swatch';
    b.dataset.color = String(k);
    b.style.background = col;
    b.setAttribute('aria-label', `Colour ${k + 1}`);
    b.addEventListener('click', () => {
      pick(k);
      b.focus({ preventScroll: true });
    });
    el.append(b);
  });
  paint();
  const step = (dir: number) => {
    const here = el.contains(document.activeElement);
    pick((me.colorIdx + dir + COLORS.length) % COLORS.length);
    if (here) el.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({ preventScroll: true });
  };
  el.dataset.cycle = '';
  el.addEventListener('cycle', (e) => step((e as CustomEvent<number>).detail));
  return { el, step };
}

export function youEditor({ colour = true }: { colour?: boolean } = {}): HTMLElement {
  const you = document.createElement('div');
  you.className = 'pause-you-edit';
  const h = document.createElement('h2');
  h.className = 'pause-h';
  h.textContent = 'You';
  const name = document.createElement('input');
  name.className = 'pause-url';
  name.type = 'text';
  name.maxLength = 16;
  name.spellcheck = false;
  name.value = me.name;
  name.enterKeyHint = 'done';
  name.setAttribute('aria-label', 'Your name');
  name.addEventListener('input', () => {
    const n = sanitizeName(name.value);
    if (!n || n === me.name) return;
    me.name = n;
    save();
  });
  // boogle-disable-next-line boogle/input-through-actions -- the name field is a text field: Enter finishes typing
  name.addEventListener('keydown', (e) => e.key === 'Enter' && name.blur());
  you.append(h, name);
  if (colour) you.append(colourSwatches().el);
  return you;
}
