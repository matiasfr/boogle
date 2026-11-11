// The one presenter for the railway's full-screen moments, and the one check that says whether one is showing.
//
//   showMomentBanner(title, line, s)  Place's banner style (src/proto/place/celebrate.ts, showBanner): a big line and an
//                                     optional small one, high on the screen for a few seconds
//   showActCard(card)                 the same element as a quiet full-screen title: "Act 2" over a camera move or live
//                                     play, no panel, no input taken
//
// Whether a full-screen moment is showing is the camera's one list, `momentBusy` in src/render/buddy-frame.ts; banners and
// act cards report their time there with the pull-outs and the reward card.
// Local and cosmetic; inside .hud.
import './moment-banner.css';
import { holdCamera } from '../render/buddy-frame.ts';

const FADE_S = 1; // the act card's fade in and out (moment-banner.css, .act)
const bannerKey = {};

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
  holdCamera(bannerKey, true, seconds);
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
/** The banner's text while it shows, else null (for inspect). */
export const momentBanner = () =>
  banner?.classList.contains('on')
    ? [kick, big, small]
        .map((c) => c.textContent)
        .filter(Boolean)
        .join(' — ')
    : null;
