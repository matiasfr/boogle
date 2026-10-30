// The first-run card: the first time a player enters with a keyboard, a gamepad or a touch screen, a small paper card
// lists the basics (generated from the control registry, src/guide.js) and points at the menu. It never takes input,
// and goes away once the player has walked about for a few seconds, or after 15. Local only: one flag per input kind
// in localStorage. Serves DESIGN.md's "drop-in, drop-out": the controls are one glance away, never a manual.
import './first-run.css';
import { onFrame } from '../loop.js';
import { me } from '../player.js';
import { input } from '../input.js';
import { modalOpen } from '../modal.js';
import { renderGuide } from '../guide.js';
import { glyph, inputKind } from '../glyphs.js';

const MOVE_S = 3; // seconds of walking that teach enough
const MAX_S = 15;
const GROUPS = ['move', 'camera', 'ball', 'hands'];
const WALK = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

const flag = (kind) => `boogle.firstRun.${kind}`;
const seen = (kind) => {
  try {
    return localStorage.getItem(flag(kind)) !== null;
  } catch {
    return false;
  }
};
const remember = (kind) => {
  try {
    localStorage.setItem(flag(kind), '1');
  } catch {
    // private mode: the card may show again next time
  }
};

let card = null;
let last = null; // the input kind last looked at
let moved = 0;
let shown = 0;

function hide() {
  card?.remove();
  card = null;
}

function show(k) {
  hide();
  remember(k);
  moved = shown = 0;
  card = document.createElement('div');
  card.className = 'first-run';
  const more = document.createElement('div');
  more.className = 'first-run-more';
  const pause = glyph('pause');
  more.innerHTML =
    k === 'touch'
      ? '<span class="first-run-burger">☰</span> <span>All controls and the menu</span>'
      : `${pause} <span>All controls and the menu</span>`;
  card.append(renderGuide(k, { groups: GROUPS }), more);
  (document.querySelector('.hud') ?? document.body).append(card);
}

const walking = () => WALK.some((c) => input.keys.has(c)) || Math.abs(input.stickX) + Math.abs(input.stickY) > 0.25;

onFrame(
  ({ dt }) => {
    if (!me.entered) return;
    const k = inputKind();
    if (k !== last) {
      // A new input kind gets its own card, once.
      last = k;
      hide();
      if (!seen(k)) show(k);
    }
    if (!card) return;
    card.hidden = modalOpen();
    if (card.hidden) return;
    shown += dt;
    if (walking()) moved += dt;
    if (moved >= MOVE_S || shown >= MAX_S) {
      card.classList.add('gone');
      const c = card;
      card = null;
      setTimeout(() => c.remove(), 400);
    }
  },
  { phase: 'late' },
);
