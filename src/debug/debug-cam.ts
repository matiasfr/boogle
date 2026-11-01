// Dev-only: with ?debugcam=1, `window.__debugCam.set([x,y,z],[x,y,z])` freezes the camera at a pose (and
// `.clear()` gives it back). Used by `npm run look` (dev/look/); src/features/debug-cam.ts loads it only with the flag.
import { camera } from '../render/scene.ts';
import { onFrame } from '../loop.ts';

type V3t = [number, number, number];
let pose: { pos: V3t; look: V3t } | null = null;
window.__debugCam = {
  set(pos: V3t, look: V3t, fov?: number) {
    pose = { pos, look };
    if (fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  },
  clear() {
    pose = null;
  },
};
onFrame(
  () => {
    if (!pose) return;
    camera.position.set(...pose.pos);
    camera.lookAt(...pose.look);
    camera.updateMatrixWorld();
  },
  { phase: 'late', order: 1000 },
);
