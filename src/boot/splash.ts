// The loading screen: key art, the title and a progress bar, from the first paint until the island can be drawn
// (shaders compiled, one frame out). The page's entry (./index.ts) shows it before it starts downloading the game.
// Local only.
//
//   splashStage(from, to, label)   a new step: the bar jumps to `from` and creeps toward `to` until the next call
//   splashProgress(f)              how far through the current step (0..1), when a step can tell
//   splashDone()                   fill the bar, fade out, remove
//
// A step that cannot report progress (a single compileAsync, a download) still moves: the bar eases toward `to`
// and slows as it gets near, so it never sits still and never claims to be done early.
import './splash.css';
import art from './splash-art.jpg'; // prompt and reference: dev/concepts/splash.json; 1280 px, picked from a contact sheet

const CREEP_S = 2.5; // time constant of the creep toward a step's end
const CREEP_MAX = 0.85; // a step that cannot report gets this far through on its own, at most
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.createElement('div');
root.className = 'splash';
root.setAttribute('role', 'progressbar');
root.setAttribute('aria-label', 'Loading Boogle');
root.setAttribute('aria-valuemin', '0');
root.setAttribute('aria-valuemax', '100');
root.innerHTML = `
  <img class="splash-art" alt="" decoding="async" />
  <div class="splash-title">B<span class="o">oo</span>gle</div>
  <div class="splash-foot">
    <div class="splash-bar"><div class="splash-fill"></div></div>
    <div class="splash-label"></div>
  </div>`;
const img = root.querySelector<HTMLImageElement>('.splash-art')!;
const fill = root.querySelector<HTMLElement>('.splash-fill')!;
const label = root.querySelector<HTMLElement>('.splash-label')!;
img.addEventListener('load', () => img.classList.add('in'), { once: true });
img.src = art;
document.body.append(root);

let from = 0;
let to = 0;
let at = 0; // known progress through the step, 0..1
let since = performance.now();
let shown = 0;
let done = false;
let last = performance.now();

function draw(now: number) {
  if (done) return;
  const creep = CREEP_MAX * (1 - Math.exp(-(now - since) / 1000 / CREEP_S));
  const target = from + (to - from) * Math.max(at, creep);
  const k = reduced ? 1 : 1 - Math.exp(-(now - last) / 120); // eases in about a tenth of a second, at any frame rate
  last = now;
  shown += (target - shown) * k;
  show(shown);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function show(f: number) {
  fill.style.transform = `scaleX(${f})`;
  root.setAttribute('aria-valuenow', String(Math.round(f * 100)));
}

export function splashStage(a: number, b: number, text: string) {
  if (done) return;
  from = Math.max(a, shown);
  to = Math.max(b, from);
  at = 0;
  since = performance.now();
  label.textContent = text;
}

export function splashProgress(f: number) {
  at = Math.max(at, Math.min(1, f));
}

export function splashDone() {
  if (done) return;
  done = true;
  label.textContent = 'Ready';
  show(1);
  root.classList.add('gone'); // fades while the bar fills; the lobby under it takes clicks from now on
  setTimeout(() => root.remove(), reduced ? 0 : 500);
}

splashStage(0, 0.3, 'Packing the beach bag');
