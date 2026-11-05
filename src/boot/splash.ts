// The loading screen: key art, the title, a progress bar and a turning gear, from the first paint until the island can
// be drawn (shaders compiled, one frame out). The page's entry (./index.ts) shows it before it starts downloading the
// game. Local only. The gear is a CSS transform, which the compositor runs, so it keeps turning while the bar waits on
// a busy main thread.
//
//   splashStage(from, to)          a new step: the decorative bar creeps toward `to` until the next call
//   splashProgress(f)              how far through the current step (0..1), when a step can tell
//   splashDone(failed?)             fade out at the existing handoff; retain unfinished work below the game
//
// A step that cannot report progress (a single compileAsync, a download) still moves: the bar eases toward `to`
// and slows as it gets near, so it never sits still and never claims to be done early.
import './splash.css';
import art from './splash-art.jpg'; // prompt and reference: dev/concepts/splash.json; 1280 px, picked from a contact sheet
import { bootMark, bootMarks, onBootMark, bootStatus, mountLoadDetails } from './timeline.ts';

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
    <div class="load-strip"><div class="load-groups"></div><div class="load-room"></div></div>
  </div>`;
const img = root.querySelector<HTMLImageElement>('.splash-art')!;
const fill = root.querySelector<HTMLElement>('.splash-fill')!;
const label = root.querySelector<HTMLElement>('.splash-label')!;
img.addEventListener('load', () => img.classList.add('in'), { once: true });
img.src = art;
document.body.append(root);
const groups = root.querySelector<HTMLElement>('.load-groups')!;
const room = root.querySelector<HTMLElement>('.load-room')!;
const strip = root.querySelector<HTMLElement>('.load-strip')!;
const disposeDetails = mountLoadDetails(strip);
const carry = document.createElement('div');
carry.className = 'load-carry';
carry.setAttribute('role', 'status');
function statusText() {
  const rows = bootStatus();
  groups.replaceChildren(
    ...rows.slice(0, 4).map((row) => {
      const cell = document.createElement('div');
      const title = document.createElement('strong');
      const state = document.createElement('span');
      title.textContent = row.name;
      state.textContent = row.state;
      cell.dataset.state = row.state;
      cell.append(title, state);
      return cell;
    }),
  );
  room.textContent = `${rows[4]!.name}: ${rows[4]!.state}`;
  const failed = bootMarks().some((m) => m.name === 'failed');
  const pending = rows.slice(0, 4).filter((r) => r.state !== 'Done');
  const active = pending.find((r) => r.state !== 'Waiting');
  label.textContent = failed ? 'Loading failed' : active ? `${active.name}: ${active.state}` : 'Opening island';
  if (done) {
    carry.textContent = failed
      ? 'Loading failed'
      : pending
          .map((r) => (r.state.startsWith('Failed') ? `${r.name}: ${r.state}` : `${r.name} still preparing`))
          .join(' · ');
    if (carry.textContent) document.body.append(carry);
    else carry.remove();
    if (!pending.length && !failed) disposeStatus();
  }
}
const disposeStatus = onBootMark(statusText);

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
}

export function splashProgress(f: number) {
  at = Math.max(at, Math.min(1, f));
}

export function splashDone(failed = false) {
  if (done) return;
  if (failed) bootMark('failed');
  done = true;
  statusText();
  if (
    !failed &&
    bootStatus()
      .slice(0, 4)
      .every((r) => r.state === 'Done')
  )
    show(1);
  root.classList.add('gone'); // fades while the bar fills; the lobby under it takes clicks from now on
  setTimeout(
    () => {
      root.remove();
      disposeDetails();
    },
    reduced ? 0 : 500,
  );
}

splashStage(0, 0.3);
statusText();
