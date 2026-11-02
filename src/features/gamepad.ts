// Gamepad play (Backbone on iPhone/iPad, or any controller with the "standard" mapping): left stick moves, right
// stick looks, buttons dispatch the actions in src/player/controls.ts. While a pad is in use the touch overlay hides and the
// reticle shows; the next touch brings the touch controls back. body.touch stays on an iPad while its pad plays (only a
// key or a click clears it), so pad styles key on body.gamepad, never on body:not(.touch). Menu opens the pause view (src/features/pause.ts).
// The pad's brand (from its id) names the buttons in prompts (body[data-pad], src/player/glyphs.ts): Xbox letters,
// PlayStation shapes, Switch letters; on a Switch pad confirm and back swap places in menus and talks (menuSlot). B
// (the back button) also leaves a focused text field, such as the prototype bar's note.
// Finding the pad: with none known there is no per-frame work. navigator.getGamepads() is read on gamepadconnected, on
// any pointer, key or touch, on visibilitychange, focus and pageshow, and once after load, so a pad connected before
// the page loaded (or one whose gamepadconnected never comes, as in the owner's Home Screen app playtest) is still
// found: WebKit exposes a pad only after one of its buttons is pressed in the page, and fires gamepadconnected then.
// Once a pad is known its snapshot is read once a frame ('late' phase; the Gamepad API has no button events), without
// allocating; gamepaddisconnected or an empty slot goes back to waiting. In the Home Screen app the lobby says "Press
// any button on your controller" until one is known. Patterns borrowed: Babylon.js's GamepadManager (polls only once a
// pad is known, started by gamepadconnected), Phaser 3's GamepadPlugin (re-reads getGamepads() on connect, and warns a
// browser may hide a pad until a button is pressed), and the usual pressed-last-frame edges for down and up. A pad that
// reports mapping "" (no standard layout) is still followed, standard ones first, and its D-pad is read as buttons
// 12-15 or as a hat or axis pair (dpadAxes, below, after SDL_GameControllerDB); a full remap of such a pad is not
// needed while WebKit reports iPad MFi pads (Backbone) as standard.
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
import { standalone } from '../boot/app-fill.ts';

const DEAD = 0.15; // stick deadzone
const LOOK_YAW = 2.8; // rad/s at full right-stick deflection
const LOOK_PITCH = 1.8;
const PRESS = 0.4; // analog trigger threshold

const STICK_PICK = 0.5; // a grabbed left stick past this presses up or down
const PICK_FIRST_MS = 380; // a grabbed pick (D-pad or stick) repeats while held: first after this, then every PICK_EVERY_MS
const PICK_EVERY_MS = 170;
const UP = PAD.indexOf('up'),
  DOWN = PAD.indexOf('down'),
  LEFT = PAD.indexOf('left'),
  RIGHT = PAD.indexOf('right');

const pressed = new Array(PAD.length).fill(false);
const grabbed = new Array(PAD.length).fill(false); // this press went to padGrab(), not to its action
const down = new Array(PAD.length).fill(false); // this frame's buttons, reused
let padIndex = -1; // the known pad's slot in navigator.getGamepads(), -1 while none is known
let active = false;
let modalOn = false;
let padId = '';
const picking = { dir: '', next: 0 };

// The brand by the USB vendor id or the name in Gamepad.id (Sony 054c, Nintendo 057e); anything else reads as Xbox,
// the standard mapping's own names. Safari on iPad names a Backbone "Wireless Controller Extended Gamepad" (the MFi
// profile; the owner's, 2026-11-02), which "wireless controller" reads as PlayStation on purpose: the shapes he saw.
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

// A grabbed pick (D-pad up or down, or the left stick pushed): one press on the push, then repeats while held.
function pick(dir: string, now: number, fn: (slot: string) => void) {
  if (dir !== picking.dir) {
    picking.dir = dir;
    picking.next = now + PICK_FIRST_MS;
    if (dir) fn(dir);
  } else if (dir && now >= picking.next) {
    picking.next = now + PICK_EVERY_MS;
    fn(dir);
  }
}

// A pad without the "standard" mapping (mapping '') may report its D-pad as an axis rather than buttons 12-15.
// SDL_GameControllerDB (github.com/mdqinc/SDL_GameControllerDB, gamecontrollerdb.txt: "Backbone One" and "MFi
// Extended Gamepad", platform:iOS) lists Apple MFi pads, Backbone included, with face buttons 0-3 as in the standard
// mapping but the D-pad as a hat (dpup:h0.1 ... dpleft:h0.8). Browsers hand a raw hat to the page as one axis: -1 is
// up, then clockwise in steps of 2/7, and past ±1 (9/7) when centred; Chrome puts it at axis 9 (HID usage 0x39 - 0x30).
// So: the first axis from 4 up seen resting past ±1 is the hat; with none, a pair on axes 6 and 7 (-1 / 0 / 1), as
// some drivers report it. OR'd into buttons 12-15, which are still read. (Phaser 3 reads only buttons 12-15; Babylon.js
// picks a pad class by id and leaves a non-standard D-pad unread: neither covers this.)
const hat = { id: '', axis: -1 };
function dpadAxes(pad: Gamepad, down: boolean[]) {
  if (pad.mapping === 'standard') return;
  const a = pad.axes;
  if (hat.id !== pad.id) Object.assign(hat, { id: pad.id, axis: -1 });
  if (hat.axis < 0) hat.axis = a.findIndex((v, i) => i >= 4 && Math.abs(v) > 1.01);
  let x = 0,
    y = 0;
  if (hat.axis >= 0) {
    const v = a[hat.axis] ?? 9;
    if (Math.abs(v) <= 1.01) {
      const k = Math.round(((v + 1) * 7) / 2) % 8; // 0 up, 1 up-right, 2 right ... 7 up-left
      x = [0, 1, 1, 1, 0, -1, -1, -1][k];
      y = [-1, -1, 0, 1, 1, 1, 0, -1][k];
    }
  } else {
    x = a[6] ?? 0;
    y = a[7] ?? 0;
  }
  if (y < -0.5) down[UP] = true;
  if (y > 0.5) down[DOWN] = true;
  if (x < -0.5) down[LEFT] = true;
  if (x > 0.5) down[RIGHT] = true;
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

// An analog trigger as 0..1, with a small dead zone and the full travel (vehicle-feel.md, RC cars 4).
const trigger = (b: GamepadButton | undefined) => (b ? clamp((b.value - 0.05) / 0.9, 0, 1) || (b.pressed ? 1 : 0) : 0);
const dead = (v: number) => (Math.abs(v) < DEAD ? 0 : (Math.sign(v) * (Math.abs(v) - DEAD)) / (1 - DEAD));

function setActive(on: boolean) {
  if (active === on) return;
  active = on;
  document.body.classList.toggle('gamepad', on);
  if (on) claimFocus();
  if (!on) {
    input.stickX = input.stickY = input.triggerL = input.triggerR = 0;
    releaseAll();
  }
}

function releaseAll() {
  for (let i = 0; i < PAD.length; i++) {
    if (pressed[i] && !grabbed[i]) actionForSlot(PAD[i])?.up?.();
    pressed[i] = grabbed[i] = false;
  }
}

// The pad to follow: a connected one, the standard mapping first, then the one used last. Returns its slot or -1.
function pickPad(pads: ArrayLike<Gamepad | null>) {
  let best = -1;
  for (let i = 0; i < pads.length; i++) {
    const p = pads[i];
    if (!p?.connected) continue;
    const b = best < 0 ? null : pads[best]!;
    const std = p.mapping === 'standard',
      bstd = b?.mapping === 'standard';
    if (!b || (std && !bstd) || (std === bstd && p.timestamp > b.timestamp)) best = i;
  }
  return best;
}

function scan() {
  const i = pickPad(navigator.getGamepads?.() ?? []);
  if (i === padIndex) return;
  padIndex = i;
  if (i < 0) setActive(false);
  else setBrand(navigator.getGamepads()[i]!.id);
  syncHint();
}

// "Press any button on your controller", on the lobby card, while the Home Screen app knows no pad.
let hint: HTMLElement | null = null;
function syncHint() {
  if (!standalone) return;
  if (!hint) {
    hint = document.createElement('p');
    hint.className = 'pad-hint';
    hint.textContent = 'Playing with a controller? Press any button on it.';
    dom.joinForm.append(hint);
  }
  hint.hidden = padIndex >= 0;
}

function poll(dt: number) {
  if (padIndex < 0) return; // no pad known: nothing to do each frame
  const pad = navigator.getGamepads?.()[padIndex];
  if (!pad?.connected) {
    scan(); // gone, or moved to another slot
    return;
  }
  const lx = dead(pad.axes[0] ?? 0),
    ly = dead(pad.axes[1] ?? 0),
    rx = dead(pad.axes[2] ?? 0),
    ry = dead(pad.axes[3] ?? 0);
  for (let i = 0; i < PAD.length; i++) {
    const b = pad.buttons[i];
    down[i] = !!b && (b.pressed || b.value > PRESS);
  }
  dpadAxes(pad, down);
  input.triggerL = trigger(pad.buttons[6]);
  input.triggerR = trigger(pad.buttons[7]);
  if (!active && (lx || ly || rx || ry || down.includes(true))) setActive(true);
  if (!active) return;
  setBrand(pad.id);

  // A modal moves focus between its own buttons, so it skips claimFocus. Held actions get their release on entry.
  const modal = padModal();
  if (modal) {
    if (!modalOn) for (let i = 0; i < PAD.length; i++) if (pressed[i] && !grabbed[i]) actionForSlot(PAD[i])?.up?.();
    modalOn = true;
    input.stickX = input.stickY = input.triggerL = input.triggerR = 0;
    for (let i = 0; i < PAD.length; i++) {
      if (down[i] && !pressed[i]) modal(PAD[i]);
      pressed[i] = down[i];
      grabbed[i] = true; // its release belongs to the modal too
    }
    return;
  }
  modalOn = false;
  const grab = padGrab();
  const takes = (i: number) => !!grab?.slots.includes(PAD[i]);
  for (let i = 0; i < PAD.length; i++)
    if (down[i] && !pressed[i] && !takes(i)) {
      claimFocus(); // a grab moves focus between its own buttons
      break;
    }

  // Before the island: A presses "Jump in".
  if (!me.entered) {
    input.stickX = input.stickY = 0;
    if (down[0] && !pressed[0] && !dom.enterBtn.disabled) dom.enterBtn.click();
    for (let i = 0; i < PAD.length; i++) pressed[i] = down[i];
    return;
  }

  // A grab with stick: true picks with D-pad up and down and the left stick alike (with repeat), in the loop below's stead.
  const picks = !!grab?.stick;
  if (picks) {
    input.stickX = input.stickY = 0;
    const dir = down[UP] ? 'up' : down[DOWN] ? 'down' : ly < -STICK_PICK ? 'up' : ly > STICK_PICK ? 'down' : '';
    pick(dir, performance.now(), grab!.fn);
  } else {
    input.stickX = lx;
    input.stickY = ly;
    picking.dir = '';
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
      const picked = picks && (i === UP || i === DOWN); // pick() above sent it
      grabbed[i] = picked || takes(i);
      if (!grabbed[i]) action?.down?.();
      else if (!picked) grab!.fn(PAD[i]);
    } else if (!down[i] && pressed[i] && !grabbed[i]) action?.up?.();
    if (down[i] && !grabbed[i]) action?.held?.(dt);
    pressed[i] = down[i];
  }
}

onStart(() => {
  addEventListener('gamepadconnected', (e) => {
    scan();
    if (padIndex === e.gamepad.index) setActive(true);
  });
  addEventListener('gamepaddisconnected', scan);
  // Any input, or coming back to the page, looks for a pad again (cheap: only while none is known, or to switch pads).
  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'focus', 'pageshow'])
    addEventListener(ev, scan, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && scan());
  // Touching the screen hands control back to the touch overlay.
  addEventListener('touchstart', () => setActive(false), { passive: true });
  // input.ts zeroes the stick on blur; the next poll reads the pad afresh.
  addEventListener('blur', releaseAll);
  scan(); // once after load: a pad connected before the page was
  setTimeout(scan, 1000);
});

// 'late' so the sticks land in input before next frame's updateIntent.
onFrame(({ dt }) => poll(dt), { phase: 'late' });
