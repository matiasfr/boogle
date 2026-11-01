// The first-run card: the first time a player enters with a keyboard, a gamepad or a touch screen, a small paper card
// lists the basics (generated from the control registry, src/player/guide.ts) and points at the menu. Only its close
// button takes clicks; it goes away once the player has walked about for a few seconds, after 15, when closed, or when the
// menu opens (the menu lists every control). Local only: one flag per input kind
// in localStorage. Serves DESIGN.md's "drop-in, drop-out": the controls are one glance away, never a manual.
import './first-run.css';
import { onFrame } from '../loop.ts';
import { me } from '../player/player.ts';
import { input } from '../player/input.ts';
import { modalOpen } from '../player/modal.ts';
import { dialogue } from '../boogler/dialogue.ts';
import { renderGuide } from '../player/guide.ts';
import { glyph, inputKind } from '../player/glyphs.ts';

// ?proto=arrive (src/proto/arrive/, wordless-onboarding rec 8): only what the world can't teach (move, camera, jump),
// on every visit, gone after the first steps. Its `v=lobby` keeps today's card.
const sp = new URLSearchParams(location.search);
const TRIM = sp.get('proto') === 'arrive' && sp.get('v') !== 'lobby';
const MOVE_S = TRIM ? 0.8 : 3; // seconds of walking that teach enough
const MAX_S = TRIM ? 20 : 15;
const GROUPS = TRIM ? ['move', 'camera'] : ['move', 'camera', 'ball', 'hands'];
const WALK = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];

type Kind = ReturnType<typeof inputKind>;
const flag = (kind: Kind) => `boogle.firstRun.${kind}`;
const seen = (kind: Kind) => {
  if (TRIM) return false;
  try {
    return localStorage.getItem(flag(kind)) !== null;
  } catch {
    return false;
  }
};
const remember = (kind: Kind) => {
  try {
    localStorage.setItem(flag(kind), '1');
  } catch {
    // private mode: the card may show again next time
  }
};

let card: HTMLElement | null = null;
let last: Kind | null = null; // the input kind last looked at
let moved = 0;
let shown = 0;

function hide() {
  card?.remove();
  card = null;
}

function dismiss() {
  if (!card) return;
  card.classList.add('gone');
  const c = card;
  card = null;
  setTimeout(() => c.remove(), 400);
}

function show(k: Kind) {
  hide();
  remember(k);
  moved = shown = 0;
  const c = (card = document.createElement('div'));
  c.className = 'first-run';
  const more = document.createElement('div');
  more.className = 'first-run-more';
  const pause = glyph('pause');
  more.innerHTML =
    k === 'touch'
      ? '<span class="first-run-burger">☰</span> <span>All controls and the menu</span>'
      : `${pause} <span>All controls and the menu</span>`;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'first-run-close';
  close.setAttribute('aria-label', 'Close');
  close.textContent = '×';
  close.addEventListener('click', () => {
    dismiss();
    document.getElementById('view')?.focus();
  });
  c.append(close, renderGuide(k, { groups: GROUPS }), more);
  (document.querySelector('.hud') ?? document.body).append(c);
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
    if (modalOpen()) return dismiss(); // the menu has every control in it
    card.hidden = dialogue.open;
    if (card.hidden) return;
    shown += dt;
    if (walking()) moved += dt;
    if (moved >= MOVE_S || shown >= MAX_S) dismiss();
  },
  { phase: 'late' },
);
