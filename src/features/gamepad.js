// Gamepad play (Backbone on iPhone/iPad, or any controller with the "standard" mapping): left stick moves, right
// stick looks, buttons dispatch the actions in src/player/controls.js. While a pad is in use the touch overlay hides and the
// reticle shows; the next touch brings the touch controls back. Menu opens the pause view (src/features/pause.js).
// Local input only: no sim or network state. Serves "Designed for drop-in, drop-out": pick up whatever you have and
// play.
import './gamepad.css';
import { onFrame, onStart } from '../loop.js';
import { input } from '../player/input.js';
import { me, cam } from '../player/player.js';
import { clamp } from '../math.js';
import { dom } from '../player/hud.js';
import { canvas } from '../render/scene.js';
import { PAD, actionForSlot, padModal } from '../player/controls.js';

const DEAD = 0.15; // stick deadzone
const LOOK_YAW = 2.8; // rad/s at full right-stick deflection
const LOOK_PITCH = 1.8;
const PRESS = 0.4; // analog trigger threshold

const pressed = new Array(PAD.length).fill(false);
let active = false;
let modalOn = false;

// iPadOS also drives whatever has focus with the pad (a focused button gets "pressed" by A), so keep focus on the
// canvas while the pad plays. Leave text fields alone: the name box may be mid-edit.
function claimFocus() {
  const el = document.activeElement;
  if (el === canvas || el?.matches?.('input, textarea')) return;
  el?.blur?.();
  canvas.focus({ preventScroll: true });
}

const dead = (v) => (Math.abs(v) < DEAD ? 0 : (Math.sign(v) * (Math.abs(v) - DEAD)) / (1 - DEAD));

function setActive(on) {
  if (active === on) return;
  active = on;
  document.body.classList.toggle('gamepad', on);
  if (on) claimFocus();
  if (!on) {
    input.stickX = input.stickY = 0;
    releaseAll();
  }
}

function releaseAll() {
  for (let i = 0; i < PAD.length; i++) {
    if (pressed[i]) actionForSlot(PAD[i])?.up?.();
    pressed[i] = false;
  }
}

function poll(dt) {
  const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected);
  if (!pad) {
    if (active) setActive(false);
    return;
  }
  const lx = dead(pad.axes[0] ?? 0),
    ly = dead(pad.axes[1] ?? 0),
    rx = dead(pad.axes[2] ?? 0),
    ry = dead(pad.axes[3] ?? 0);
  const down = PAD.map((_, i) => {
    const b = pad.buttons[i];
    return !!b && (b.pressed || b.value > PRESS);
  });
  if (!active && (lx || ly || rx || ry || down.some(Boolean))) setActive(true);
  if (!active) return;

  // A modal moves focus between its own buttons, so it skips claimFocus. Held actions get their release on entry.
  const modal = padModal();
  if (modal) {
    if (!modalOn) for (let i = 0; i < PAD.length; i++) if (pressed[i]) actionForSlot(PAD[i])?.up?.();
    modalOn = true;
    input.stickX = input.stickY = 0;
    down.forEach((d, i) => {
      if (d && !pressed[i]) modal(PAD[i]);
      pressed[i] = d;
    });
    return;
  }
  modalOn = false;
  if (down.some((d, i) => d && !pressed[i])) claimFocus();

  // Before the island: A presses "Jump in".
  if (!me.entered) {
    input.stickX = input.stickY = 0;
    if (down[0] && !pressed[0] && !dom.enterBtn.disabled) dom.enterBtn.click();
    down.forEach((d, i) => (pressed[i] = d));
    return;
  }

  input.stickX = lx;
  input.stickY = ly;
  // Squared response: fine aim near the centre, fast turns at the edge.
  cam.yaw -= rx * Math.abs(rx) * LOOK_YAW * dt;
  cam.pitch = clamp(cam.pitch - ry * Math.abs(ry) * LOOK_PITCH * dt, -1.25, 0.9);

  for (let i = 0; i < PAD.length; i++) {
    const action = actionForSlot(PAD[i]);
    if (down[i] && !pressed[i]) action?.down?.();
    else if (!down[i] && pressed[i]) action?.up?.();
    if (down[i]) action?.held?.(dt);
    pressed[i] = down[i];
  }
}

onStart(() => {
  addEventListener('gamepadconnected', () => setActive(true));
  addEventListener('gamepaddisconnected', () => poll(0));
  // Touching the screen hands control back to the touch overlay.
  addEventListener('touchstart', () => setActive(false), { passive: true });
  // input.js zeroes the stick on blur; the next poll reads the pad afresh.
  addEventListener('blur', releaseAll);
});

// 'late' so the sticks land in input before next frame's updateIntent.
onFrame(({ dt }) => poll(dt), { phase: 'late' });
