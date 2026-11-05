// Late morning by default; the opt-in evening proof prepares both skies behind loading.
// Owner calls, 3–5 November: fixed authored sunlight, no runtime cycle.
import * as THREE from 'three/webgpu';
import { cameraPosition, fog, mix, normalize, positionWorld, rangeFogFactor, uniform, uv, vec3, vec4 } from 'three/tsl';
import { FOG_NEAR, FOG_FAR } from '../../constants.ts';
import { skyState } from '../../sim/sky-clock.ts';
import { clouds } from '../props.ts';
import { renderer, rendererReady, scene, sky, sun } from '../scene.ts';
import { atmosphere, skyNow } from '../sky.ts';
import { SUN_DIR } from '../sun-dir.ts';
import { seaU } from './state.ts';
import { createWaterSky } from './sky.ts';
import { bind, tuningEnabled } from './live.ts';
import { toySkyEnabled } from './flags.ts';
import { toySky } from './toy.ts';
import { bootMark } from '../../boot/timeline.ts';
import { createEveningTransition, eveningPreview, prepareEvening } from './evening-transition.ts';

export const WATER_TOD = 0.24;
export let frozenSkyActive = false;
const noon = new THREE.Vector3(0.45, 0.78, 0.32).normalize();
const east = new THREE.Vector3().crossVectors(noon, new THREE.Vector3(0, 1, 0)).normalize();
const angle = skyState(WATER_TOD, 0.5).sunAngle;
const direction = east.clone().multiplyScalar(Math.cos(angle)).addScaledVector(noon, Math.sin(angle));
let timeOfDay = WATER_TOD;
const CAVE = { fog: new THREE.Color('#15120f'), sky: new THREE.Color('#8f806e'), ground: new THREE.Color('#3d342a') };

/** Same early sky slot: reset route fog ranges before crossing/place apply theirs, with the cave transition intact. */
export function updateFrozenDay() {
  const ug = atmosphere.underground;
  const f = scene.fog as THREE.Fog;
  f.near = THREE.MathUtils.lerp(FOG_NEAR, 6, ug);
  f.far = THREE.MathUtils.lerp(FOG_FAR, 80, ug);
  skyNow.frac = timeOfDay;
  skyNow.phase = 0.5;
  skyNow.illum = 1;
  skyNow.day = 1;
  skyNow.keyLight = true;
  skyNow.sunDir.copy(direction);
  SUN_DIR.copy(direction);
}

export function createFrozenWaterSky() {
  frozenSkyActive = true;
  timeOfDay = WATER_TOD;
  direction.copy(east).multiplyScalar(Math.cos(angle)).addScaledVector(noon, Math.sin(angle));
  const environment = createWaterSky(toySkyEnabled ? toySky : undefined);
  environment.params.elevation = THREE.MathUtils.radToDeg(Math.asin(direction.y));
  environment.params.azimuth = THREE.MathUtils.radToDeg(Math.atan2(direction.x, direction.z));
  const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as
    THREE.HemisphereLight | undefined;
  const prior = {
    background: scene.backgroundNode,
    environment: scene.environment,
    environmentIntensity: scene.environmentIntensity,
    fogNode: scene.fogNode,
    skyVisible: sky.visible,
    clouds: new Map(clouds.map((c) => [c, c.visible])),
    sunColor: sun.color.clone(),
    intensity: sun.intensity,
    direction: SUN_DIR.clone(),
    position: sun.position.clone(),
    shadowIntensity: sun.shadow.intensity,
    shadowUpdate: sun.shadow.autoUpdate,
    exposure: renderer.toneMappingExposure,
    hemi: hemi && { color: hemi.color.clone(), ground: hemi.groundColor.clone(), intensity: hemi.intensity },
  };
  const near = uniform(FOG_NEAR),
    far = uniform(FOG_FAR),
    underground = uniform(0);
  const upper = new THREE.Color(),
    lower = new THREE.Color();
  const evening = prepareEvening ? createWaterSky() : undefined;
  let transition: ReturnType<typeof createEveningTransition> | undefined;
  const filtered: THREE.RenderTarget[] = [];
  let selectedEnvironment: THREE.Texture = environment.cube;
  const preview = tuningEnabled
    ? {
        keyGain: 1,
        fillGain: 1,
        keyTint: new THREE.Color(1, 1, 1),
        fillTint: new THREE.Color(1, 1, 1),
      }
    : undefined;
  if (preview) {
    for (const key of ['keyGain', 'fillGain'] as const)
      bind(
        `sky.${key}`,
        () => preview[key],
        (value) => {
          preview[key] = value as number;
        },
      );
    for (const key of ['keyTint', 'fillTint'] as const)
      bind(
        `sky.${key}`,
        () => preview[key].toArray(),
        (value) => {
          preview[key].fromArray(value as number[]);
        },
      );
  }
  const haze = mix(
    environment.skyLod(normalize(positionWorld.sub(cameraPosition)), 3),
    vec3(CAVE.fog.r, CAVE.fog.g, CAVE.fog.b),
    underground,
  );
  const fogNode = fog(haze, rangeFogFactor(near, far));
  let disposed = false,
    baked = false;
  function update(dt = 0) {
    if (!baked || disposed) return;
    transition?.update(dt);
    scene.backgroundNode = environment.background;
    scene.environment = selectedEnvironment;
    scene.environmentIntensity = 1 - atmosphere.underground; // the outdoor cube cannot reflect through cave roofs
    scene.fogNode = fogNode;
    sky.visible = false;
    for (const cloud of clouds) {
      if (!prior.clouds.has(cloud)) prior.clouds.set(cloud, cloud.visible);
      cloud.visible = false;
    }
    SUN_DIR.copy(direction);
    // Preserve the existing moving shadow target and tight frustum, but keep its real light aligned to the baked sun.
    sun.position.copy(direction).multiplyScalar(80).add(sun.target.position);
    const c = environment.sunColor.value,
      r = Math.max(c.x, 1e-4);
    sun.color.setRGB(c.x / r, c.y / r, c.z / r);
    sun.intensity = Math.PI * r;
    if (preview) {
      sun.color.multiply(preview.keyTint);
      sun.intensity *= preview.keyGain;
    }
    sun.shadow.intensity = 1;
    sun.shadow.autoUpdate = true;
    const ug = atmosphere.underground;
    if (hemi) {
      hemi.color.copy(upper);
      if (preview) hemi.color.multiply(preview.fillTint);
      hemi.color.lerp(CAVE.sky, ug);
      hemi.groundColor.copy(lower).lerp(CAVE.ground, ug);
      hemi.intensity = Math.PI * THREE.MathUtils.lerp(1, 0.8, ug);
      if (preview) hemi.intensity *= THREE.MathUtils.lerp(preview.fillGain, 1, ug);
    }
    const f = scene.fog as THREE.Fog;
    near.value = f.near;
    far.value = f.far;
    underground.value = ug;
    seaU.uSun.value.copy(direction);
    seaU.uSpecCol.value.setRGB(c.x, c.y, c.z);
    seaU.uLight.value.setRGB(1, 1, 1);
    renderer.toneMappingExposure = 1;
  }
  async function readFill(source: ReturnType<typeof createWaterSky>) {
    // Lambert toy materials need the same cube's coarse irradiance as their hemisphere fill.
    const target = new THREE.RenderTarget(2, 1, { type: THREE.FloatType, depthBuffer: false });
    const material = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
    material.fragmentNode = vec4(source.ambient(vec3(0, uv().x.lessThan(0.5).select(1, -1), 0)), 1);
    const previous = renderer.getRenderTarget(),
      face = renderer.getActiveCubeFace(),
      mip = renderer.getActiveMipmapLevel();
    try {
      renderer.setRenderTarget(target);
      new THREE.QuadMesh(material).render(renderer);
      renderer.setRenderTarget(previous, face, mip);
      const pixels = (await renderer.readRenderTargetPixelsAsync(target, 0, 0, 2, 1)) as Float32Array;
      return { upper: new THREE.Color().fromArray(pixels, 0), lower: new THREE.Color().fromArray(pixels, 4) };
    } finally {
      renderer.setRenderTarget(previous, face, mip);
      target.dispose();
      material.dispose();
    }
  }
  async function bake() {
    if (disposed) return;
    bootMark('sky-start');
    environment.bake();
    if (tuningEnabled) direction.copy(environment.sunDirection.value);
    const fill = await readFill(environment);
    if (disposed) return;
    upper.copy(fill.upper);
    lower.copy(fill.lower);
    baked = true;
    updateFrozenDay();
    update();
    bootMark('sky-ready');
    console.info('WATER FROZEN SKY ' + JSON.stringify({ tod: timeOfDay, ...environment.inspect() }));
  }
  async function prepare() {
    await bake();
    if (!evening || disposed) return;
    // Research water-times-of-day recommendations 1–4: two prepared endpoints, no live sunset.
    // Keep the accepted 1024 day cube; a smaller-cube comparison is a separate proof.
    evening.bake({ elevation: 12, azimuth: 255, turbidity: 3.2, sunIntensity: 9, cloudCoverage: 0.3 });
    const eveningFill = await readFill(evening);
    if (disposed) return;
    const pmrem = new THREE.PMREMGenerator(renderer);
    try {
      filtered.push(pmrem.fromCubemap(environment.cube));
      filtered.push(pmrem.fromCubemap(evening.cube));
    } finally {
      pmrem.dispose();
    }
    const day = {
      direction: direction.clone(),
      radiance: environment.sunColor.value.clone(),
      upper: upper.clone(),
      lower: lower.clone(),
    };
    const select = (isEvening: boolean) => {
      timeOfDay = isEvening ? 0.55 : WATER_TOD;
      direction.copy(isEvening ? evening.sunDirection.value : day.direction);
      environment.selectPrepared(
        isEvening ? evening.cube : environment.cube,
        direction,
        isEvening ? evening.sunColor.value : day.radiance,
      );
      selectedEnvironment = filtered[isEvening ? 1 : 0]!.texture;
      upper.copy(isEvening ? eveningFill.upper : day.upper);
      lower.copy(isEvening ? eveningFill.lower : day.lower);
      updateFrozenDay();
    };
    const initial = eveningPreview === '1';
    select(initial);
    transition = createEveningTransition(initial, select);
    update();
  }
  const ready = rendererReady.then(prepare);
  let pending = ready;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const scheduleBake = () => {
    // Authoring rebakes and prepared endpoints must not mutate one another.
    if (evening) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      pending = pending
        .then(bake)
        .then(() => {
          window.dispatchEvent(new CustomEvent('water-tuning-status', { detail: 'Sun & sky rebaked.' }));
        })
        .catch((error: unknown) => {
          window.dispatchEvent(new CustomEvent('water-tuning-status', { detail: `Sky bake failed: ${String(error)}` }));
        });
    }, 250);
  };
  bind(
    'sky.time',
    () => timeOfDay,
    (value) => {
      if (evening) return;
      timeOfDay = value as number;
      const next = skyState(timeOfDay, 0.5).sunAngle;
      const dir = east.clone().multiplyScalar(Math.cos(next)).addScaledVector(noon, Math.sin(next));
      environment.params.elevation = THREE.MathUtils.radToDeg(Math.asin(dir.y));
      environment.params.azimuth = THREE.MathUtils.radToDeg(Math.atan2(dir.x, dir.z));
      scheduleBake();
    },
  );
  for (const key of ['elevation', 'azimuth', 'sunIntensity', 'cloudCoverage', 'turbidity'] as const)
    bind(
      `sky.${key}`,
      () => environment.params[key],
      (value) => {
        if (evening) return;
        environment.params[key] = value as number;
        scheduleBake();
      },
    );
  return {
    sky: environment,
    ready,
    update,
    inspect: () => ({
      tod: timeOfDay,
      ready: baked,
      disposed,
      ...environment.inspect(),
      evening: evening?.inspect(),
      transition: transition?.inspect(),
    }),
    dispose() {
      if (disposed) return;
      disposed = true;
      transition?.dispose();
      if (timer) clearTimeout(timer);
      frozenSkyActive = false;
      scene.backgroundNode = prior.background;
      scene.environment = prior.environment;
      scene.environmentIntensity = prior.environmentIntensity;
      scene.fogNode = prior.fogNode;
      sky.visible = prior.skyVisible;
      for (const [cloud, visible] of prior.clouds) cloud.visible = visible;
      sun.color.copy(prior.sunColor);
      sun.intensity = prior.intensity;
      sun.position.copy(prior.position);
      sun.shadow.intensity = prior.shadowIntensity;
      sun.shadow.autoUpdate = prior.shadowUpdate;
      SUN_DIR.copy(prior.direction);
      renderer.toneMappingExposure = prior.exposure;
      if (hemi && prior.hemi) {
        hemi.color.copy(prior.hemi.color);
        hemi.groundColor.copy(prior.hemi.ground);
        hemi.intensity = prior.hemi.intensity;
      }
      // A pending readback owns its source textures until it settles; never dispose a GPU resource beneath it.
      void pending
        .finally(() => {
          environment.dispose();
          evening?.dispose();
          for (const target of filtered) target.dispose();
        })
        .catch(() => {});
    },
  };
}
