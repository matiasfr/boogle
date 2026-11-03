// Retained demo adapter; the shared sky owns its bake resources, this page owns its movable sun/look.
import * as THREE from 'three/webgpu';
import { camera, renderer, scene, sky, sun } from '../../render/scene.ts';
import { seaU } from '../../render/water/state.ts';
import { createWaterSky, type SkyParams } from '../../render/water/sky.ts';
export type { SkyParams } from '../../render/water/sky.ts';

const environment = createWaterSky();
export const demoSky = {
  ...environment,
  update(changes: Partial<SkyParams> = {}) {
    environment.bake(changes);
    scene.backgroundNode = environment.background;
    scene.environment = environment.cube;
    scene.environmentIntensity = 1;
    sky.visible = false;
    scene.traverse((o) => {
      if (o.renderOrder === -0.5) o.visible = false;
    });
    const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as
      THREE.HemisphereLight | undefined;
    if (hemi) hemi.intensity = 0;
    sun.target.position.set(camera.position.x, 0, camera.position.z);
    sun.position.copy(environment.sunDirection.value).multiplyScalar(2000).add(sun.target.position);
    const c = environment.sunColor.value,
      r = Math.max(c.x, 1e-4);
    sun.color.setRGB(c.x / r, c.y / r, c.z / r);
    sun.intensity = Math.PI * r;
    seaU.uSun.value.copy(environment.sunDirection.value);
    seaU.uSpecCol.value.setRGB(c.x, c.y, c.z);
    seaU.uLight.value.setRGB(1, 1, 1);
    renderer.toneMappingExposure = 1;
  },
};
