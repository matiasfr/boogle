// Screen-space HUD for The Boogler: a bouncy name tag over his head while he's on screen, and a pointer pinned to the
// nearest screen edge (aimed at him, with his distance) while he's off screen, so he's always easy to find.
import { boogler, booglerScreen } from './boogler.js';
import { me } from './player.js';

const EDGE_X = 46; // pointer inset from the left/right edges, px
const EDGE_Y = 58; // pointer inset from the top/bottom edges, px

const MARKUP = `
  <div class="boogler-tag" hidden><div class="boogler-tag-bob">The Boogler</div></div>
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
    find: q('.boogler-find'),
    arrow: q('.boogler-find-arrow'),
    dist: q('.boogler-find-dist'),
  };
  hud.prepend(...wrap.children);
  return el;
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

  const showFind = !s.onScreen && me.entered;
  d.find.hidden = !showFind;
  if (!showFind) return;

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

  if (me.body) {
    const p = me.body.position;
    const text = `${Math.round(Math.hypot(boogler.disp.x - p.x, boogler.disp.z - p.z))} m`;
    if (text !== lastDist) d.dist.textContent = lastDist = text;
  }
}
