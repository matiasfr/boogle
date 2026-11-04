// MarineSnow.js, as one instanced WebGPU sprite field (not an emitted particle pool).
// Its 6000 immutable seeds wrap around the lens; depth-writing discs let the volume fog each flake by distance.
import * as THREE from 'three/webgpu';
import { camera, renderer } from '../scene.ts';
import { seaU } from './state.ts';
import { defineKind, spawn, despawn } from '../../entity/entity.ts';
import { uTime } from './shore-nodes.ts';
import { waterLighting, type Ocean, type WaterSky } from './surface.ts';
import { TSL } from './tsl.ts';
import { UNDER } from './tuning.ts';
import { registerGraphics } from '../../graphics-settings.ts';

const {
  Fn,
  cameraPosition,
  cameraViewMatrix,
  clamp,
  fract,
  instancedBufferAttribute,
  length,
  max,
  mod,
  select,
  sin,
  uniform,
  uv,
  varying,
  vec3,
  vec4,
} = TSL;

defineKind('water-snow', {});
export function createSnow(ocean: Ocean, sky: WaterSky) {
  const { waterScatter, waterSun } = waterLighting(sky);
  const seeds = new Float32Array(UNDER.snowCount * 3);
  let s = 3;
  for (let i = 0; i < seeds.length; i++) seeds[i] = (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const seed = instancedBufferAttribute(new THREE.InstancedBufferAttribute(seeds, 3));
  const px = uniform(1000);
  const p = Fn(() => {
    const drift = seed
      .mul(UNDER.snowBox)
      .add(vec3(0.11, -0.03, 0.07).mul(uTime))
      .add(sin(uTime.mul(seed.yzx.add(0.3)).add(seed.zxy.mul(40))).mul(0.3));
    return cameraPosition
      .add(mod(drift.sub(cameraPosition).add(UNDER.snowBox / 2), UNDER.snowBox))
      .sub(UNDER.snowBox / 2);
  })();
  const viewDepth = cameraViewMatrix.mul(vec4(p, 1)).z.negate();
  const size = fract(seed.x.mul(91.7)).mul(0.01).add(0.004);
  const material = new THREE.SpriteNodeMaterial({ transparent: false, depthWrite: true, fog: false });
  material.positionNode = p;
  material.scaleNode = select(
    viewDepth.greaterThanEqual(0.4).and(p.y.lessThanEqual(ocean.heightAt(p.xz))),
    clamp(size.mul(px).div(max(viewDepth, 0.1)), 1, 6)
      .mul(viewDepth)
      .div(px),
    0,
  );
  material.maskNode = length(uv().sub(0.5)).lessThanEqual(0.5);
  material.colorNode = waterScatter()
    .mul(waterSun().mul(max(seaU.uSun.y, 0)).add(1))
    .mul(4)
    .mul(fract(varying(seed.y).mul(37.1)).add(0.4));
  const mesh = new THREE.Sprite(material);
  mesh.count = UNDER.snowCount;
  mesh.frustumCulled = false;
  mesh.visible = false;
  mesh.renderOrder = 1;
  let enabled = true;
  const unregister = registerGraphics({
    id: 'snow',
    label: 'Underwater snow',
    choices: [true, false],
    default: true,
    applyMode: 'live',
    cost: 'sprite draw',
    skips: 'Skips the 6000-sprite draw and per-frame projection update.',
    read: () => enabled,
    apply: (value) => {
      enabled = value === true;
      if (!enabled) mesh.visible = false;
    },
  });
  const entity = spawn({
    kind: 'water-snow',
    mesh,
    dispose() {
      unregister();
      material.dispose();
    },
  });
  const sizePx = new THREE.Vector2();
  return {
    mesh,
    dispose() {
      despawn(entity);
    },
    update(visible: boolean) {
      mesh.visible = visible && enabled;
      if (!mesh.visible) return;
      renderer.getDrawingBufferSize(sizePx);
      px.value = sizePx.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    },
  };
}
