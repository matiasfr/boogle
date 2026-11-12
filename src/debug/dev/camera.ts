import { Vector3, Euler } from 'three/webgpu';
import { camera, canvas } from '../../render/scene.ts';
import { defineKind, spawn, despawn, type GameEntity } from '../../entity/entity.ts';
import { releaseInput } from '../../player/input.ts';
import { modalOpen } from '../../player/modal.ts';
import { devInput } from '../../player/dev-input.ts';
import { onKey, describeControl, isTyping } from '../../player/controls.ts';
import { CARD, productionRailway } from '../../proto/flags.ts';
import { SEA, SPAWN } from '../../constants.ts';
import { groundHeight } from '../../island/heights.ts';
import { MASSIF } from '../../island/shape.ts';
import lighthouse from '../../pois/lighthouse/site.ts';
import { ROUTE } from '../../sim/route.ts';
import { el, button, command, note, more } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

const position = new Vector3(),
  rotation = new Euler(0, 0, 0, 'YXZ'),
  forward = new Vector3(),
  side = new Vector3();
let active: GameEntity | null = null;
let saved: { position: Vector3; quaternion: typeof camera.quaternion; fov: number } | null = null;
let speed = 12,
  fov = 60;
const keys = new Set<string>(),
  held = new Map<number, [number, number, number]>();
let drag: { id: number; x: number; y: number; target: Element } | null = null;
let removeInput = () => {};
type Bookmark = { position: number[]; rotation: number[]; fov: number; route: string };
const bookmarks = new Map<number, Bookmark>();
const STORAGE = 'boogle.dev.camera.v1';
const route = () => CARD;
// Named viewpoints over the classic island; the current game has none (its Go to went with Place, M13e).
const VIEWS = ['spawn', 'shore', 'shallow', 'deep', 'plunge', 'tower', 'head', 'forge', 'frame'] as const;
const viewName = (value: unknown): value is (typeof VIEWS)[number] => VIEWS.some((id) => id === value);
const vector = (v: unknown, n: number, bound: number): v is number[] =>
  Array.isArray(v) &&
  v.length === n &&
  v.every((x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) <= bound);
try {
  const value = JSON.parse(localStorage.getItem(STORAGE) ?? 'null') as {
    version?: number;
    speed?: number;
    bookmarks?: unknown[];
  } | null;
  if (value?.version === 1) {
    if (typeof value.speed === 'number' && Number.isFinite(value.speed)) speed = Math.max(1, Math.min(60, value.speed));
    if (Array.isArray(value.bookmarks))
      for (const [i, item] of value.bookmarks.slice(0, 6).entries()) {
        const b = item as Partial<Bookmark> | null;
        if (
          b &&
          vector(b.position, 3, 5000) &&
          vector(b.rotation, 2, 10) &&
          typeof b.fov === 'number' &&
          b.fov >= 15 &&
          b.fov <= 110 &&
          typeof b.route === 'string' &&
          b.route.length < 40
        )
          bookmarks.set(i + 1, b as Bookmark);
      }
  }
} catch {
  /* Optional browser preferences never prevent camera use. */
}
function persist() {
  try {
    localStorage.setItem(
      STORAGE,
      JSON.stringify({
        version: 1,
        speed,
        bookmarks: Array.from({ length: 6 }, (_, i) => bookmarks.get(i + 1) ?? null),
      }),
    );
  } catch {
    /* Camera remains usable when storage is unavailable. */
  }
}
persist(); // Drop unsupported saved fields while keeping this browser's usable bookmarks.
const clearHeld = () => {
  keys.clear();
  held.clear();
  if (drag?.target.hasPointerCapture(drag.id)) drag.target.releasePointerCapture(drag.id);
  drag = null;
};
export const cameraActive = () => active !== null;
const changed = () => window.dispatchEvent(new Event('dev-camera-change'));
const clamp = () => {
  position.x = Math.max(-400, Math.min(4000, position.x));
  position.y = Math.max(-10, Math.min(300, position.y));
  position.z = Math.max(-1200, Math.min(400, position.z));
  rotation.x = Math.max(-1.5, Math.min(1.5, rotation.x));
  rotation.y = Math.atan2(Math.sin(rotation.y), Math.cos(rotation.y));
};
function move(x: number, y: number, z: number, dt = 1) {
  forward.set(-Math.sin(rotation.y), 0, -Math.cos(rotation.y));
  side.set(Math.cos(rotation.y), 0, -Math.sin(rotation.y));
  position.addScaledVector(side, x * dt).addScaledVector(forward, z * dt);
  position.y += y * dt;
  clamp();
}
defineKind('dev-camera', { lateUpdate: 1001 });
function start() {
  if (active) return ok('Free camera already active.');
  window.__debugCam?.clear();
  saved = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov };
  fov = camera.fov;
  position.copy(camera.position);
  rotation.setFromQuaternion(camera.quaternion, 'YXZ');
  devInput.camera = true;
  releaseInput();
  if (document.pointerLockElement) document.exitPointerLock();
  installInput();
  active = spawn({
    kind: 'dev-camera',
    lateUpdate({ dt }) {
      const step = Math.min(dt, 0.1);
      if (!modalOpen() && !document.hidden && document.hasFocus()) {
        if (!devInput.dock) {
          move(
            (+keys.has('KeyD') - +keys.has('KeyA')) * speed,
            (+keys.has('Space') - +(keys.has('ShiftLeft') || keys.has('ShiftRight'))) * speed,
            (+keys.has('KeyW') - +keys.has('KeyS')) * speed,
            step,
          );
          const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected);
          if (pad) {
            const axis = (i: number) => (Math.abs(pad.axes[i] ?? 0) > 0.2 ? pad.axes[i]! : 0);
            move(
              axis(0) * speed,
              ((pad.buttons[5]?.value ?? 0) - (pad.buttons[4]?.value ?? 0)) * speed,
              -axis(1) * speed,
              step,
            );
            rotation.y -= axis(2) * step * 1.5;
            rotation.x -= axis(3) * step * 1.5;
            if (pad.buttons[1]?.pressed) {
              returnCamera();
              return;
            }
          }
        } else keys.clear();
        for (const [x, y, z] of held.values()) move(x * speed, y * speed, z * speed, step);
      } else clearHeld();
      if (camera.fov !== fov) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      clamp();
      camera.position.copy(position);
      camera.quaternion.setFromEuler(rotation);
      camera.updateMatrixWorld();
    },
  });
  changed();
  return ok('Free camera active. Player input stays captured.');
}
export function returnCamera() {
  removeInput();
  clearHeld();
  devInput.camera = false;
  if (active) despawn(active);
  active = null;
  if (saved) {
    camera.position.copy(saved.position);
    camera.quaternion.copy(saved.quaternion);
    camera.fov = saved.fov;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    saved = null;
  }
  releaseInput();
  changed();
  return ok('Returned to the player camera; pose and FOV restored.');
}
function installInput() {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const isScene = (target: EventTarget | null) =>
    target === canvas || (target instanceof Element && target.closest('#touch') && !target.closest('button'));
  window.addEventListener(
    'pointerdown',
    (e) => {
      if (modalOpen() || !isScene(e.target) || e.button > 0) return;
      devInput.dock = false;
      (document.activeElement as HTMLElement | null)?.blur?.();
      const target = e.target as Element;
      if (e.isTrusted) target.setPointerCapture(e.pointerId);
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, target };
      e.preventDefault();
    },
    options,
  );
  window.addEventListener(
    'pointermove',
    (e) => {
      if (!drag || e.pointerId !== drag.id || modalOpen()) return;
      rotation.y -= (e.clientX - drag.x) * 0.005;
      rotation.x -= (e.clientY - drag.y) * 0.005;
      drag.x = e.clientX;
      drag.y = e.clientY;
      clamp();
    },
    options,
  );
  const up = (e: PointerEvent) => {
    held.delete(e.pointerId);
    if (drag?.id === e.pointerId) drag = null;
  };
  window.addEventListener('pointerup', up, options);
  window.addEventListener('pointercancel', up, options);
  window.addEventListener('blur', clearHeld, options);
  document.addEventListener('visibilitychange', clearHeld, options);
  window.addEventListener('pagehide', returnCamera, options);
  window.addEventListener(
    'keyup',
    (e) => {
      keys.delete(e.code);
      if (e.key === 'Meta') clearHeld();
    },
    { ...options, capture: true },
  );
  window.addEventListener(
    'keydown',
    (e) => {
      if (!modalOpen() && !devInput.dock && !isTyping(e) && ['Space', 'ShiftLeft', 'ShiftRight'].includes(e.code))
        e.preventDefault();
    },
    options,
  );
  removeInput = () => {
    controller.abort();
    removeInput = () => {};
  };
}
for (const code of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'])
  onKey(code, {
    owner: 'dev-camera',
    down: () => {
      if (active && !devInput.dock && !modalOpen()) keys.add(code);
    },
    up: () => keys.delete(code),
  });
describeControl('dev-camera-move', {
  label: 'Fly camera',
  keys: [['KeyW', 'KeyA', 'KeyS', 'KeyD']],
  pad: 'ls',
  touch: 'Hold camera arrows',
  group: 'camera',
  context: 'free camera',
});
describeControl('dev-camera-look', {
  label: 'Look with free camera',
  keys: ['Mouse0'],
  pad: 'rs',
  touch: 'Drag scene',
  group: 'camera',
  context: 'free camera',
});
describeControl('dev-camera-height', {
  label: 'Camera up / down',
  keys: ['Space', 'ShiftLeft'],
  pad: ['rb', 'lb'],
  touch: 'Hold Up / Down',
  group: 'camera',
  context: 'free camera',
});
describeControl('dev-camera-return', {
  label: 'Return to player camera',
  pad: 'b',
  touch: 'Return',
  group: 'camera',
  context: 'free camera',
});

export function mountCameraControls(parent: HTMLElement) {
  const box = el('div', '', 'dev-camera-controls');
  box.dataset.devCameraMoves = '';
  box.dataset.devUi = '';
  for (const [label, x, y, z] of [
    ['Forward', 0, 0, 1],
    ['Back', 0, 0, -1],
    ['Left', -1, 0, 0],
    ['Right', 1, 0, 0],
    ['Up', 0, 1, 0],
    ['Down', 0, -1, 0],
  ] as const) {
    const b = button(label, () => {});
    b.dataset.devMove = label.toLowerCase();
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      start();
      if (e.isTrusted) b.setPointerCapture(e.pointerId);
      held.set(e.pointerId, [x, y, z]);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      b.addEventListener(event, (e) => held.delete((e as PointerEvent).pointerId));
    box.append(b);
  }
  const label = el('label', 'Speed');
  const input = el('input');
  input.type = 'range';
  input.min = '1';
  input.max = '60';
  input.value = String(speed);
  input.setAttribute('aria-label', 'Free camera speed');
  input.oninput = () => {
    speed = Number(input.value);
    persist();
  };
  label.append(input);
  box.append(label);
  parent.append(box);
  const update = () => {
    box.hidden = !active;
  };
  update();
  window.addEventListener('dev-camera-change', update);
  return () => {
    window.removeEventListener('dev-camera-change', update);
    box.remove();
    held.clear();
  };
}
function homeCoast(height: number): [number, number] {
  let best = SPAWN.z + 4;
  for (let z = best; z < SPAWN.z + 90; z += 0.5)
    if (Math.abs(groundHeight(SPAWN.x, z) - height) < Math.abs(groundHeight(SPAWN.x, best) - height)) best = z;
  return [SPAWN.x, best];
}
export const tool: Tool = {
  id: 'camera',
  label: 'Free camera',
  scope:
    'Local camera only. Friends still see your avatar where you left it, under ordinary physics. Bookmarks never move your body. Return restores your player camera.',
  commands: ['start', 'move', 'look', 'bookmark', 'save-bookmark', 'recall-bookmark', 'speed', 'return'],
  available: () => null,
  async run(commandName, args) {
    if (commandName === 'return') return returnCamera();
    if (commandName === 'start') return start();
    if (commandName === 'speed') {
      if (typeof args.value !== 'number' || !Number.isFinite(args.value) || args.value < 1 || args.value > 60)
        return no('Speed must be between 1 and 60 metres per second.');
      speed = args.value;
      persist();
      return ok('Camera speed saved.', speed);
    }
    if (commandName === 'save-bookmark' || commandName === 'recall-bookmark') {
      if (typeof args.slot !== 'number' || !Number.isInteger(args.slot) || args.slot < 1 || args.slot > 6)
        return no('Choose bookmark 1–6.');
      if (commandName === 'save-bookmark') {
        if (!active) return no('Start free camera before saving a bookmark.');
        bookmarks.set(args.slot, {
          position: position.toArray(),
          rotation: [rotation.x, rotation.y],
          fov,
          route: route(),
        });
        persist();
        return ok(`Saved camera bookmark ${args.slot} for this island.`);
      }
      const bookmark = bookmarks.get(args.slot);
      if (!bookmark || bookmark.route !== route()) return no('This bookmark is empty or belongs to another island.');
      start();
      position.fromArray(bookmark.position);
      rotation.set(bookmark.rotation[0]!, bookmark.rotation[1]!, 0, 'YXZ');
      fov = bookmark.fov;
      return ok(`Recalled camera bookmark ${args.slot}.`);
    }
    if (commandName === 'move') {
      const axis = args.axis,
        dir = args.direction;
      if (!['forward', 'right', 'up'].includes(String(axis)) || (dir !== -1 && dir !== 1))
        return no('Use a named camera axis and direction -1 or 1.');
      const result = start();
      if (!result.ok) return result;
      move(axis === 'right' ? dir * 3 : 0, axis === 'up' ? dir * 3 : 0, axis === 'forward' ? dir * 3 : 0);
    } else if (commandName === 'look') {
      if (
        typeof args.x !== 'number' ||
        typeof args.y !== 'number' ||
        !Number.isFinite(args.x) ||
        !Number.isFinite(args.y)
      )
        return no('Finite look deltas required.');
      const result = start();
      if (!result.ok) return result;
      rotation.y -= Math.max(-100, Math.min(100, args.x)) * 0.005;
      rotation.x -= Math.max(-100, Math.min(100, args.y)) * 0.005;
    } else if (commandName === 'bookmark') {
      if (!viewName(args.destination)) return no('Choose a named bookmark.');
      if (productionRailway) return no('This bookmark is unavailable at this stage.');
      const result = start();
      if (!result.ok) return result;
      const home: Record<string, [number, number]> = {
        spawn: [SPAWN.x, SPAWN.z],
        shore: homeCoast(SEA + 0.8),
        shallow: homeCoast(SEA - 0.7),
        deep: homeCoast(SEA - 5),
        plunge: homeCoast(SEA - 5),
        tower: [lighthouse.x, lighthouse.z],
        head: [MASSIF.x, MASSIF.z],
        forge: [ROUTE[0]!.x, ROUTE[0]!.z],
        frame: [ROUTE[0]!.x, ROUTE[0]!.z],
      };
      const [x, z] = home[args.destination]!;
      const y = Math.max(SEA, groundHeight(x, z));
      position.set(x + 12, y + (args.destination === 'plunge' ? 35 : 12), z + 14);
      camera.position.copy(position);
      camera.lookAt(x, y, z);
      rotation.setFromQuaternion(camera.quaternion, 'YXZ');
    }
    clamp();
    return ok('Camera updated.', { position: position.toArray(), rotation: [rotation.x, rotation.y], fov: camera.fov });
  },
  snapshot: () => ({
    active: !!active,
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
    speed,
    bookmarks: [...bookmarks.keys()],
  }),
  mount(parent, ctx) {
    const details = more(parent);
    note(
      details,
      'Drag the scene to look. WASD flies; Space rises, Shift lowers. Pad sticks fly/look, bumpers lower/raise and B returns. Hold the camera buttons on touch. Panels and sliders remain usable.',
    );
    command(parent, ctx, 'camera', 'Start free camera', 'start');
    command(parent, ctx, 'camera', 'Return to player camera', 'return');
    const views = el('select');
    views.setAttribute('aria-label', 'Camera viewpoint');
    for (const destination of VIEWS) {
      const option = el('option', destination);
      option.value = destination;
      views.append(option);
    }
    parent.append(views);
    command(parent, ctx, 'camera', 'View', 'bookmark', () => ({ destination: views.value }));
    const slots = el('select');
    slots.setAttribute('aria-label', 'Saved camera bookmark');
    for (let slot = 1; slot <= 6; slot++) {
      const option = el('option', `Bookmark ${slot}`);
      option.value = String(slot);
      slots.append(option);
    }
    parent.append(slots);
    const actions = el('div', '', 'dev-actions');
    parent.append(actions);
    command(actions, ctx, 'camera', 'Save', 'save-bookmark', () => ({ slot: Number(slots.value) }));
    command(actions, ctx, 'camera', 'Recall', 'recall-bookmark', () => ({ slot: Number(slots.value) }));
    note(
      details,
      'Six saved bookmarks belong to the island where saved. Home viewpoints include shore, open sea, lighthouse, rocky upland and work site.',
    );
    parent.append(details);
    return () => {};
  },
};
