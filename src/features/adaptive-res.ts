// Adaptive resolution: the render pixel ratio follows the frame time, between 0.6x and 1x of min(devicePixelRatio, 2),
// in 10 % steps. The rules (when a step goes down or up, the probing back-off, the detail rungs below the floor) are pure
// logic in src/render/resolution-governor.ts, tested against simulated vsynced frames. This file feeds it frame
// intervals (measured here because the frame's dt stops at 50 ms, which would hide the slowest devices), applies its
// steps and remembers the ratio; a hidden tab does not count. A load starts where this device last settled but never
// below 0.8x (a reload after a heavy spot used to start at the floor), or at 0.8x on a first touch visit, so a phone
// doesn't spend its first seconds finding out. `?dpr=fixed` (the look/scenario harness) keeps the full ratio so images
// stay comparable. Serves DESIGN.md 10 (slapstick needs a steady frame rate: on a phone it beats a few extra pixels).
// Sync kind: Local (this tab's GPU only).
//
// The detail governor continues the same ladder below the resolution floor (owner call, 7 November 2026: resolution,
// then sea detail, then sun shadows, then MSAA). Still slow for 4 s at 0.6x, it steps one rung down; calm for 10 s
// (doubling like the resolution's wait, when a restored rung does not hold) it restores the last rung shed,
// and only with every rung restored does resolution climb again. MSAA is reload-only, so its rung is a flag for the
// next load that the governor never lifts by itself; a player's Detail or preset choice clears it. The rung is
// remembered per device (graphics-settings.ts), so a phone starts where it settled. Pause → Graphics → Detail fixes a
// rung instead. Measured, not detected: browsers don't name the GPU (iPads report as Macs), and the M4 iPad Pro, the
// lowest full-quality target, should never reach the floor, so it keeps every rung.
import { FIXED_DPR, setAdaptiveResolution } from '../render/quality.ts';
import { onFrame } from '../loop.ts';
import { playMark } from '../proto/mark.ts';
import { isTouch } from '../constants.ts';
import { createGovernor, startRatio } from '../render/resolution-governor.ts';
import {
  DETAIL_RUNGS,
  autoDetail,
  autoRung,
  graphicsInitial,
  graphicsSnapshot,
  registerGraphics,
  setAutoDetail,
} from '../graphics-settings.ts';

const KEY = 'boogle.resolution'; // of MAX, as this device last settled

function saved() {
  try {
    const v = parseFloat(localStorage.getItem(KEY) ?? '');
    return Number.isFinite(v) ? v : null;
  } catch {
    return null; // storage unavailable: a first visit every time
  }
}

const governor = createGovernor(startRatio(saved(), isTouch));
let prev = 0; // the last frame's stamp, ms
const rungs = {
  canShed: true,
  get rungShed() {
    return autoRung() > 0;
  },
};

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

function apply() {
  setAdaptiveResolution(governor.ratio); // the shared owner combines this request with the water ceiling and Dev override
}

function remember() {
  try {
    localStorage.setItem(KEY, governor.ratio.toFixed(2));
  } catch {
    // storage unavailable: the next visit starts over
  }
}

if (!FIXED_DPR) {
  apply();
  onFrame(
    ({ now }) => {
      if (document.visibilityState !== 'visible') return;
      const ms = prev ? now - prev : 0;
      prev = now;
      // shed() and restore() check the Detail choice; the frame check stays allocation-free.
      const step = governor.frame(ms, rungs);
      if (step === 'down' || step === 'up') {
        apply();
        remember();
      } else if (step === 'shed' ? shed() : step === 'restore' && restore())
        playMark('detail changed', { step, rung: autoRung(), msaaOff: autoDetail().msaaOff }); // in the play data
    },
    { phase: 'late', order: 2500 },
  );
}

document.addEventListener('visibilitychange', () => {
  prev = 0;
  governor.reset(); // a hidden tab's long frames say nothing about the GPU
});
