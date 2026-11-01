// Gamepad play (Backbone on iPhone/iPad, or any controller with the "standard" mapping): left stick moves, right
// stick looks, buttons dispatch the actions in src/player/controls.ts. While a pad is in use the touch overlay hides and the
// reticle shows; the next touch brings the touch controls back. Menu opens the pause view (src/features/pause.ts).
// The pad's brand (from its id) names the buttons in prompts (body[data-pad], src/player/glyphs.ts): Xbox letters,
// PlayStation shapes, Switch letters; on a Switch pad confirm and back swap places in menus and talks (menuSlot). B
// (the back button) also leaves a focused text field, such as the prototype bar's note.
// Local input only: no sim or network state. Serves "Designed for drop-in, drop-out": pick up whatever you have and
// play.
import './gamepad.css';
import { onFrame, onStart } from '../loop.ts';
import { input } from '../player/input.ts';
import { me, cam } from '../player/player.ts';
import { clamp } from '../math.ts';
import { dom } from '../player/hud.ts';
import { canvas } from '../render/scene.ts';
import { PAD, actionForSlot, padModal, padGrab, setMenuSwap, menuSlot } from '../player/controls.ts';

const DEAD = 0.15; // stick deadzone
const LOOK_YAW = 2.8; // rad/s at full right-stick deflection
const LOOK_PITCH = 1.8;
const PRESS = 0.4; // analog trigger threshold

const STICK_PICK = 0.5; // a grabbed left stick past this presses up or down
const STICK_FIRST_MS = 380; // then repeats while held: first after this, then every STICK_EVERY_MS
const STICK_EVERY_MS = 170;

const pressed = new Array(PAD.length).fill(false);
const grabbed = new Array(PAD.length).fill(false); // this press went to padGrab(), not to its action
let active = false;
let modalOn = false;
let padId = '';
const stickPick = { dir: '', next: 0 };

// The brand by the USB vendor id or the name in Gamepad.id (Sony 054c, Nintendo 057e); anything else reads as Xbox,
// the standard mapping's own names (Backbone's standard edition included).
export function brandOf(id: string) {
  if (/054c|playstation|dualsense|dualshock|wireless controller/i.test(id)) return 'ps';
  if (/057e|nintendo|pro controller|joy-?con/i.test(id)) return 'nintendo';
  return 'xbox';
}
function setBrand(id: string) {
  if (id === padId) return;
  padId = id;
  const brand = brandOf(id);
  document.body.dataset.pad = brand;
  setMenuSwap(brand === 'nintendo');
}

// A grabbed left stick picks like the D-pad: one press on the push, then repeats while held.
function pickWithStick(ly: number, now: number, fn: (slot: string) => void) {
  const dir = ly < -STICK_PICK ? 'up' : ly > STICK_PICK ? 'down' : '';
  if (dir !== stickPick.dir) {
    stickPick.dir = dir;
    stickPick.next = now + STICK_FIRST_MS;
    if (dir) fn(dir);
  } else if (dir && now >= stickPick.next) {
    stickPick.next = now + STICK_EVERY_MS;
    fn(dir);
  }
}
const typingIn = () => document.activeElement?.matches?.('input, textarea') ?? false;

// iPadOS also drives whatever has focus with the pad (a focused button gets "pressed" by A), so keep focus on the
// canvas while the pad plays. Leave text fields alone: the name box may be mid-edit.
function claimFocus() {
  const el = document.activeElement;
  if (el === canvas || el?.matches?.('input, textarea')) return;
  (el as HTMLElement | null)?.blur?.();
  canvas.focus({ preventScroll: true });
}

const dead = (v: number) => (Math.abs(v) < DEAD ? 0 : (Math.sign(v) * (Math.abs(v) - DEAD)) / (1 - DEAD));

function setActive(on: boolean) {
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
    if (pressed[i] && !grabbed[i]) actionForSlot(PAD[i])?.up?.();
    pressed[i] = grabbed[i] = false;
  }
}

function poll(dt: number) {
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
  setBrand(pad.id);

  // A modal moves focus between its own buttons, so it skips claimFocus. Held actions get their release on entry.
  const modal = padModal();
  if (modal) {
    if (!modalOn) for (let i = 0; i < PAD.length; i++) if (pressed[i] && !grabbed[i]) actionForSlot(PAD[i])?.up?.();
    modalOn = true;
    input.stickX = input.stickY = 0;
    down.forEach((d, i) => {
      if (d && !pressed[i]) modal(PAD[i]);
      pressed[i] = d;
      grabbed[i] = true; // its release belongs to the modal too
    });
    return;
  }
  modalOn = false;
  const grab = padGrab();
  const takes = (i: number) => !!grab?.slots.includes(PAD[i]);
  if (down.some((d, i) => d && !pressed[i] && !takes(i))) claimFocus(); // a grab moves focus between its own buttons

  // Before the island: A presses "Jump in".
  if (!me.entered) {
    input.stickX = input.stickY = 0;
    if (down[0] && !pressed[0] && !dom.enterBtn.disabled) dom.enterBtn.click();
    down.forEach((d, i) => (pressed[i] = d));
    return;
  }

  if (grab?.stick) {
    input.stickX = input.stickY = 0;
    pickWithStick(ly, performance.now(), grab.fn);
  } else {
    input.stickX = lx;
    input.stickY = ly;
    stickPick.dir = '';
  }
  // Squared response: fine aim near the centre, fast turns at the edge.
  cam.yaw -= rx * Math.abs(rx) * LOOK_YAW * dt;
  cam.pitch = clamp(cam.pitch - ry * Math.abs(ry) * LOOK_PITCH * dt, -1.25, 0.9);

  for (let i = 0; i < PAD.length; i++) {
    const action = actionForSlot(PAD[i]);
    if (down[i] && !pressed[i] && PAD[i] === menuSlot('back') && typingIn() && !takes(i)) {
      (document.activeElement as HTMLElement).blur(); // back out of the text field; the game keeps the press
      claimFocus();
      grabbed[i] = true;
    } else if (down[i] && !pressed[i]) {
      grabbed[i] = takes(i);
      if (grabbed[i]) grab!.fn(PAD[i]);
      else action?.down?.();
    } else if (!down[i] && pressed[i] && !grabbed[i]) action?.up?.();
    if (down[i] && !grabbed[i]) action?.held?.(dt);
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
