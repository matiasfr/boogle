// Keep the crossing's clip and fog ranges; the real sea owns the frozen sky and matching sun.
import * as THREE from 'three/webgpu';
import { FOG_FAR } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { camera, scene } from '../../render/scene.ts';
import { CROSSING } from './tuning.ts';
export function extendSky() {
  camera.far = CROSSING.fogFar * 1.3;
  camera.near = 0.25;
  camera.updateProjectionMatrix();
  onFrame(
    () => {
      const fog = scene.fog as THREE.Fog;
      if (fog.far !== FOG_FAR) return;
      fog.near = CROSSING.fogNear;
      fog.far = CROSSING.fogFar;
    },
    { phase: 'update', order: -4 },
  );
}
