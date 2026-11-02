import './touch.css';
import { isTouch } from '../constants.ts';
import { clamp } from '../math.ts';
import { canvas } from '../render/scene.ts';
import { me, cam } from './player.ts';
import { respawnBall, releaseBall } from '../physics/ball.ts';
import { sendPresence } from '../netplay/net.ts';
import { dom } from './hud.ts';
import { useDown, useUp, interactDown, interactUp, interactTarget, touchDown } from './hands.ts';
import { cancelCharge } from './throw.ts';
import { cycle } from './inventory.ts';
import { registerAction, describeControl, isTyping, triggerAction } from './controls.ts';

export const input = { keys: new Set<string>(), stickX: 0, stickY: 0, sprint: false };
// canLock: the browser has Pointer Lock at all (Safari on iPadOS has none, research/cross-device-input.md rec 3), so
// mouse look there is a click-drag or a two-finger trackpad scroll. looked: one of those has turned the camera (the
// hint in hud.ts then goes). seated: in a vehicle's seat (setSeated), where its chase camera owns the view. held: the
// player stands still (no move or jump) while a talk is open (src/player/conversation.ts).
export const inputState = {
  locked: false,
  lockFailed: false,
  canLock: 'requestPointerLock' in Element.prototype,
  looked: false,
  seated: false,
  held: false,
};

// A vehicle calls this when you sit down and stand up (the soapbox). Seated, ← → only steer (no arrow turn) and a
// two-finger scroll does not look: the chase camera owns the view. body.seated swaps in the driving touch layout
// (touch.css; research/cross-device-input.md rec 11): Jump gets the vehicle's label, the buttons that do nothing hide.
export function setSeated(on: boolean, jumpLabel = 'Jump') {
  inputState.seated = on;
  document.body.classList.toggle('seated', on);
  dom.jumpBtn.textContent = on ? jumpLabel : 'Jump';
}
// Radians per pixel of a two-finger trackpad scroll (wheel deltas; a mouse wheel's lines are scaled to pixels).
const WHEEL_YAW = 0.0035;
const WHEEL_PITCH = 0.0028;
// Touch stick: travel radius in CSS px (larger on tablets, rec 7) and a scaled radial dead zone as a share of it.
const tablet = matchMedia('(min-width: 700px) and (min-height: 700px)');
const STICK_DEAD = 0.12;
const pressJump = () => {
  me.jumpQueued = 0.15;
  me.jumpHeld = true;
};
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
  if (touchMode() || inputState.locked || !inputState.canLock) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(lockRefused);
  } catch {
    lockRefused();
  }
}
// Lets go of every held key, button, stick (a modal takes the input: src/player/modal.ts).
let releaseInputFn: (() => void) | null = null;
export const releaseInput = () => releaseInputFn?.();
// Wired from main.ts after every module has loaded (hud.ts and input.ts import each other).
export function initInput() {
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
    if (!me.entered || isTyping(e)) return;
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
    // macOS sends no keyup for other keys while Cmd is held, so they would stay pressed: release them all with Cmd.
    if (e.key === 'Meta') input.keys.clear();
    if (e.code === 'Space') me.jumpHeld = false;
    if (e.code === 'KeyE' && me.entered) interactUp();
  });
  let drag: { x: number; y: number; moved: boolean } | null = null;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (!me.entered) return;
    canvas.focus();
    if (!inputState.locked) {
      requestLock();
      drag = { x: e.clientX, y: e.clientY, moved: false };
    }
    if (e.button === 0) triggerAction('use', 'down');
  });
  addEventListener('mousemove', (e) => {
    if (!me.entered) return;
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
    if (!me.entered || e.button !== 0) {
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
      if (!me.entered || inputState.locked || inputState.seated || e.ctrlKey) return;
      const px = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      cam.yaw += e.deltaX * px * WHEEL_YAW;
      cam.pitch = clamp(cam.pitch + e.deltaY * px * WHEEL_PITCH, -1.25, 0.9);
      inputState.looked = true;
    },
    { passive: false },
  );
  // Pinching on a phone zoomed the whole page (Safari ignores touch-action for it): block it.
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => e.touches.length > 1 && e.preventDefault(), { passive: false });

  const { touchEl, stickEl, knobEl, jumpBtn, grabBtn } = dom;
  const stick = { id: null as number | null, ox: 0, oy: 0 };
  const look = { id: null as number | null, x: 0, y: 0 };
  touchEl.addEventListener('pointerdown', (e) => {
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
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
    } else if (e.pointerId === look.id) {
      cam.yaw -= (e.clientX - look.x) * 0.006;
      cam.pitch = clamp(cam.pitch - (e.clientY - look.y) * 0.005, -1.25, 0.9);
      look.x = e.clientX;
      look.y = e.clientY;
    }
  });
  function releaseStick() {
    stick.id = null;
    input.stickX = input.stickY = 0;
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
    pressJump();
  });
  for (const ev of ['pointerup', 'pointercancel']) jumpBtn.addEventListener(ev, () => (me.jumpHeld = false));
  grabBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    touchDown();
  });
  grabBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    useUp();
  });
  grabBtn.addEventListener('pointercancel', () => {
    me.charging = false;
    me.suppressUp = false;
  });

  // Gamepad layout for the built-in controls (src/player/controls.ts; features register their own).
  const ZOOMS = [4, 6.5, 10];
  const zoomStep = () => (cam.dist = ZOOMS.find((d) => d > cam.dist + 0.1) ?? ZOOMS[0]);
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
    up: () => (me.jumpHeld = false),
  });
  // Pad X is the one hands button, like the touch main button: it acts on the prompt when there is one (Talk, Pick up,
  // Take, Get in), and otherwise uses what you hold (hold to charge a throw). D-pad → uses what you hold even next to
  // something; E and the click stay apart. B is back: it closes talks and menus and puts a wound-up throw away.
  let padUsed = false; // this X press went to use, so its release does too
  registerAction('interact', {
    pad: 'x',
    label: 'Talk, pick up, take',
    detail: { pad: 'Nothing in reach: uses what you hold (hold to charge a throw)' },
    keys: ['KeyE'],
    touch: 'Grab',
    group: 'hands',
    order: 0,
    down: () => {
      padUsed = !interactTarget()?.run;
      if (padUsed) triggerAction('use', 'down');
      else interactDown();
    },
    up: () => {
      if (padUsed) triggerAction('use', 'up');
      else interactUp();
      padUsed = false;
    },
  });
  registerAction('use', {
    pad: 'right',
    label: 'Use what you hold',
    detail: {
      kbm: 'Hold to charge a throw, release to throw. With empty hands it does the same as the interact button.',
      pad: 'Throws (waters, plants) even with something in reach; hold to charge',
    },
    keys: ['Mouse0'],
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
  // The hotbar row (src/features/hotbar.ts) covers both.
  registerAction('slot-prev', { pad: 'lb', label: 'Previous slot', guide: false, down: () => cycle(-1) });
  registerAction('slot-next', { pad: 'rb', label: 'Next slot', guide: false, down: () => cycle(1) });
  // Click once to sprint, like most console games: it stays on until the stick is let go (src/player/player.ts).
  registerAction('sprint', {
    pad: 'l3',
    label: 'Sprint',
    detail: { pad: 'Click once; stays on while you move' },
    keys: ['ShiftLeft'],
    group: 'move',
    order: 2,
    down: () => (input.sprint = true),
  });
  registerAction('zoom', {
    pad: 'r3',
    label: 'Camera distance',
    detail: { pad: 'Close, middle, far' },
    group: 'camera',
    order: 1,
    down: zoomStep,
  });

  // Losing focus or hiding the page can swallow the matching keyup/pointerup: treat everything as released.
  function releaseAll() {
    input.keys.clear();
    input.sprint = false;
    releaseStick();
    look.id = null;
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
