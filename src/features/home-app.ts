// The Home Screen app reopens where you last played. The installed app launches the manifest's bare start_url, which
// drops ?room= and ?proto= (research/sharing-and-joining.md rec 5), so every visit with a room or a prototype is
// remembered (localStorage, plus a cookie, which Safari copies into the app when it is added). A bare launch of the app
// by a returning player (src/player/arrival.ts) goes straight back there; on a first visit in the app (its storage
// starts empty, only the cookie came along) the card offers a one-tap "Continue in room x · prototype y" instead. A
// visit to the plain island forgets it.
// Local only. Serves DESIGN.md "Designed for drop-in, drop-out": prototype playtests work from the Home Screen too.
import './home-app.css';
import { standalone } from '../boot/app-fill.ts';
import { launchQuery, describeLaunch, fromCookie, COOKIE } from '../last-launch.ts';
import { dom } from '../player/hud.ts';
import { showCard } from '../player/arrival.ts';

const KEY = 'boogle.lastLaunch';
const YEAR_S = 365 * 24 * 3600;

function remember(query: string) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  try {
    if (query) localStorage.setItem(KEY, query);
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: the cookie still carries it
  }
  document.cookie = query
    ? `${COOKIE}=${encodeURIComponent(query)}; Max-Age=${YEAR_S}; Path=/; SameSite=Lax${secure}`
    : `${COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
}

function recall(): string {
  try {
    const q = launchQuery(localStorage.getItem(KEY) ?? '');
    if (q) return q;
  } catch {
    // fall through to the cookie
  }
  return fromCookie(document.cookie);
}

const here = launchQuery(location.search);
if (!standalone || here) remember(here);
else {
  const last = recall();
  if (last && !showCard()) location.replace(`${location.pathname}?${last}`);
  else if (last) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'continue-last';
    b.textContent = `Continue in ${describeLaunch(last)}`;
    b.addEventListener('click', () => location.replace(`${location.pathname}?${last}`));
    dom.enterBtn.after(b);
  }
}
