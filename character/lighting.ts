// Two Local inspection looks, with the same atmosphere and AgX curve as the shipped frozen-water sky.
// This document owns its renderer/pipeline; importing this module never starts the game renderer or a room.
import * as THREE from 'three/webgpu';
import { pass, uv, vec3, vec4 } from 'three/tsl';
import { skyState } from '../src/sim/sky-clock.ts';
import { createWaterSkyFor } from '../src/render/water/sky-core.ts';
import { agx, TSL } from '../src/render/tone.ts';

export type LightPreset = 'studio' | 'shipped';
const NOTES: Record<LightPreset, string> = {
  studio: 'Neutral studio · linear HDR → Neutral → sRGB. Neutral key and hemisphere fill.',
  shipped:
    'Shipped frozen sky at 0.24 · actual atmosphere, sun and cube irradiance → shipped AgX → sRGB. No adaptive exposure, world fog, underwater effects or bloom.',
};

export async function createStageLighting(renderer: THREE.WebGPURenderer, scene: THREE.Scene, camera: THREE.Camera) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scenePass = pass(scene, camera, { colorSpace: THREE.LinearSRGBColorSpace });
  const pipeline = new THREE.RenderPipeline(renderer, scenePass);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.5);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 0.1, far: 120 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);

  // Same frozen direction as frozen-sky.ts, without its mutable world/render imports.
  const noon = new THREE.Vector3(0.45, 0.78, 0.32).normalize();
  const east = new THREE.Vector3().crossVectors(noon, new THREE.Vector3(0, 1, 0)).normalize();
  const angle = skyState(0.24, 0.5).sunAngle;
  const direction = east.multiplyScalar(Math.cos(angle)).addScaledVector(noon, Math.sin(angle));
  const sky = createWaterSkyFor(renderer);
  sky.bake({
    elevation: THREE.MathUtils.radToDeg(Math.asin(direction.y)),
    azimuth: THREE.MathUtils.radToDeg(Math.atan2(direction.x, direction.z)),
  });
  const upper = new THREE.Color();
  const lower = new THREE.Color();
  const target = new THREE.RenderTarget(2, 1, { type: THREE.FloatType, depthBuffer: false });
  const material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
  material.fragmentNode = vec4(sky.ambient(vec3(0, uv().x.lessThan(0.5).select(1, -1), 0)), 1);
  const previous = renderer.getRenderTarget();
  const face = renderer.getActiveCubeFace();
  const mip = renderer.getActiveMipmapLevel();
  try {
    renderer.setRenderTarget(target);
    new THREE.QuadMesh(material).render(renderer);
    renderer.setRenderTarget(previous, face, mip);
    const pixels = (await renderer.readRenderTargetPixelsAsync(target, 0, 0, 2, 1)) as Float32Array;
    upper.fromArray(pixels, 0);
    lower.fromArray(pixels, 4);
  } finally {
    renderer.setRenderTarget(previous, face, mip);
    target.dispose();
    material.dispose();
  }

  const { Fn, select, pow, uniform } = TSL;
  const exposure = uniform(1);
  const shippedOutput = Fn(() => {
    const c = agx(scenePass.getTextureNode().rgb.mul(exposure));
    const srgb = select(
      c.lessThanEqual(vec3(0.0031308)),
      c.mul(12.92),
      pow(c, vec3(1 / 2.4))
        .mul(1.055)
        .sub(0.055),
    );
    return vec4(srgb, 1);
  })();
  let preset: LightPreset = 'studio';
  function set(next: LightPreset) {
    preset = next;
    if (next === 'shipped') {
      scene.background = null;
      scene.backgroundNode = sky.background;
      scene.environment = sky.cube;
      scene.environmentIntensity = 1;
      sun.position.copy(direction).multiplyScalar(80);
      const c = sky.sunColor.value;
      const r = Math.max(c.x, 1e-4);
      sun.color.setRGB(c.x / r, c.y / r, c.z / r);
      sun.intensity = Math.PI * r;
      hemi.color.copy(upper);
      hemi.groundColor.copy(lower);
      hemi.intensity = Math.PI;
      pipeline.outputNode = shippedOutput;
      pipeline.outputColorTransform = false;
    } else {
      scene.backgroundNode = null;
      scene.background = new THREE.Color('#b8bec4');
      scene.environment = null;
      sun.position.set(3, 6, 4);
      sun.color.set(0xffffff);
      sun.intensity = 2.5;
      hemi.color.set(0xffffff);
      hemi.groundColor.set(0x888888);
      hemi.intensity = 1.5;
      pipeline.outputNode = scenePass;
      pipeline.outputColorTransform = true;
    }
    pipeline.needsUpdate = true;
  }
  set('studio');
  return {
    pipeline,
    set,
    setExposure(value: number) {
      exposure.value = value;
      renderer.toneMappingExposure = value;
    },
    // The sun and exposure are intentionally fixed. Keeps the preview's update ownership explicit.
    update() {},
    get preset() {
      return preset;
    },
    get note() {
      return `${NOTES[preset]} Fixed review exposure ${exposure.value}; saved in the view link.`;
    },
    dispose() {
      scene.remove(hemi, sun, sun.target);
      scene.backgroundNode = null;
      scene.environment = null;
      sky.dispose();
      sun.shadow.dispose();
      pipeline.dispose();
      scenePass.dispose();
    },
  };
}
