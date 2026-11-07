// "You" on the pause view's Room page (src/features/pause.ts): your name and colour, changeable at any time and saved
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

export function youEditor(): HTMLElement {
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
  const swatches = document.createElement('div');
  swatches.className = 'pause-swatches';
  const paint = () =>
    swatches.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === me.colorIdx)));
  COLORS.forEach((col, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pause-btn pause-swatch';
    b.dataset.color = String(k);
    b.style.background = col;
    b.setAttribute('aria-label', `Colour ${k + 1}`);
    b.addEventListener('click', () => {
      me.colorIdx = k;
      paint();
      save();
    });
    swatches.append(b);
  });
  paint();
  you.append(h, name, swatches);
  return you;
}
