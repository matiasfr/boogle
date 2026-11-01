// Adaptive resolution: the render pixel ratio follows the frame time. A frame-time moving average above the slow line
// for 2 s steps the ratio down 10 %; at the display's cadence for 5 s steps it back up, between 0.6x and 1x of
// min(devicePixelRatio, 2). At most one change every 2 s and none in the first 5 s; a hidden tab does not count.
// `?dpr=fixed` (the look/scenario harness) keeps the full ratio so images stay comparable. Serves DESIGN.md 10
// (slapstick needs a steady frame rate: on a phone it beats a few extra pixels). Sync kind: Local (this tab's GPU only).
//
// The cadence is the interval the browser actually delivers frames at when nothing is late: the 10th percentile of the
// last 2 s of intervals. Safari caps requestAnimationFrame at 60 Hz even on a 120 Hz iPad, and at 30 Hz in Low Power
// Mode (docs/research/webgpu-on-ipad.md, recommendation 3), so a steady 33 ms there is the cap, not a slow GPU: the
// slow line is max(18.5 ms, 1.15 x cadence). A ratio that steps up and is slow again within 10 s doubles the wait
// before the next try (up to a minute), so a device on the edge settles instead of swinging every few seconds.
import { renderer, MAX_DPR, FIXED_DPR } from '../render/scene.ts';
import { onFrame } from '../loop.ts';

const MAX = MAX_DPR;
const MIN = MAX * 0.6;
const SLOW_MS = 18.5;
const DOWN_AFTER = 2,
  UP_AFTER = 5,
  UP_MAX = 60,
  RETRY_WINDOW = 10,
  COOLDOWN = 2,
  WARMUP = 5; // seconds

const N = 120; // frame intervals kept for the cadence (2 s at 60 Hz)
const ring = new Float32Array(N);
const sorted = new Float32Array(N);
let filled = 0,
  head = 0,
  cadence = 16.7; // ms

let ratio = MAX,
  ema = 16.7,
  slow = 0,
  fast = 0,
  sinceChange = 0,
  sinceUp = Infinity,
  upAfter = UP_AFTER,
  age = 0;

function apply(r: number) {
  ratio = Math.min(MAX, Math.max(MIN, r));
  renderer.setPixelRatio(ratio); // resizes the drawing buffer and leaves the canvas's CSS size alone
  slow = fast = 0;
  sinceChange = 0;
}

function measureCadence() {
  sorted.set(ring);
  sorted.subarray(0, filled).sort();
  cadence = Math.min(50, Math.max(4, sorted[Math.floor(filled * 0.1)]));
}

if (!FIXED_DPR)
  onFrame(
    ({ dt }) => {
      if (document.visibilityState !== 'visible' || dt <= 0) return;
      const ms = dt * 1000;
      age += dt;
      sinceChange += dt;
      sinceUp += dt;
      ema += (ms - ema) * 0.1;
      ring[head] = ms;
      head = (head + 1) % N;
      if (filled < N) filled++;
      if (head % 30 === 0) measureCadence();
      slow = ema > Math.max(SLOW_MS, cadence * 1.15) ? slow + dt : 0;
      fast = ema < cadence * 1.06 ? fast + dt : 0;
      if (age < WARMUP || sinceChange < COOLDOWN) return;
      if (slow >= DOWN_AFTER && ratio > MIN + 1e-3) {
        if (sinceUp < RETRY_WINDOW) upAfter = Math.min(UP_MAX, upAfter * 2); // that step up did not hold
        apply(ratio - MAX * 0.1);
      } else if (fast >= upAfter && ratio < MAX - 1e-3) {
        apply(ratio + MAX * 0.1);
        sinceUp = 0;
      }
    },
    { phase: 'late', order: 2500 },
  );

document.addEventListener('visibilitychange', () => {
  slow = fast = 0; // a hidden tab's long frames say nothing about the GPU
  ema = cadence;
  filled = head = 0;
});
