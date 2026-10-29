import { isTouch } from './constants.js';
import { clamp } from './math.js';
import { canvas } from './scene.js';
import { me, cam } from './player.js';
import { actionDown, actionUp, respawnBall, releaseBall } from './ball.js';
import { sendPresence } from './net.js';
import { dom } from './hud.js';
import { toggleShovel, shovelActive, setHold } from './world/terrain-edits.js';

export const input = { keys: new Set(), stickX: 0, stickY: 0 };
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
    if (e.code === 'Space') {
      me.jumpQueued = 0.15;
      e.preventDefault();
    }
    if (e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'KeyE') actionDown();
    if (e.code === 'KeyR') respawnBall();
    if (e.code === 'KeyF') toggleShovel();
    if (e.code === 'KeyH') document.body.classList.toggle('help-hidden');
  });
  addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    if (e.code === 'KeyE' && me.entered) actionUp();
  });
  addEventListener('blur', () => {
    input.keys.clear();
    setHold(null);
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
    if (shovelActive() && (e.button === 0 || e.button === 2)) setHold(e.button === 0 ? 'dig' : 'pile');
    else if (e.button === 0) actionDown();
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
    actionUp();
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
  function endTouch(e) {
    if (e.pointerId === stick.id) {
      stick.id = null;
      input.stickX = input.stickY = 0;
      stickEl.style.display = 'none';
    }
    if (e.pointerId === look.id) look.id = null;
  }
  touchEl.addEventListener('pointerup', endTouch);
  touchEl.addEventListener('pointercancel', endTouch);
  jumpBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    me.jumpQueued = 0.15;
  });
  grabBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    actionDown();
  });
  grabBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    actionUp();
  });
  grabBtn.addEventListener('pointercancel', () => {
    me.charging = false;
    me.suppressUp = false;
  });

  const { shovelBtn, digBtn, pileBtn } = dom;
  shovelBtn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    toggleShovel();
  });
  for (const [btn, kind] of [
    [digBtn, 'dig'],
    [pileBtn, 'pile'],
  ]) {
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      setHold(kind);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, () => setHold(null));
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      input.keys.clear();
      releaseBall();
    }
    sendPresence();
  });
}
