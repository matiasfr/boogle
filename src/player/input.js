import { isTouch } from '../constants.js';
import { clamp } from '../math.js';
import { canvas } from '../render/scene.js';
import { me, cam } from './player.js';
import { respawnBall, releaseBall } from '../physics/ball.js';
import { sendPresence } from '../netplay/net.js';
import { dom } from './hud.js';
import { useDown, useUp, interactDown, interactUp, touchDown } from './hands.js';
import { cycle } from './inventory.js';
import { registerAction, describeControl, isTyping } from './controls.js';

export const input = { keys: new Set(), stickX: 0, stickY: 0, sprint: false };
export const inputState = { locked: false, lockFailed: false };
let everLocked = false; // a refused lock is only permanent if none ever worked (Chrome refuses one just after Esc)
const lockRefused = () => {
  if (!everLocked) inputState.lockFailed = true;
};

export function requestLock() {
  if (isTouch || inputState.locked || !canvas.requestPointerLock) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch) p.catch(lockRefused);
  } catch {
    lockRefused();
  }
}
// Lets go of every held key, button, stick (a modal takes the input: src/player/modal.js).
let releaseInputFn = null;
export const releaseInput = () => releaseInputFn?.();
// Wired from main.js after every module has loaded (hud.js and input.js import each other).
export function initInput() {
  if (isTouch) document.body.classList.add('touch');
  document.addEventListener('pointerlockchange', () => {
    inputState.locked = document.pointerLockElement === canvas;
    if (inputState.locked) everLocked = true;
  });
  document.addEventListener('pointerlockerror', lockRefused);

  // Held keys (move, sprint) are tracked here; one-press keys bind through their
  // action (registerAction's key) or onKey (src/player/controls.js). Both skip key presses aimed at a text field.
  addEventListener('keydown', (e) => {
    if (!me.entered || isTyping(e)) return;
    input.keys.add(e.code);
    if (e.code === 'Space') {
      me.jumpQueued = 0.15;
      me.jumpHeld = true;
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
  let drag = null;
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousedown', (e) => {
    if (!me.entered) return;
    canvas.focus();
    if (!inputState.locked) {
      requestLock();
      drag = { x: e.clientX, y: e.clientY, moved: false };
    }
    if (e.button === 0) useDown();
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
    useUp();
  });
  canvas.addEventListener(
    'wheel',
    (e) => {
      cam.dist = clamp(cam.dist + e.deltaY * 0.01, 3, 12);
      e.preventDefault();
    },
    { passive: false },
  );

  const { touchEl, stickEl, knobEl, jumpBtn, grabBtn } = dom;
  const stick = { id: null, ox: 0, oy: 0 };
  const look = { id: null, x: 0, y: 0 };
  touchEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.tbtn')) return;
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
      let dx = e.clientX - stick.ox,
        dy = e.clientY - stick.oy;
      const len = Math.hypot(dx, dy);
      if (len > 50) {
        dx *= 50 / len;
        dy *= 50 / len;
      }
      input.stickX = dx / 50;
      input.stickY = dy / 50;
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
  function endTouch(e) {
    if (e.pointerId === stick.id) releaseStick();
    if (e.pointerId === look.id) look.id = null;
  }
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) touchEl.addEventListener(ev, endTouch);
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    me.jumpQueued = 0.15;
    me.jumpHeld = true;
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

  // Gamepad layout for the built-in controls (src/player/controls.js; features register their own).
  const ZOOMS = [4, 6.5, 10];
  const zoomStep = () => (cam.dist = ZOOMS.find((d) => d > cam.dist + 0.1) ?? ZOOMS[0]);
  describeControl('move', {
    label: 'Move',
    keys: [
      ['KeyW', 'KeyA', 'KeyS', 'KeyD'],
      ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
    ],
    pad: 'ls',
    touch: 'Drag on the left',
    group: 'move',
    order: 0,
  });
  describeControl('look', {
    label: 'Look around',
    keys: ['MouseMove'],
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
    down: () => ((me.jumpQueued = 0.15), (me.jumpHeld = true)),
    up: () => (me.jumpHeld = false),
  });
  registerAction('use', {
    pad: 'x',
    label: 'Use what you hold',
    detail: 'Hold to charge a throw, release to throw. With empty hands it does the same as the interact button.',
    keys: ['Mouse0'],
    group: 'hands',
    order: 1,
    down: useDown,
    up: useUp,
  });
  registerAction('interact', {
    pad: 'b',
    label: 'Talk, pick up, take, shake a palm',
    keys: ['KeyE'],
    touch: 'Grab',
    group: 'hands',
    order: 0,
    down: interactDown,
    up: interactUp,
  });
  registerAction('respawn', {
    pad: 'view',
    label: 'Bring the ball back',
    keys: ['KeyR'],
    group: 'ball',
    down: respawnBall,
  });
  // The hotbar row (src/features/hotbar.js) covers both.
  registerAction('slot-prev', { pad: 'lb', label: 'Previous slot', guide: false, down: () => cycle(-1) });
  registerAction('slot-next', { pad: 'rb', label: 'Next slot', guide: false, down: () => cycle(1) });
  // Click once to sprint, like most console games: it stays on until the stick is let go (src/player/player.js).
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
    keys: ['Wheel'],
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
