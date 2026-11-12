import './touch.css';
import { isTouch } from '../constants.ts';
import { clamp } from '../math.ts';
import { canvas } from '../render/scene.ts';
import { me, cam } from './state.ts';
import { respawnBall, releaseBall } from '../entities/ball/state.ts';
import { pressJump, releaseJump } from '../entities/player/state.ts';
import { sendPresence } from '../netplay/net.ts';
import { dom } from './dom.ts';
import { input, inputState } from './input-state.ts';
import { useDown, useUp, interactDown, interactUp, touchDown } from './hands.ts';
import { cancelCharge } from './throw.ts';
import { registerAction, describeControl, isTyping, triggerAction, setMouseGate } from './controls.ts';
import { devInputBlocked, devCursorFree } from './dev-input.ts';

export { input, inputState } from './input-state.ts';

// A vehicle calls this when you sit down and stand up (the soapbox). Seated, ← → only steer (no arrow turn) and a
// two-finger scroll does not look: the chase camera owns the view. body.seated swaps in the driving touch layout
// (touch.css; research/cross-device-input.md rec 11): Jump gets the vehicle's label, the buttons that do nothing hide.
export function setSeated(on: boolean, jumpLabel = 'Jump') {
  inputState.seated = on;
  if (on) setStickSprint(false);
  document.body.classList.toggle('seated', on);
  dom.jumpBtn.textContent = on ? jumpLabel : 'Jump';
}
// Radians per pixel of a two-finger trackpad scroll (wheel deltas; a mouse wheel's lines are scaled to pixels).
const WHEEL_YAW = 0.0035;
const WHEEL_PITCH = 0.0028;
// Touch stick: travel radius in CSS px (larger on tablets, rec 7) and a scaled radial dead zone as a share of it.
const tablet = matchMedia('(min-width: 700px) and (min-height: 700px)');
const STICK_DEAD = 0.12;
// The stick also sprints (rec 9, Sky's and Apple's one control for walk and run): a push to this share of the travel
// starts it, and it holds until the push falls under the lower one, so a thumb resting at the edge doesn't flicker it.
// It only writes input.sprint on a change, so the pad's latch keeps its own rules.
const STICK_SPRINT_ON = 0.9;
const STICK_SPRINT_OFF = 0.8;
let stickSprint = false;
function setStickSprint(on: boolean) {
  if (on === stickSprint) return;
  stickSprint = on;
  input.sprint = on;
  dom.stickEl.classList.toggle('sprinting', on); // the ring lights up (touch.css)
}
let everLocked = false; // a refused lock is only permanent if none ever worked (Chrome refuses one just after Esc)
const lockRefused = () => {
  if (!everLocked) inputState.lockFailed = true;
};

// Touch mode (body.touch: the stick and buttons overlay, no pointer lock) follows what the player uses, not the device:
// an iPad with a Magic Keyboard starts in touch mode (its primary pointer is coarse), and the first key press or
// trackpad click switches it to keyboard and mouse; the next finger on the glass switches it back.
const touchMode = () => document.body.classList.contains('touch');
function setTouchMode(on: boolean) {
  if (touchMode() === on) return;
  releaseInputFn?.();
  document.body.classList.toggle('touch', on);
  if (on && document.pointerLockElement) document.exitPointerLock();
}

export function requestLock() {
  if (devCursorFree() || touchMode() || inputState.locked || !inputState.canLock) return;
  try {
    const p = canvas.requestPointerLock();
    // Older browsers return void; newer ones report a refused lock through the promise.
    if (typeof p?.catch === 'function') p.catch(lockRefused);
  } catch {
    lockRefused();
  }
}
// Lets go of every held key, button, stick (a modal takes the input: src/player/modal.ts).
let releaseInputFn: (() => void) | null = null;
export const releaseInput = () => releaseInputFn?.();
// Wired from main.ts after every module has loaded.
export function initInput() {
  setMouseGate(() => me.entered); // the mouse-button actions (registerAction's mouse) only fire in the world
  if (isTouch) document.body.classList.add('touch');
  // Capture phase, so the switch happens before the press is handled. A key aimed at a text field may come from the
  // on-screen keyboard, so it does not count. Only deliberate input switches (a key, a press, a scroll): never a
  // hover, which a trackpad (and maybe a Pencil) sends all the time (research/cross-device-input.md rec 1).
  addEventListener('keydown', (e) => !isTyping(e) && setTouchMode(false), { capture: true });
  addEventListener('pointerdown', (e) => e.pointerType && setTouchMode(e.pointerType !== 'mouse'), { capture: true });
  addEventListener('wheel', () => setTouchMode(false), { capture: true, passive: true });
  document.addEventListener('pointerlockchange', () => {
    inputState.locked = document.pointerLockElement === canvas;
    if (inputState.locked) everLocked = true;
  });
  document.addEventListener('pointerlockerror', lockRefused);

  // Held keys (move, sprint) are tracked here; one-press keys bind through their
  // action (registerAction's key) or onKey (src/player/controls.ts). Both skip key presses aimed at a text field.
  addEventListener('keydown', (e) => {
    if (!me.entered || isTyping(e) || devInputBlocked()) return;
    input.keys.add(e.code);
    if (e.code === 'Space') {
      pressJump();
      e.preventDefault();
    }
    if (e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyE') interactDown();
    if (e.code === 'KeyR') respawnBall();
  });
  addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    if (devInputBlocked()) return;
    // macOS sends no keyup for other keys while Cmd is held, so they would stay pressed: release them all with Cmd.
    if (e.key === 'Meta') input.keys.clear();
    if (e.code === 'Space') releaseJump();
    if (e.code === 'KeyE' && me.entered) interactUp();
  });
  let drag: { x: number; y: number; moved: boolean } | null = null;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (!me.entered || devInputBlocked()) return;
    canvas.focus();
    if (!inputState.locked) {
      requestLock();
      drag = { x: e.clientX, y: e.clientY, moved: false };
    }
    if (e.button === 0) triggerAction('use', 'down');
  });
  addEventListener('mousemove', (e) => {
    if (!me.entered || devInputBlocked()) return;
    if (inputState.locked) {
      cam.yaw -= e.movementX * 0.0024;
      cam.pitch = clamp(cam.pitch - e.movementY * 0.0024, -1.25, 0.9);
    } else if (drag && e.buttons) {
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) {
        drag.moved = true;
        me.charging = false;
      }
      if (drag.moved) {
        inputState.looked = true;
        cam.yaw -= e.movementX * 0.005;
        cam.pitch = clamp(cam.pitch - e.movementY * 0.004, -1.25, 0.9);
      }
    }
  });
  addEventListener('mouseup', (e) => {
    if (!me.entered || devInputBlocked() || e.button !== 0) {
      drag = null;
      return;
    }
    if (drag?.moved) {
      me.suppressUp = false;
      drag = null;
      return;
    }
    drag = null;
    triggerAction('use', 'up');
  });
  // A two-finger trackpad scroll turns the camera while the mouse is not locked: the iPad's mouse look (iPadOS sends
  // wheel events since 14.5; rec 3). Fingers right look right, as a drag does, with natural scrolling (the default).
  // Ctrl (a pinch, in Chromium), a locked mouse's wheel and a seated player's do nothing yet. Either way the page must not scroll or zoom.
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      if (!me.entered || devInputBlocked() || inputState.locked || inputState.seated || e.ctrlKey) return;
      const px = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      cam.yaw += e.deltaX * px * WHEEL_YAW;
      cam.pitch = clamp(cam.pitch + e.deltaY * px * WHEEL_PITCH, -1.25, 0.9);
      inputState.looked = true;
    },
    { passive: false },
  );
  // Pinching on a phone zoomed the whole page (Safari ignores touch-action for it): block it. Double-tap zoom is
  // off through touch-action in style.css and user-scalable=no in index.html.
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend'])
    document.addEventListener(ev, (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => e.touches.length > 1 && e.preventDefault(), { passive: false });

  const { touchEl, stickEl, knobEl, jumpBtn, grabBtn } = dom;
  const stick = { id: null as number | null, ox: 0, oy: 0 };
  const look = { id: null as number | null, x: 0, y: 0 };
  touchEl.addEventListener('pointerdown', (e) => {
    if (devInputBlocked()) return;
    // A trackpad click never spawns the stick or a touch look, whatever mode shows (rec 2).
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    if ((e.target as Element | null)?.closest('.tbtn')) return;
    if (e.clientX < innerWidth * 0.45 && stick.id === null) {
      stick.id = e.pointerId;
      stick.ox = e.clientX;
      stick.oy = e.clientY;
      stickEl.style.left = `${e.clientX}px`;
      stickEl.style.top = `${e.clientY}px`;
      stickEl.style.display = 'block';
      knobEl.style.transform = '';
    } else if (look.id === null) {
      look.id = e.pointerId;
      look.x = e.clientX;
      look.y = e.clientY;
    }
    touchEl.setPointerCapture?.(e.pointerId);
  });
  touchEl.addEventListener('pointermove', (e) => {
    if (devInputBlocked()) return;
    if (e.pointerId === stick.id) {
      const r = tablet.matches ? 60 : 50;
      let dx = e.clientX - stick.ox,
        dy = e.clientY - stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > r) {
        dx *= r / len;
        dy *= r / len;
      }
      // Scaled radial dead zone (rec 7): nothing inside it, then 0..1 over the rest of the travel, same direction.
      const mag = Math.min(len, r) / r;
      const out = mag < STICK_DEAD ? 0 : (mag - STICK_DEAD) / (1 - STICK_DEAD) / mag;
      input.stickX = (dx / r) * out;
      input.stickY = (dy / r) * out;
      // Seated, the stick steers; in a talk or the fall's intro, it does nothing.
      const free = !inputState.seated && !inputState.held;
      setStickSprint(free && mag >= (stickSprint ? STICK_SPRINT_OFF : STICK_SPRINT_ON));
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (e.pointerId === look.id) {
      if (e.clientX !== look.x || e.clientY !== look.y) inputState.touchLooked = true;
      cam.yaw -= (e.clientX - look.x) * 0.006;
      cam.pitch = clamp(cam.pitch - (e.clientY - look.y) * 0.005, -1.25, 0.9);
      look.x = e.clientX;
      look.y = e.clientY;
    }
  });
  function releaseStick() {
    stick.id = null;
    input.stickX = input.stickY = 0;
    setStickSprint(false);
    stickEl.style.display = 'none';
  }
  // pointerup is not guaranteed (system gestures, backgrounding), so any of these ends the touch.
  function endTouch(e: PointerEvent) {
    if (e.pointerId === stick.id) releaseStick();
    if (e.pointerId === look.id) look.id = null;
  }
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
    touchEl.addEventListener(ev, endTouch);
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (devInputBlocked()) return;
    pressJump();
  });
  for (const ev of ['pointerup', 'pointercancel']) jumpBtn.addEventListener(ev, releaseJump);
  grabBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (devInputBlocked()) return;
    touchDown();
  });
  grabBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    if (devInputBlocked()) return;
    useUp();
  });
  grabBtn.addEventListener('pointercancel', () => {
    me.charging = false;
    me.suppressUp = false;
  });

  // Gamepad layout for the built-in controls (src/player/controls.ts; features register their own).
  describeControl('move', {
    label: 'Move',
    detail: { kbm: 'The arrow keys walk too; ← → step sideways while the mouse is locked' },
    keys: [
      ['KeyW', 'KeyA', 'KeyS', 'KeyD'],
      ['ArrowUp', 'ArrowDown'],
    ],
    pad: 'ls',
    touch: 'Drag on the left',
    group: 'move',
    order: 0,
  });
  describeControl('look', {
    label: 'Look around',
    detail: {
      kbm: inputState.canLock
        ? 'Click to lock the mouse. Unlocked: drag, two-finger scroll, or ← →'
        : 'Drag, scroll with two fingers, or hold ← →',
    },
    keys: ['MouseMove', 'Wheel', ['ArrowLeft', 'ArrowRight']],
    pad: 'rs',
    touch: 'Drag on the right',
    group: 'camera',
    order: 0,
  });
  registerAction('jump', {
    pad: 'a',
    label: 'Jump, or swim up',
    keys: ['Space'],
    touch: 'Jump',
    group: 'move',
    order: 1,
    down: pressJump,
    up: releaseJump,
  });
  // X acts on what's in front of you (Talk, Pick up, Take, Get in); RT and the click are the main action: use what you
  // hold. B is back: it closes talks and menus and puts a wound-up throw away.
  registerAction('interact', {
    pad: 'x',
    label: 'Talk, pick up, take',
    keys: ['KeyE'],
    touch: 'Grab',
    group: 'hands',
    order: 0,
    down: interactDown,
    up: interactUp,
  });
  registerAction('use', {
    pad: 'rt',
    label: 'Use what you hold',
    detail: {
      kbm: 'Hold to charge a throw',
      pad: 'Hold to charge a throw',
      touch: 'The main button, when it reads Throw or Sprout',
    },
    keys: ['Mouse0'],
    touch: 'Main button',
    group: 'hands',
    order: 1,
    down: useDown,
    up: useUp,
  });
  registerAction('back', {
    pad: 'b',
    label: 'Back',
    detail: { pad: 'Closes talks and menus, leaves a text box, puts a wound-up throw away' },
    group: 'menu',
    order: 1,
    down: () => me.charging && cancelCharge(),
  });
  registerAction('respawn', {
    pad: 'view',
    label: 'Bring the ball back',
    keys: ['KeyR'],
    group: 'ball',
    down: respawnBall,
  });
  // Click once to sprint, like most console games: it stays on until the stick is let go (updateIntent, src/entities/player/state.ts).
  registerAction('sprint', {
    pad: 'l3',
    label: 'Sprint',
    detail: {
      pad: 'Click once; stays on while you move',
      touch: 'A smaller push walks; the ring lights up while you sprint',
    },
    keys: ['ShiftLeft'],
    touch: 'Push the stick far',
    group: 'move',
    order: 2,
    down: () => (input.sprint = true),
  });

  // Losing focus or hiding the page can swallow the matching keyup/pointerup: treat everything as released.
  function releaseAll() {
    input.keys.clear();
    input.sprint = false;
    releaseStick();
    look.id = null;
    drag = null;
    input.triggerL = input.triggerR = 0;
    releaseJump();
    cancelCharge();
    // A held interact (the boiler install's hold) lets go through its wrapped release, as a keyup would.
    triggerAction('interact', 'up');
  }
  releaseInputFn = releaseAll;
  addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      releaseAll();
      me.charging = false;
      releaseBall();
    }
    sendPresence();
  });
}
