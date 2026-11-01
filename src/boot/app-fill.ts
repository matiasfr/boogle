// Home Screen web app (standalone) on iPad and iPhone: the full-screen layers reach the bottom of the screen. With
// `viewport-fit=cover` and the `black-translucent` status bar, WebKit lays `position: fixed; inset: 0` (and 100%, 100vh,
// -webkit-fill-available) out against a viewport that is short of the screen by about the status bar, which left an
// unrendered strip along the bottom in the owner's November 2026 playtest (WebKit bug 237961, open since iOS 15).
// So in standalone mode only, html.app-fill sizes the canvas, HUD, touch layer, lobby and overlays to --app-h, measured
// here: the largest of innerHeight, the visual viewport and the root's height, or the screen's own height when the app
// spans the screen's full width and is within a status bar of its height (a Split View or Stage Manager window is
// left alone). Re-measured on resize, rotation, visual-viewport changes and a few times while the status bar settles.
// The HUD keeps its safe-area insets; scene.ts sizes the drawing buffer from the canvas box. Safari tabs are untouched.
// Local only. Serves DESIGN.md "Designed for drop-in, drop-out": the Home Screen app is the iPad's full-screen way in.
import './app-fill.css';

const nav = navigator as Navigator & { standalone?: boolean };
export const standalone =
  nav.standalone === true || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;

const STATUS_BAR_MAX = 80; // px: the most the short viewport is ever off by (a status bar plus a home indicator)

export function measure() {
  const root = document.documentElement;
  let h = Math.max(innerHeight, visualViewport?.height ?? 0, root.clientHeight);
  // iOS keeps screen.width/height in portrait; take the orientation from the window.
  const landscape = innerWidth > innerHeight;
  const sw = landscape ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  const sh = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  if (Math.abs(innerWidth - sw) <= 1 && h < sh && sh - h <= STATUS_BAR_MAX) h = sh;
  root.style.setProperty('--app-h', `${Math.round(h)}px`);
}

if (standalone) {
  document.documentElement.classList.add('app-fill');
  measure();
  for (const ev of ['resize', 'orientationchange', 'pageshow']) addEventListener(ev, measure);
  visualViewport?.addEventListener('resize', measure);
  for (const ms of [100, 400, 1200, 3000]) setTimeout(measure, ms); // the status bar settles after launch
}
