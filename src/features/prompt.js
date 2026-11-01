// The interact prompt: what E (pad B, the touch action button) would act on, marked where it is with the button and the
// verb, "[E] Pick up" floating over the can, or "[E] Talk" in The Boogler's name tag (a target with show() draws it
// itself; see registerInteractable in src/player/hands.ts). A full hotbar greys it and says so. Hidden while you wind up a
// throw or talk. Serves DESIGN.md 7 (telegraph everything): you see what a press does before you press.
import './prompt.css';
import { onFrame } from '../loop.ts';
import { toScreen } from '../render/scene.js';
import { me } from '../player/player.ts';
import { interactTarget } from '../player/hands.ts';
import { dialogue } from '../boogler/dialogue.js';
import { glyph } from '../player/glyphs.ts';

const onScreen = { x: 0, y: 0, behind: false };
const ui = { root: null, html: '', id: '', show: null, showId: '' };

const chip = (t) =>
  `<span class="prompt-chip${t.blocked ? ' blocked' : ''}">${glyph('interact')}<span>${t.verb}</span></span>` +
  (t.blocked ? `<span class="prompt-why">${t.blocked}</span>` : '');

function build() {
  ui.root = document.createElement('div');
  ui.root.className = 'prompt';
  ui.root.hidden = true;
  ui.root.innerHTML = '<div class="prompt-in"></div>';
  document.querySelector('.hud')?.append(ui.root);
}

onFrame(
  () => {
    if (!ui.root) build();
    const t = me.entered && !me.charging && !dialogue.open ? interactTarget() : null;
    const html = t ? chip(t) : '';
    // A target that draws its own prompt gets the markup each frame, and '' once when it stops being the one.
    if (ui.show && (ui.showId !== t?.id || ui.show !== t.show)) ui.show('');
    ui.show = t?.show ?? null;
    ui.showId = ui.show ? t.id : '';
    ui.show?.(html);
    const id = t && !t.show ? t.id : '';
    if (!id) {
      ui.root.hidden = true;
      ui.id = '';
      return;
    }
    const inner = ui.root.firstChild;
    if (html !== ui.html) {
      ui.html = html;
      inner.innerHTML = html;
    }
    if (id !== ui.id) {
      ui.id = id;
      inner.classList.remove('pop');
      void inner.offsetWidth; // restart the pop-in animation
      inner.classList.add('pop');
    }
    const { x, y, behind } = toScreen(t.at, onScreen, innerWidth, innerHeight);
    const visible = !behind && x > 0 && x < innerWidth && y > 0 && y < innerHeight;
    ui.root.hidden = !visible;
    if (!visible) return;
    ui.root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  },
  { phase: 'late' },
);
