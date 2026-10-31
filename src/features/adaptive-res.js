// Adaptive resolution: the render pixel ratio follows the frame time. A frame-time moving average above ~18.5 ms for 2 s
// steps the ratio down 10 %; under 14 ms for 5 s steps it back up, between 0.6x and 1x of min(devicePixelRatio, 2).
// At most one change every 2 s and none in the first 5 s; a hidden tab does not count. Automated browsers (headless
// stills and scenarios) keep the full ratio so their images stay comparable. Serves DESIGN.md 9 (a steady frame rate
// on a phone beats a few extra pixels). Sync kind: Local (this tab's GPU only).
import { renderer } from '../render/scene.js';
import { onFrame } from '../loop.js';

const MAX = Math.min(devicePixelRatio, 2);
const MIN = MAX * 0.6;
const SLOW_MS = 18.5,
  FAST_MS = 14;
const DOWN_AFTER = 2,
  UP_AFTER = 5,
  COOLDOWN = 2,
  WARMUP = 5; // seconds

let ratio = MAX,
  ema = 16.7,
  slow = 0,
  fast = 0,
  sinceChange = 0,
  age = 0;

function apply(r) {
  ratio = Math.min(MAX, Math.max(MIN, r));
  renderer.setPixelRatio(ratio);
  renderer.setSize(innerWidth, innerHeight, false); // setPixelRatio resizes with the CSS style; keep the canvas CSS-sized
  slow = fast = 0;
  sinceChange = 0;
}

if (!navigator.webdriver)
  onFrame(
    ({ dt }) => {
      if (document.visibilityState !== 'visible' || dt <= 0) return;
      age += dt;
      sinceChange += dt;
      ema += (dt * 1000 - ema) * 0.1;
      slow = ema > SLOW_MS ? slow + dt : 0;
      fast = ema < FAST_MS ? fast + dt : 0;
      if (age < WARMUP || sinceChange < COOLDOWN) return;
      if (slow >= DOWN_AFTER && ratio > MIN + 1e-3) apply(ratio - MAX * 0.1);
      else if (fast >= UP_AFTER && ratio < MAX - 1e-3) apply(ratio + MAX * 0.1);
    },
    { phase: 'late', order: 2500 },
  );

document.addEventListener('visibilitychange', () => {
  slow = fast = 0; // a hidden tab's long frames say nothing about the GPU
  ema = 16.7;
});
