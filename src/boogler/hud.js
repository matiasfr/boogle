// Screen-space HUD for The Boogler: a bouncy name tag over his head while he's on screen (with your friendship hearts,
// his speech bubble, and the interact prompt when he is what you would interact with), and a pointer pinned to the
// nearest screen edge (aimed at him, with his distance) while he's off screen and nearby. Past FIND_NEAR it fades out,
// gone by FIND_FAR: far off you are doing your own thing, and he is mostly pottering about the garden anyway.
import { boogler, booglerScreen } from './boogler.js';
import { me } from '../player/player.js';
import { clamp } from '../math.js';
import { MAX_LEVEL } from './friendship.js';

const EDGE_X = 46; // pointer inset from the left/right edges, px
const EDGE_Y = 58; // pointer inset from the top/bottom edges, px
const FIND_NEAR = 35; // metres: full pointer inside this
const FIND_FAR = 60; // metres: no pointer past this

const MARKUP = `
  <div class="boogler-tag" hidden>
    <div class="boogler-say" hidden><div class="boogler-say-text"></div></div>
    <div class="boogler-tag-bob">The Boogler<span class="boogler-tag-bond"></span><span class="boogler-tag-prompt" hidden></span></div>
  </div>
  <div class="boogler-find" hidden>
    <div class="boogler-find-arrow"></div>
    <div class="boogler-find-badge" role="img" aria-label="The Boogler is this way">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <ellipse cx="11" cy="28.5" rx="5" ry="3" fill="#6c4fd1" />
        <ellipse cx="29" cy="28.5" rx="5" ry="3" fill="#6c4fd1" />
        <circle cx="4.5" cy="21" r="3.6" fill="#b99cff" />
        <circle cx="35.5" cy="21" r="3.6" fill="#b99cff" />
        <ellipse cx="20" cy="21" rx="15" ry="6.5" fill="#b99cff" />
        <ellipse cx="15.5" cy="19.6" rx="1.4" ry="1.9" fill="#1d1640" />
        <ellipse cx="24.5" cy="19.6" rx="1.4" ry="1.9" fill="#1d1640" />
        <path d="M17.6 22.4 Q20 24.6 22.4 22.4" stroke="#1d1640" stroke-width="1.2" fill="none" stroke-linecap="round" />
      </svg>
    </div>
    <div class="boogler-find-dist"></div>
  </div>`;

// Built here rather than in index.html, so this feature stays out of the shared HUD markup.
let el = null;
function dom() {
  if (el) return el;
  const hud = document.querySelector('.hud');
  if (!hud) return null;
  const wrap = document.createElement('div');
  wrap.innerHTML = MARKUP;
  const q = (c) => wrap.querySelector(c);
  el = {
    tag: q('.boogler-tag'),
    bond: q('.boogler-tag-bond'),
    prompt: q('.boogler-tag-prompt'),
    say: q('.boogler-say'),
    sayText: q('.boogler-say-text'),
    find: q('.boogler-find'),
    arrow: q('.boogler-find-arrow'),
    dist: q('.boogler-find-dist'),
  };
  hud.prepend(...wrap.children);
  return el;
}

const bubble = { text: '', until: 0, shown: '' };
export function booglerSay(text, ms = 1600) {
  bubble.text = text;
  bubble.until = performance.now() + ms;
}

let bondText = null;
const bondShown = { text: '', wary: false };
export function setTagBond(level, wary) {
  bondText = wary ? 'avoiding you' : '♥'.repeat(level) + '♡'.repeat(MAX_LEVEL - level);
  bondShown.wary = wary;
}

// The interact prompt in the tag: his target's show() (see talkTargets in src/boogler/play.js), called by
// src/features/prompt.js with the markup, '' for none. Drawn right away, so it changes on the same frame as the
// floating prompt whichever of the two hooks runs first.
let promptShown = '';
export function setTagPrompt(html) {
  const d = dom();
  if (!d || html === promptShown) return;
  const fresh = !promptShown;
  d.prompt.innerHTML = promptShown = html;
  d.prompt.hidden = !html;
  if (fresh && html) {
    d.prompt.classList.remove('pop');
    void d.prompt.offsetWidth; // restart the pop-in animation
    d.prompt.classList.add('pop');
  }
}

let lastDist = '';
export function updateBooglerHud() {
  const d = dom();
  if (!d) return;
  const w = innerWidth,
    h = innerHeight;
  const s = booglerScreen(w, h);

  d.tag.hidden = !s.onScreen;
  if (s.onScreen) d.tag.style.transform = `translate(${s.labelX.toFixed(1)}px, ${s.labelY.toFixed(1)}px)`;
  const bondNow = me.entered ? (bondText ?? '') : '';
  if (bondNow !== bondShown.text) {
    d.bond.textContent = bondShown.text = bondNow;
    d.bond.classList.toggle('wary', bondShown.wary);
  }
  const talking = s.onScreen && performance.now() < bubble.until;
  if (d.say.hidden === talking) d.say.hidden = !talking;
  if (talking && bubble.shown !== bubble.text) {
    d.sayText.textContent = bubble.shown = bubble.text;
    d.say.classList.remove('pop');
    void d.say.offsetWidth; // restart the pop-in animation
    d.say.classList.add('pop');
  }
  if (!talking) bubble.shown = '';

  const dist = me.body ? Math.hypot(boogler.disp.x - me.body.position.x, boogler.disp.z - me.body.position.z) : 0;
  const fade = Math.round(clamp((FIND_FAR - dist) / (FIND_FAR - FIND_NEAR), 0, 1) * 20) / 20;
  const showFind = !s.onScreen && me.entered && fade > 0;
  d.find.hidden = !showFind;
  if (!showFind) return;
  if (d.find.style.opacity !== String(fade)) d.find.style.opacity = String(fade);

  // Walk from the screen centre toward him until we hit the inset rectangle.
  const len = Math.hypot(s.dirX, s.dirY);
  const dx = s.dirX / len,
    dy = s.dirY / len;
  const hw = Math.max(1, w / 2 - EDGE_X),
    hh = Math.max(1, h / 2 - EDGE_Y);
  const t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
  const x = w / 2 + dx * t,
    y = h / 2 + dy * t;
  d.find.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  d.arrow.style.transform = `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)`;

  const text = `${Math.round(dist)} m`;
  if (text !== lastDist) d.dist.textContent = lastDist = text;
}
