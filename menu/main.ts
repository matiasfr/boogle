// The menu (/menu/): where the pause view's Leave takes you. Its own page, so the game isn't running behind it: no
// rendering, no physics and no connection to the room. It's small on purpose, and the place for choosing another lobby if
// Boogle gets more of them. Serves DESIGN.md 8 (Designed for drop-in, and out).
import './menu.css';
import art from '../src/boot/splash-art.jpg';

document.body.style.backgroundImage = `url(${art})`;

const q = new URLSearchParams(location.search);
const name = (() => {
  try {
    return localStorage.getItem('boogle.name');
  } catch {
    return null;
  }
})();
if (name) document.getElementById('note')!.textContent = `${name} left the island.`;

// Back to the same address it left from: only ever a query on this site's game page.
const from = q.get('from') ?? '';
const back = document.getElementById('back') as HTMLAnchorElement;
back.href = new URL(`../${from.startsWith('?') ? from : ''}`, location.href).href;
back.focus();

// A controller's A or cross presses it, once whatever was held to get here is let go.
let held = true;
setInterval(() => {
  const pressed = [...navigator.getGamepads()].some((p) => p?.buttons[0]?.pressed);
  if (pressed && !held) back.click();
  held = pressed;
}, 80);
