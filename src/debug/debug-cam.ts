// Dev-only: with ?debugcam=1, `window.__debugCam.set([x,y,z],[x,y,z])` freezes the camera at a pose (and
// `.clear()` gives it back). Used by `npm run look` (dev/look/); src/features/debug-cam.ts loads it only with the flag.
import { camera } from '../render/scene.ts';
import { defineKind, spawn, despawn, type GameEntity } from '../entity/entity.ts';
import { devInput } from '../player/dev-input.ts';
import './harness-imports.ts';

type V3t = [number, number, number];
let pose: { pos: V3t; look: V3t } | null = null;
let entity: GameEntity | null = null;
let saved: { position: typeof camera.position; quaternion: typeof camera.quaternion; fov: number } | null = null;
defineKind('debug-camera', { lateUpdate: 1000 });
window.__debugCam = {
  set(pos: V3t, look: V3t, fov?: number) {
    if (devInput.camera) return; // A live free camera owns the view until Return.
    if (!pos.every(Number.isFinite) || !look.every(Number.isFinite)) return;
    saved ??= { position: camera.position.clone(), quaternion: camera.quaternion.clone(), fov: camera.fov };
    pose = { pos, look };
    if (fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    entity ??= spawn({
      kind: 'debug-camera',
      lateUpdate() {
        if (!pose) return;
        camera.position.set(...pose.pos);
        camera.lookAt(...pose.look);
        camera.updateMatrixWorld();
      },
    });
  },
  clear() {
    pose = null;
    if (entity) despawn(entity);
    entity = null;
    if (saved) {
      camera.position.copy(saved.position);
      camera.quaternion.copy(saved.quaternion);
      camera.fov = saved.fov;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      saved = null;
    }
  },
};
