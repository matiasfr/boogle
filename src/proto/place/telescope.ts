// Local viewing only: the existing scene owns construction and remote-player poses.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../../constants.ts';
import { camConstraints, camForward } from '../../player/player.ts';
import { openModal, closeModal } from '../../player/modal.ts';
import { camera } from '../../render/scene.ts';
import './telescope.css';

/** One typed surface for tuning the reversible composition and pan bounds. World metres/radians/degrees. */
export const telescopeTuning = {
  position: new THREE.Vector3(870, 72, 65),
  target: new THREE.Vector3(1080, 0, -500),
  fov: 48,
  pan: 0.1,
  step: 0.012,
  minZoom: 1,
  maxZoom: 2,
};
const query = new URLSearchParams(location.search);
export const telescopeV2 = query.get('telescope') === 'v2';
const panning = query.get('v') === 'pan';
// Explicit opt-in lets the same reduced-motion path be inspected through the broker.
const staticView = reducedMotion || query.get('telescopeMotion') === 'reduced';
let active = false;
let yaw = 0;
let pitch = 0;
let zoom = 1;
let previousFov = 60;
let previousFocus: HTMLElement | null = null;
const direction = new THREE.Vector3();
const forward = new THREE.Vector3();
const rotation = new THREE.Euler(0, 0, 0, 'YXZ');
const clamp = (n: number, limit: number) => Math.max(-limit, Math.min(limit, n));

function constrain(look: THREE.Vector3, pos: THREE.Vector3) {
  direction.subVectors(telescopeTuning.target, telescopeTuning.position);
  direction.applyEuler(rotation.set(pitch, yaw, 0));
  pos.copy(telescopeTuning.position);
  // The camera owner adds its ordinary eight-metre look offset after constraints.
  look.copy(pos).add(direction).addScaledVector(camForward(forward), -8);
  camera.fov = telescopeTuning.fov / zoom;
  camera.updateProjectionMatrix();
  return true;
}

function exit() {
  if (!active) return;
  active = false;
  camConstraints.splice(camConstraints.indexOf(constrain), 1);
  camera.fov = previousFov;
  camera.updateProjectionMatrix();
  panel.remove();
  document.body.classList.remove('telescope-open');
  closeModal();
  previousFocus?.focus();
}

function pan(x: number, y: number) {
  if (!panning || staticView) return;
  yaw = clamp(yaw + x * telescopeTuning.step, telescopeTuning.pan);
  pitch = clamp(pitch + y * telescopeTuning.step, telescopeTuning.pan * 0.6);
}
function magnify(delta: number) {
  zoom = Math.max(telescopeTuning.minZoom, Math.min(telescopeTuning.maxZoom, zoom + delta));
}
function command(key: string) {
  if (['Escape', 'KeyE', 'b', 'x', 'menu'].includes(key)) exit();
  if (['ArrowLeft', 'left'].includes(key)) pan(1, 0);
  if (['ArrowRight', 'right'].includes(key)) pan(-1, 0);
  if (['ArrowUp', 'up'].includes(key)) pan(0, 1);
  if (['ArrowDown', 'down'].includes(key)) pan(0, -1);
  if (['Equal', 'NumpadAdd', 'rb'].includes(key)) magnify(0.1);
  if (['Minus', 'NumpadSubtract', 'lb'].includes(key)) magnify(-0.1);
}

const panel = document.createElement('div');
panel.className = 'telescope-view';
panel.setAttribute('role', 'dialog');
panel.setAttribute('aria-label', 'Telescope');
panel.setAttribute('aria-modal', 'true');
const bar = document.createElement('div');
panel.append(bar);
function button(label: string, action: () => void) {
  const el = document.createElement('button');
  el.textContent = label;
  el.onclick = action;
  bar.append(el);
  return el;
}
if (panning && !staticView) {
  button('←', () => pan(1, 0)).ariaLabel = 'Pan left';
  button('→', () => pan(-1, 0)).ariaLabel = 'Pan right';
  button('↑', () => pan(0, 1)).ariaLabel = 'Pan up';
  button('↓', () => pan(0, -1)).ariaLabel = 'Pan down';
}
button('−', () => magnify(-0.1)).ariaLabel = 'Zoom out';
button('+', () => magnify(0.1)).ariaLabel = 'Zoom in';
const leave = button('Step back', exit);
// Keep pointer/wheel input in the view, including the opening touch release.
for (const event of ['pointerdown', 'pointerup', 'pointermove', 'wheel'])
  panel.addEventListener(event, (e) => e.stopPropagation());

export function openTelescope() {
  if (active) return;
  if (
    !openModal({
      onKey: (e) => {
        e.preventDefault();
        if (e.key === 'tab') {
          const buttons = [...bar.querySelectorAll('button')];
          const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[(at + (e.shift ? -1 : 1) + buttons.length) % buttons.length]?.focus();
          return;
        }
        if (e.key === 'confirm') {
          if (!e.repeat && document.activeElement instanceof HTMLButtonElement) document.activeElement.click();
          return;
        }
        if (e.repeat && (e.key === 'back' || e.key === 'interact')) return;
        const slot = {
          back: 'b',
          interact: 'b',
          up: 'up',
          down: 'down',
          left: 'left',
          right: 'right',
          zoomIn: 'rb',
          zoomOut: 'lb',
        };
        if (e.key && e.key in slot) command(slot[e.key as keyof typeof slot]);
      },
      onPad: command,
    })
  )
    return;
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  previousFov = camera.fov;
  yaw = pitch = 0;
  zoom = 1;
  active = true;
  // Cut directly to the same composition, including reduced motion. No timed dismissal or camera drift.
  camConstraints.unshift(constrain);
  document.body.classList.add('telescope-open');
  document.body.append(panel);
  leave.focus();
}
