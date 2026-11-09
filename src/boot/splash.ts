// The loading screen: key art, the title, a progress bar and a turning gear, from the first paint until the island can
// be drawn (shaders compiled, one frame out). The page's entry (./index.ts) shows it before it starts downloading the
// game. Local only. The gear is a CSS transform, which the compositor runs, so it keeps turning while the bar waits on
// a busy main thread.
//
//   splashStage(from, to)          a new step: the decorative bar creeps toward `to` until the next call
//   splashProgress(f)              how far through the current step (0..1), when a step can tell
//   splashDone(failed?)             fade out at the existing handoff
//   splashNote(text | null)        a line of its own in place of the loading steps (./jump-in.ts), null to clear
//
// A step that cannot report progress (a single compileAsync, a download) still moves: the bar eases toward `to`
// and slows as it gets near, so it never sits still and never claims to be done early.
import './splash.css';
import art from './splash-art.jpg'; // prompt and reference: dev/concepts/splash.json; 1280 px, picked from a contact sheet
import { bootMark, bootMarks, onBootMark } from './timeline.ts';

const CREEP_S = 2.5; // time constant of the creep toward a step's end
const CREEP_MAX = 0.85; // a step that cannot report gets this far through on its own, at most
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const root = document.createElement('div');
root.className = 'splash';
root.setAttribute('role', 'region');
root.setAttribute('aria-label', 'Loading Boogle');
root.innerHTML = `
  <img class="splash-art" alt="" decoding="async" />
  <div class="splash-title">B<span class="o">oo</span>gle</div>
  <div class="splash-foot">
    <div class="splash-progress" aria-hidden="true">
      <svg class="splash-gear" viewBox="-25 -25 50 50" aria-hidden="true">
        <path d="M15.0 -4.0L21.2 -3.7L21.2 3.7L15.0 4.0L13.4 7.7L17.6 12.3L12.3 17.6L7.8 13.4L4.0 15.0L3.7 21.2L-3.7 21.2L-4.0 15.0L-7.7 13.4L-12.3 17.6L-17.6 12.3L-13.4 7.7L-15.0 4.0L-21.2 3.7L-21.2 -3.7L-15.0 -4.0L-13.4 -7.8L-17.6 -12.3L-12.3 -17.6L-7.8 -13.4L-4.0 -15.0L-3.7 -21.2L3.7 -21.2L4.0 -15.0L7.8 -13.4L12.3 -17.6L17.6 -12.3L13.4 -7.8Z" />
        <circle r="5.5" />
      </svg>
      <div class="splash-bar"><div class="splash-fill"></div></div>
    </div>
    <div class="splash-label" role="status"></div>
  </div>`;
const img = root.querySelector<HTMLImageElement>('.splash-art')!;
const fill = root.querySelector<HTMLElement>('.splash-fill')!;
const label = root.querySelector<HTMLElement>('.splash-label')!;
img.addEventListener('load', () => img.classList.add('in'), { once: true });
img.src = art;
document.body.append(root);
// Draft owner copy. Sky baking precedes precompile on the default Place route.
// No timer advances reported shader progress; fast steps are skipped, never queued after completion.
const warmLabels = ['Warming up the shaders', 'Filling the sea', 'Oiling the train', 'Waking up the island'];
let warming = false;
let labelSince = -Infinity;
let labelPhase = '';
let note: string | null = null;
/** A line of its own in place of the loading steps (a jump-in's "Setting up …", or why it failed), until cleared. */
export function splashNote(text: string | null) {
  note = text;
  labelSince = -Infinity;
  statusText();
}
function statusText(now = performance.now()) {
  if (note !== null) {
    if (label.textContent !== note) label.textContent = note;
    label.style.visibility = '';
    return;
  }
  const has = (name: string) => bootMarks().some((m) => m.name === name);
  let phase = 'graphics';
  let text = 'Waking up the graphics';
  if (!has('modules')) {
    phase = 'files';
    text = 'Loading the game';
  } else if (has('world-start') && !has('props')) {
    phase = has('terrain') ? 'trees' : 'world';
    text = has('terrain') ? 'Planting the trees' : 'Building the island';
  } else if (has('sky-start') && !has('sky-ready')) {
    phase = 'sky';
    text = 'Baking the sky';
  } else if (warming && !has('warmup-complete')) {
    phase = 'warmup';
    text = warmLabels[Math.min(warmLabels.length - 1, Math.floor(at * warmLabels.length))]!;
  } else if (has('warmup-complete')) {
    phase = 'first';
    text = 'Waking up the island';
  }
  // Keep the current line through the readability hold, even if its phase just finished (owner follow-up).
  // Then show the latest active phase; never extend a boot gate or queue completed steps for copy.
  if (now - labelSince < 2000) return;
  if (label.textContent !== text || labelPhase !== phase) {
    label.textContent = text;
    labelPhase = phase;
    labelSince = now;
  }
  label.style.visibility = '';
}
const disposeStatus = onBootMark(() => statusText());

let from = 0;
let to = 0;
let at = 0; // known progress through the step, 0..1
let since = performance.now();
let shown = 0;
let done = false;
let last = performance.now();

function draw(now: number) {
  if (done) return;
  statusText(now);
  const creep = CREEP_MAX * (1 - Math.exp(-(now - since) / 1000 / CREEP_S));
  const target = from + (to - from) * Math.max(at, reduced ? 0 : creep);
  const k = reduced ? 1 : 1 - Math.exp(-(now - last) / 120); // eases in about a tenth of a second, at any frame rate
  last = now;
  shown += (target - shown) * k;
  show(shown);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

function show(f: number) {
  fill.style.transform = `scaleX(${f})`;
}

export function splashStage(a: number, b: number) {
  if (done) return;
  from = Math.max(a, shown);
  to = Math.max(b, from);
  at = 0;
  since = performance.now();
  warming = a === 0.45;
}

export function splashProgress(f: number) {
  at = Math.max(at, Math.min(1, f));
}

export function splashDone(failed = false) {
  if (done) return;
  if (failed) bootMark('failed');
  done = true;
  disposeStatus();
  if (failed) label.style.visibility = 'hidden';
  else show(1);
  root.classList.add('gone'); // fades while the bar fills; the lobby under it takes clicks from now on
  setTimeout(
    () => {
      root.remove();
    },
    reduced ? 0 : 500,
  );
}

splashStage(0, 0.3);
statusText();
