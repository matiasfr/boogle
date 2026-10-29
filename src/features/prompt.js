// The interact prompt: what E (pad B, the touch action button) would act on, marked where it is with the button and the
// verb, "[E] Pick up" over a shell or "[E] Talk" under The Boogler's name. A full hotbar greys it and says so. Hidden
// while you wind up a throw or talk. Serves DESIGN.md 7 (telegraph everything): you see what a press does before you
// press.
import './prompt.css';
import * as THREE from 'three';
import { onFrame } from '../loop.js';
import { camera } from '../scene.js';
import { me } from '../player.js';
import { interactTarget } from '../hands.js';
import { dialogue } from '../boogler-dialogue.js';
import { setTagPrompt } from '../boogler-hud.js';
import { glyph, inputKind } from '../glyphs.js';

const ndc = new THREE.Vector3();
const ui = { root: null, html: '', id: '', kind: '' };

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
    const kind = inputKind();
    const html = t ? chip(t) : '';
    setTagPrompt(t?.id === 'boogler' ? html : '');
    const id = t && t.id !== 'boogler' ? t.id : '';
    if (!id) {
      ui.root.hidden = true;
      ui.id = '';
      return;
    }
    const inner = ui.root.firstChild;
    if (html !== ui.html || kind !== ui.kind) {
      ui.html = html;
      ui.kind = kind;
      inner.innerHTML = html;
    }
    if (id !== ui.id) {
      ui.id = id;
      inner.classList.remove('pop');
      void inner.offsetWidth; // restart the pop-in animation
      inner.classList.add('pop');
    }
    ndc.copy(t.at).project(camera);
    const visible = ndc.z < 1 && Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1;
    ui.root.hidden = !visible;
    if (!visible) return;
    const x = (ndc.x * 0.5 + 0.5) * innerWidth,
      y = (-ndc.y * 0.5 + 0.5) * innerHeight;
    ui.root.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  },
  { phase: 'late' },
);
