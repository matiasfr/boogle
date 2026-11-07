// Adaptive resolution: the render pixel ratio follows the frame time. A frame-time moving average above the slow line
// for 2 s steps the ratio down 10 %; at the display's cadence for 5 s steps it back up, between 0.6x and 1x of
// min(devicePixelRatio, 2). At most one change every 2 s and none in the first 5 s; a hidden tab does not count.
// It starts where this device last settled, or at 0.8x on a first touch visit, so a phone doesn't spend its first seconds
// finding out. `?dpr=fixed` (the look/scenario harness) keeps the full ratio so images stay comparable. Serves DESIGN.md
// 10 (slapstick needs a steady frame rate: on a phone it beats a few extra pixels). Sync kind: Local (this tab's GPU only).
//
// The cadence is the interval the browser actually delivers frames at when nothing is late: the 10th percentile of the
// last 2 s of intervals. Safari caps requestAnimationFrame at 60 Hz even on a 120 Hz iPad, and at 30 Hz in Low Power
// Mode (docs/research/webgpu-on-ipad.md, recommendation 3), so a steady 33 ms there is the cap, not a slow GPU: the
// slow line is max(18.5 ms, 1.08 x cadence). No browser caps below 30 Hz, so the cadence stops at 34 ms and anything
// slower counts as slow. A steady 30 fps still reads as the cap, whatever causes it. Frame times are measured here
// because the frame's dt stops at 50 ms, which would hide the slowest devices. A ratio that steps up and is slow again
// within 10 s doubles the wait before the next try (up to a minute), so a device on the edge settles instead of swinging
// every few seconds.
//
// The detail governor continues the same ladder below the resolution floor (owner call, 7 November 2026: resolution,
// then sea detail, then sun shadows, then MSAA). Still slow for 4 s at 0.6x, it steps one rung down; at the display's
// cadence for 10 s (doubling like the resolution's, when a restored rung does not hold) it restores the last rung shed,
// and only with every rung restored does resolution climb again. MSAA is reload-only, so its rung is a flag for the
// next load that the governor never lifts by itself; a player's Detail or preset choice clears it. The rung is
// remembered per device (graphics-settings.ts), so a phone starts where it settled. Pause → Graphics → Detail fixes a
// rung instead. Measured, not detected: browsers don't name the GPU (iPads report as Macs), and the M4 iPad Pro, the
// lowest full-quality target, should never reach the floor, so it keeps every rung.
import { MAX_DPR, FIXED_DPR, setAdaptiveResolution } from '../render/quality.ts';
import { onFrame } from '../loop.ts';
import { isTouch } from '../constants.ts';
import {
  DETAIL_RUNGS,
  autoDetail,
  autoRung,
  graphicsInitial,
  graphicsSnapshot,
  registerGraphics,
  setAutoDetail,
} from '../graphics-settings.ts';

const MAX = MAX_DPR;
const MIN = MAX * 0.6;
const SLOW_MS = 18.5;
const SLOW_K = 1.08; // of the cadence
const CADENCE_MAX = 34; // ms: Low Power Mode's 30 Hz, the slowest cap a browser sets
const LONGEST = 250; // ms: one frame's weight, so a single hitch can't fill the 2 s
const FIRST_TOUCH = 0.8; // of MAX
const KEY = 'boogle.resolution'; // of MAX, as this device last settled
const DOWN_AFTER = 2,
  UP_AFTER = 5,
  UP_MAX = 60,
  RETRY_WINDOW = 10,
  COOLDOWN = 2,
  WARMUP = 5, // seconds
  SHED_AFTER = 4, // seconds slow at the resolution floor before a rung goes
  RESTORE_AFTER = 10; // seconds at cadence before a rung comes back

const N = 120; // frame intervals kept for the cadence (2 s at 60 Hz)
const ring = new Float32Array(N);
const sorted = new Float32Array(N);
let filled = 0,
  head = 0,
  cadence = 16.7; // ms

function saved() {
  try {
    const v = parseFloat(localStorage.getItem(KEY) ?? '');
    return v >= 0.6 && v <= 1 ? v : null;
  } catch {
    return null; // storage unavailable: a first visit every time
  }
}

let ratio = MAX,
  prev = 0, // the last frame's stamp, ms
  ema = 16.7,
  slow = 0,
  fast = 0,
  sinceChange = 0,
  sinceUp = Infinity,
  upAfter = UP_AFTER,
  restoreAfter = RESTORE_AFTER,
  age = 0;

const DETAIL_CHOICES = ['auto', ...DETAIL_RUNGS] as const;
registerGraphics({
  id: 'detail',
  label: 'Detail',
  choices: DETAIL_CHOICES,
  default: 'auto',
  applyMode: 'live',
  cost: 'sea vertices, shadow pass, multisampling',
  skips:
    'Auto sheds sea detail, then sun shadows, then MSAA (next load) once resolution is at its floor; a rung fixes it.',
  hitch: 'Shadows off or on builds material pipelines on first use.',
  read: () => graphicsInitial('detail', DETAIL_CHOICES, 'auto'),
  apply: () => {}, // graphics-settings applies the rung's values to their owners
});

/** One rung down; false when nothing is left to shed or a fixed Detail choice holds it. */
function shed() {
  const { rung, msaaOff, governing } = autoDetail();
  if (!governing) return false;
  if (rung < 2) setAutoDetail(rung + 1, msaaOff);
  else if (!msaaOff && graphicsSnapshot().find((row) => row.id === 'msaa')?.effective === true)
    setAutoDetail(rung, true);
  else return false;
  return true;
}
/** The last live rung back; false at full detail. */
function restore() {
  const { rung, msaaOff, governing } = autoDetail();
  if (!governing || rung === 0) return false;
  setAutoDetail(rung - 1, msaaOff);
  return true;
}

function apply(r: number) {
  ratio = Math.min(MAX, Math.max(MIN, r));
  setAdaptiveResolution(ratio / MAX); // the shared owner combines this request with the water ceiling and Dev override
  slow = fast = 0;
  sinceChange = 0;
}

function remember() {
  try {
    localStorage.setItem(KEY, (ratio / MAX).toFixed(2));
  } catch {
    // storage unavailable: the next visit starts over
  }
}

function measureCadence() {
  sorted.set(ring);
  sorted.subarray(0, filled).sort();
  cadence = Math.min(CADENCE_MAX, Math.max(4, sorted[Math.floor(filled * 0.1)]!));
}

if (!FIXED_DPR) {
  apply(MAX * (saved() ?? (isTouch ? FIRST_TOUCH : 1)));
  onFrame(
    ({ now }) => {
      if (document.visibilityState !== 'visible') return;
      const ms = prev ? Math.min(now - prev, LONGEST) : 0;
      prev = now;
      if (ms <= 0) return;
      const dt = ms / 1000;
      age += dt;
      sinceChange += dt;
      sinceUp += dt;
      ema += (ms - ema) * 0.1;
      ring[head] = ms;
      head = (head + 1) % N;
      if (filled < N) filled++;
      if (head % 30 === 0) measureCadence();
      slow = ema > Math.max(SLOW_MS, cadence * SLOW_K) ? slow + dt : 0;
      fast = ema < cadence * 1.06 ? fast + dt : 0;
      if (age < WARMUP || sinceChange < COOLDOWN) return;
      if (slow >= DOWN_AFTER && ratio > MIN + 1e-3) {
        if (sinceUp < RETRY_WINDOW) upAfter = Math.min(UP_MAX, upAfter * 2); // that step up did not hold
        apply(ratio - MAX * 0.1);
        remember();
      } else if (slow >= SHED_AFTER && ratio <= MIN + 1e-3) {
        if (sinceUp < RETRY_WINDOW) restoreAfter = Math.min(UP_MAX, restoreAfter * 2); // that restore did not hold
        shed();
        slow = fast = sinceChange = 0; // shed or not, look again after the cooldown rather than every frame
      } else if (fast >= restoreAfter && autoRung() > 0) {
        if (restore()) {
          slow = fast = sinceChange = 0;
          sinceUp = 0;
        }
      } else if (fast >= upAfter && ratio < MAX - 1e-3) {
        apply(ratio + MAX * 0.1);
        remember();
        sinceUp = 0;
      }
    },
    { phase: 'late', order: 2500 },
  );
}

document.addEventListener('visibilitychange', () => {
  slow = fast = 0; // a hidden tab's long frames say nothing about the GPU
  prev = 0;
  ema = cadence;
  filled = head = 0;
});
