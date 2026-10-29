import { isTouch } from './constants.js';
import { clamp } from './math.js';
import { canvas } from './scene.js';
import { me, cam } from './player.js';
import { respawnBall, releaseBall } from './ball.js';
import { sendPresence } from './net.js';
import { dom } from './hud.js';
import { shovelActive, setHold, setFlatten } from './world/terrain-edits.js';
import { useDown, useUp, grabDown, grabUp, touchDown, ensureShovel, toggleShovelHand } from './hands.js';
import { cycle } from './inventory.js';
import { registerAction } from './controls.js';

export const input = { keys: new Set(), stickX: 0, stickY: 0, sprint: false };
export const inputState = { locked: false, lockFailed: false };

export function requestLock() {
  if (isTouch || inputState.locked || !canvas.requestPointerLock) return;
  try {
    const p = canvas.requestPointerLock();
    if (p && p.catch)
      p.catch(() => {
        inputState.lockFailed = true;
      });
  } catch {
    inputState.lockFailed = true;
  }
}
// Wired from main.js after every module has loaded (hud.js and input.js import each other).
export function initInput() {
  if (isTouch) document.body.classList.add('touch');
  document.addEventListener('pointerlockchange', () => {
    inputState.locked = document.pointerLockElement === canvas;
  });
  document.addEventListener('pointerlockerror', () => {
    inputState.lockFailed = true;
  });

  const typing = () => document.activeElement === dom.nameInput;
  addEventListener('keydown', (e) => {
    if (!me.entered || typing()) return;
    input.keys.add(e.code);
    if (e.key === 'Shift') setFlatten(true);
    if (e.code === 'Space') {
      me.jumpQueued = 0.15;
      me.jumpHeld = true;
      e.preventDefault();
    }
    if (e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyE') grabDown();
    if (e.code === 'KeyR') respawnBall();
    if (e.code === 'KeyF') toggleShovelHand();
    // Q digs, Z piles (hold to repeat); pulls the shovel out if needed, never mid-throw.
    if ((e.code === 'KeyQ' || e.code === 'KeyZ') && !me.charging && ensureShovel())
      setHold(e.code === 'KeyQ' ? 'dig' : 'pile');
    if (e.code === 'KeyH') document.body.classList.toggle('help-hidden');
  });
  addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    // macOS sends no keyup for other keys while Cmd is held, so they would stay pressed: release them all with Cmd.
    if (e.key === 'Meta') input.keys.clear();
    if (e.key === 'Shift') setFlatten(false);
    if (e.code === 'Space') me.jumpHeld = false;
    if (e.code === 'KeyQ') setHold(null, 'dig');
    if (e.code === 'KeyZ') setHold(null, 'pile');
    if (e.code === 'KeyE' && me.entered) grabUp();
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
    if (shovelActive() && (e.button === 0 || e.button === 2))
      setHold(e.button === 2 ? 'pile' : e.shiftKey ? 'flatten' : 'dig');
    else if (e.button === 0) useDown();
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
    if (e.button === 0 || e.button === 2) setHold(null);
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

  const { shovelBtn, digBtn, pileBtn } = dom;
  shovelBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    toggleShovelHand();
  });
  for (const [btn, kind] of [
    [digBtn, 'dig'],
    [pileBtn, 'pile'],
  ]) {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (ensureShovel()) setHold(kind);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, () => setHold(null));
  }

  // Gamepad layout for the built-in controls (src/controls.js; features register their own).
  // Like Q/Z: holding dig, pile or flatten pulls the shovel out, never mid-throw.
  const hold = (kind) => ({
    down: () => {
      if (!me.charging && ensureShovel()) setHold(kind);
    },
    up: () => setHold(null, kind),
  });
  const zoom = (dir) => ({ held: (dt) => (cam.dist = clamp(cam.dist + dir * 6 * dt, 3, 12)) });
  registerAction('jump', {
    pad: 'a',
    label: 'Jump',
    down: () => ((me.jumpQueued = 0.15), (me.jumpHeld = true)),
    up: () => (me.jumpHeld = false),
  });
  registerAction('use', { pad: 'x', label: 'Use what you hold (hold to throw a thing)', down: useDown, up: useUp });
  registerAction('grab', { pad: 'b', label: 'Grab, or throw what you hold (hold)', down: grabDown, up: grabUp });
  registerAction('respawn', { pad: 'view', label: 'Bring the ball back', down: respawnBall });
  registerAction('slot-prev', { pad: 'lb', label: 'Hotbar: previous slot', down: () => cycle(-1) });
  registerAction('slot-next', { pad: 'rb', label: 'Hotbar: next slot', down: () => cycle(1) });
  registerAction('dig', { pad: 'rt', label: 'Dig (hold)', ...hold('dig') });
  registerAction('pile', { pad: 'lt', label: 'Pile (hold)', ...hold('pile') });
  registerAction('flatten', { pad: 'r3', label: 'Flatten (hold)', ...hold('flatten') });
  // Click once to sprint, like most console games: it stays on until the stick is let go (src/player.js).
  registerAction('sprint', {
    pad: 'l3',
    label: 'Sprint (click, stays on while moving)',
    down: () => (input.sprint = true),
  });
  registerAction('zoom-in', { pad: 'up', label: 'Camera closer', ...zoom(-1) });
  registerAction('zoom-out', { pad: 'down', label: 'Camera farther', ...zoom(1) });

  // Losing focus or hiding the page can swallow the matching keyup/pointerup: treat everything as released.
  function releaseAll() {
    input.keys.clear();
    input.sprint = false;
    releaseStick();
    look.id = null;
    setFlatten(false);
    setHold(null);
  }
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
