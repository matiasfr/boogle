import { Vector3, Euler } from 'three/webgpu';
import { camera } from '../../render/scene.ts';
import { defineKind, spawn, despawn, type GameEntity } from '../../entity/entity.ts';
import { releaseInput } from '../../player/input.ts';
import { modalOpen } from '../../player/modal.ts';
import { PROTO } from '../../proto/flags.ts';
import { SEA, SPAWN } from '../../constants.ts';
import { groundHeight } from '../../island/heights.ts';
import { MASSIF } from '../../island/shape.ts';
import lighthouse from '../../pois/lighthouse/site.ts';
import { ROUTE } from '../../sim/route.ts';
import { destinationName, DESTINATIONS } from './fixtures.ts';
import { el, command, note } from './ui.ts';
import { no, ok, type Tool } from './types.ts';

const position = new Vector3(),
  rotation = new Euler(0, 0, 0, 'YXZ'),
  forward = new Vector3(),
  side = new Vector3();
let active: GameEntity | null = null;
let saved: { position: Vector3; quaternion: typeof camera.quaternion; fov: number } | null = null;
let mounted = false;
const clamp = () => {
  position.x = Math.max(-400, Math.min(1600, position.x));
  position.y = Math.max(-10, Math.min(300, position.y));
  position.z = Math.max(-1200, Math.min(400, position.z));
  rotation.x = Math.max(-1.5, Math.min(1.5, rotation.x));
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
  if (!mounted || !modalOpen()) return no('Open the Free camera page first; its modal keeps player input captured.');
  if (active) return ok('Free camera already active.');
  saved = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov };
  position.copy(camera.position);
  rotation.setFromQuaternion(camera.quaternion, 'YXZ');
  active = spawn({
    kind: 'dev-camera',
    lateUpdate({ dt }) {
      releaseInput();
      const pad = [...navigator.getGamepads()].find((p) => p?.connected);
      if (pad) {
        const axis = (i: number) => (Math.abs(pad.axes[i] ?? 0) > 0.2 ? pad.axes[i]! : 0);
        move(axis(0) * 12, 0, -axis(1) * 12, Math.min(dt, 0.1));
        rotation.y -= axis(2) * Math.min(dt, 0.1) * 1.5;
        rotation.x -= axis(3) * Math.min(dt, 0.1) * 1.5;
      }
      clamp();
      camera.position.copy(position);
      camera.quaternion.setFromEuler(rotation);
      camera.updateMatrixWorld();
    },
  });
  return ok('Free camera active. Player input stays captured.');
}
function restore() {
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
  return ok('Returned to the player camera; pose and FOV restored.');
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
  scope: 'Local camera only. Bookmarks never move the player. Back/Resume also restores the camera.',
  commands: ['start', 'move', 'look', 'bookmark', 'return'],
  available: () => null,
  async run(commandName, args) {
    if (commandName === 'return') return restore();
    if (commandName === 'start') return start();
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
      if (!destinationName(args.destination)) return no('Choose a named bookmark.');
      if (PROTO === 'place') {
        const target = (await import('./place.ts')).destination(args.destination);
        if (!target) return no('This bookmark is unavailable at this stage.');
        const result = start();
        if (!result.ok) return result;
        position.set(target.x + 12, target.y + 10, target.z + 14);
        camera.position.copy(position);
        camera.lookAt(target.x, target.y, target.z);
        rotation.setFromQuaternion(camera.quaternion, 'YXZ');
      } else {
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
    }
    clamp();
    return ok('Camera updated.', { position: position.toArray(), rotation: [rotation.x, rotation.y], fov: camera.fov });
  },
  snapshot: () => ({
    active: !!active,
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  }),
  mount(parent, ctx) {
    mounted = true;
    note(parent, 'Drag below to look. Use buttons or pad sticks to move and look; up/down buttons change height.');
    command(parent, ctx, 'camera', 'Start free camera', 'start');
    command(parent, ctx, 'camera', 'Return to player camera', 'return');
    const drag = el('div', 'Drag to look', 'dev-drag');
    drag.setAttribute('aria-label', 'Drag to look');
    parent.append(drag);
    let last: { x: number; y: number; id: number } | null = null;
    drag.onpointerdown = (e) => {
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
      drag.setPointerCapture(e.pointerId);
      void ctx.run('camera', 'start');
    };
    drag.onpointermove = (e) => {
      if (!last) return;
      void ctx.run('camera', 'look', { x: e.clientX - last.x, y: e.clientY - last.y });
      last = { x: e.clientX, y: e.clientY, id: e.pointerId };
    };
    drag.onpointerup = drag.onpointercancel = () => {
      last = null;
    };
    const moves = el('div', '', 'dev-actions');
    parent.append(moves);
    for (const [label, axis, direction] of [
      ['Forward', 'forward', 1],
      ['Back', 'forward', -1],
      ['Left', 'right', -1],
      ['Right', 'right', 1],
      ['Up', 'up', 1],
      ['Down', 'up', -1],
    ] as const)
      command(moves, ctx, 'camera', label, 'move', { axis, direction });
    note(
      parent,
      PROTO === 'place'
        ? 'Place camera bookmarks'
        : 'Home equivalents: shore, open sea, lighthouse, rocky upland and work site.',
    );
    for (const destination of DESTINATIONS)
      command(parent, ctx, 'camera', `View ${destination}`, 'bookmark', { destination });
    return () => {
      mounted = false;
      restore();
    };
  },
};
