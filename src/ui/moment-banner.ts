// The one presenter for the railway's full-screen moments, and the one check that says whether one is showing.
//
//   showMomentBanner(title, line, s)  Place's banner style (its deleted celebrate.ts showBanner): a big line and an
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
  clearTimeout(pumpTimer);
  pumpTimer = window.setTimeout(pump, seconds * 1000);
}

// ---------------------------------------------------------------- the queue
// The act is the bigger beat: when one rises, its card goes first, and any ordinary banner raised meanwhile (or showing
// with less than half its time gone) waits for the card to finish. A banner more than half shown finishes first, and the
// card waits for it (src/features/acts.ts).
type Plain = { title: string; line: string; seconds: number };
const queued: Plain[] = [];
let actWaiting = false; // an act has risen and its card is on its way
let actUntil = 0; // performance.now() ms when the act card is over
let plainAt = 0,
  plainFor = 0; // when the plain banner on screen came up, and for how long
let pumpTimer = 0;
const actBusy = () => actWaiting || performance.now() < actUntil;
/** An act card is rising or showing: a shot that would play over it waits (the Meet's, ring-meet/view.ts). */
export const actShowing = actBusy;
function pump() {
  if (actBusy()) return;
  const next = queued.shift();
  if (next) showMomentBanner(next.title, next.line, next.seconds);
}

export function showMomentBanner(title: string, line = '', seconds = 3.4) {
  if (actBusy()) return void queued.push({ title, line, seconds });
  const el = element();
  el.classList.remove('act');
  plainAt = performance.now();
  plainFor = seconds;
  present(el, '', title, line, seconds, seconds);
}

/** An act has risen: a plain banner less than half shown steps aside until the card has finished. */
export function actRising() {
  actWaiting = true;
  if (banner?.classList.contains('on') && !banner.classList.contains('act')) {
    if (performance.now() - plainAt < plainFor * 500) {
      queued.unshift({ title: big.textContent ?? '', line: small.textContent ?? '', seconds: plainFor });
      banner.classList.remove('on');
      clearTimeout(timer);
      holdCamera(bannerKey, false);
    }
  }
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
  actWaiting = false;
  actUntil = performance.now() + seconds * 1000;
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
