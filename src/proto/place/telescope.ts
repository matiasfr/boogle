// Local viewing only: the existing scene owns construction and remote-player poses.
import * as THREE from 'three/webgpu';
import { camConstraints, camForward } from '../../player/player.ts';
import { openModal, closeModal } from '../../player/modal.ts';
import { camera } from '../../render/scene.ts';
import './telescope.css';

/** One typed surface for tuning the fixed composition and zoom range. World metres/degrees. */
export const telescopeTuning = {
  position: new THREE.Vector3(870, 72, 65),
  target: new THREE.Vector3(1080, 0, -500),
  fov: 48,
  minZoom: 1,
  maxZoom: 2,
};
const query = new URLSearchParams(location.search);
export const telescopeV2 = query.get('telescope') === 'v2';
let active = false;
let zoom = 1;
let previousFov = 60;
let previousFocus: HTMLElement | null = null;
const direction = new THREE.Vector3();
const forward = new THREE.Vector3();

function constrain(look: THREE.Vector3, pos: THREE.Vector3) {
  direction.subVectors(telescopeTuning.target, telescopeTuning.position);
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

function magnify(delta: number) {
  zoom = Math.max(telescopeTuning.minZoom, Math.min(telescopeTuning.maxZoom, zoom + delta));
}
function command(key: string) {
  if (['Escape', 'KeyE', 'b', 'x', 'menu'].includes(key)) exit();
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
  zoom = 1;
  active = true;
  // Cut directly to the same composition, including reduced motion. No timed dismissal or camera drift.
  camConstraints.unshift(constrain);
  document.body.classList.add('telescope-open');
  document.body.append(panel);
  leave.focus();
}
