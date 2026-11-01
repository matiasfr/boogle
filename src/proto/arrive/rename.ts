// ?proto=arrive skips the lobby, so the pause view's Room page gets a "You" section: your name and colour, saved for
// next time and sent with presence (src/features/identity.ts tells the roster). Loaded by ./index.ts; the Room page
// draws it through roomExtras (src/features/pause.ts). Local: only your own identity.
import './rename.css';
import { COLORS } from '../../constants.ts';
import { sanitizeName } from '../../math.ts';
import { me } from '../../player/player.ts';
import { renderPeople } from '../../player/hud.ts';
import { roomExtras } from '../../features/pause.ts';

function save() {
  try {
    localStorage.setItem('boogle.name', me.name);
    localStorage.setItem('boogle.color', String(me.colorIdx));
  } catch {
    // not remembered past this visit
  }
  me.avatar?.userData.mat.color.set(COLORS[me.colorIdx]);
  renderPeople(); // the Room page's list follows on its own (it watches who is on the island)
}

roomExtras.push(() => {
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
  name.addEventListener('keydown', (e) => e.key === 'Enter' && name.blur());
  const swatches = document.createElement('div');
  swatches.className = 'pause-swatches';
  const paint = () =>
    swatches.querySelectorAll('button').forEach((b, k) => b.setAttribute('aria-pressed', String(k === me.colorIdx)));
  COLORS.forEach((col, k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pause-btn pause-swatch';
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
});
