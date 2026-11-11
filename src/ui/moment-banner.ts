// The one presenter for the railway's full-screen moments, and the one check that says whether one is showing.
//
//   showMomentBanner(title, line, s)  Place's banner style (src/proto/place/celebrate.ts, showBanner): a big line and an
//                                     optional small one, high on the screen for a few seconds
//   showActCard(card)                 the same element as a quiet full-screen title: "Act 2" over a camera move or live
//                                     play, no panel, no input taken
//   endActCard()                      starts an act card's fade early
//   holdMoment(key, secondsLeft)      a moment reports that it is showing and for how long (null: it is over). The camera
//                                     pull-outs (src/render/camera-pull-out.ts) and the reward card
//                                     (src/render/reward-reveal.ts) call it; the banners and act cards report themselves
//   momentBusy(slackS)                something full-screen is showing and has more than `slackS` seconds to go, or the
//                                     pause view is open. The act card asks it before it comes up, so two full-screen
//                                     moments never stack and the act waits its turn (src/features/acts.ts)
// Local and cosmetic; inside .hud.
import './moment-banner.css';
import { modalOpen } from '../player/modal.ts';

const FADE_S = 1; // the act card's fade in and out (moment-banner.css, .act)
const bannerKey = {};
/** Each moment's end, in performance.now() ms (Infinity: until it releases). */
const holds = new Map<object, number>();

export function holdMoment(key: object, secondsLeft: number | null) {
  if (secondsLeft === null) holds.delete(key);
  else holds.set(key, performance.now() + secondsLeft * 1000);
}
export function momentBusy(slackS = 0) {
  if (modalOpen()) return true;
  const edge = performance.now() + slackS * 1000;
  for (const end of holds.values()) if (end > edge) return true;
  return false;
}

let banner: HTMLElement | null = null;
let kick: HTMLElement, big: HTMLElement, small: HTMLElement;
let timer = 0;
function element() {
  if (!banner) {
    banner = document.createElement('div');
    banner.className = 'moment-banner';
    banner.setAttribute('role', 'status');
    kick = document.createElement('i');
    big = document.createElement('b');
    small = document.createElement('span');
    banner.append(kick, big, small);
    (document.querySelector('.hud') ?? document.body).append(banner);
  }
  return banner;
}
function present(el: HTMLElement, above: string, title: string, line: string, seconds: number, fadeAt: number) {
  kick.textContent = above;
  big.textContent = title;
  small.textContent = line;
  el.classList.remove('on');
  void el.offsetWidth; // so the animation runs again
  el.classList.add('on');
  holdMoment(bannerKey, seconds);
  clearTimeout(timer);
  timer = window.setTimeout(() => el.classList.remove('on'), fadeAt * 1000);
}

export function showMomentBanner(title: string, line = '', seconds = 3.4) {
  const el = element();
  el.classList.remove('act');
  present(el, '', title, line, seconds, seconds);
}

export type ActCard = {
  /** The small line above the title; empty when the title is the number. */
  above: string;
  title: string;
  seconds: number;
};
export function showActCard({ above, title, seconds }: ActCard) {
  const el = element();
  el.classList.add('act');
  present(el, above, title, '', seconds, Math.max(0, seconds - FADE_S));
}
export function endActCard() {
  if (!banner?.classList.contains('act') || !banner.classList.contains('on')) return;
  clearTimeout(timer);
  banner.classList.remove('on');
  holdMoment(bannerKey, FADE_S);
}

/** The banner's text while it shows, else null (for inspect). */
export const momentBanner = () =>
  banner?.classList.contains('on')
    ? [kick, big, small]
        .map((c) => c.textContent)
        .filter(Boolean)
        .join(' — ')
    : null;
